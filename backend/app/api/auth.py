from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import current_user, get_redis
from app.core.config import Settings, get_settings
from app.core.security import (
    create_access_token,
    digest_token,
    hash_password,
    new_refresh_token,
    verify_password,
)
from app.db.session import get_session
from app.models import Cart, RefreshSession, User
from app.schemas import AuthOut, AuthSessionOut, LoginIn, RegisterIn, UserOut

router = APIRouter(prefix="/auth", tags=["authentication"])
COOKIE_NAME = "crewww_refresh"
CART_COOKIE_NAME = "crewww_cart"


async def attach_guest_cart(request: Request, user: User, session: AsyncSession) -> None:
    token = request.cookies.get(CART_COOKIE_NAME)
    if not token:
        return
    guest_cart = await session.scalar(
        select(Cart)
        .where(Cart.guest_token_hash == digest_token(token))
        .options(selectinload(Cart.items))
    )
    if guest_cart is None:
        return
    user_cart = await session.scalar(
        select(Cart).where(Cart.user_id == user.id).options(selectinload(Cart.items))
    )
    if user_cart is None:
        guest_cart.user_id = user.id
        guest_cart.guest_token_hash = None
        return
    for guest_item in guest_cart.items:
        user_item = next(
            (item for item in user_cart.items if item.variant_id == guest_item.variant_id), None
        )
        if user_item:
            user_item.quantity = min(20, user_item.quantity + guest_item.quantity)
        else:
            guest_item.cart = user_cart
    await session.delete(guest_cart)


def set_refresh_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=settings.refresh_token_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        path=f"{settings.api_v1_prefix}/auth",
    )


async def throttle(request: Request, redis: Redis | None, settings: Settings, email: str) -> None:
    if redis is None:
        if settings.redis_required:
            raise HTTPException(
                status_code=503,
                detail={
                    "code": "rate_limit_unavailable",
                    "message": "Authentication is temporarily unavailable.",
                },
            )
        return
    key = f"auth:attempt:{request.client.host if request.client else 'unknown'}:{email}"
    try:
        attempts = await redis.incr(key)
        if attempts == 1:
            await redis.expire(key, 300)
    except Exception as exc:
        if settings.redis_required:
            raise HTTPException(
                status_code=503,
                detail={
                    "code": "rate_limit_unavailable",
                    "message": "Authentication is temporarily unavailable.",
                },
            ) from exc
        return
    if attempts > 10:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "too_many_attempts",
                "message": "Too many sign-in attempts. Try again later.",
            },
        )


@router.post("/register", response_model=AuthOut, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterIn,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AuthOut:
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
    )
    session.add(user)
    try:
        await session.flush()
        refresh = new_refresh_token()
        session.add(
            RefreshSession(
                user_id=user.id,
                token_hash=digest_token(refresh),
                expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_days),
            )
        )
        await attach_guest_cart(request, user, session)
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "code": "email_in_use",
                "message": "An account with this email already exists.",
            },
        ) from exc
    set_refresh_cookie(response, refresh, settings)
    return AuthOut(
        access_token=create_access_token(user.id, user.role, settings),
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=AuthOut)
async def login(
    payload: LoginIn,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    redis: Redis | None = Depends(get_redis),
) -> AuthOut:
    await throttle(request, redis, settings, payload.email)
    user = await session.scalar(select(User).where(User.email == payload.email))
    if (
        user is None
        or not user.is_active
        or not verify_password(payload.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=401,
            detail={"code": "invalid_credentials", "message": "Email or password is incorrect."},
            headers={"WWW-Authenticate": "Bearer"},
        )
    refresh = new_refresh_token()
    session.add(
        RefreshSession(
            user_id=user.id,
            token_hash=digest_token(refresh),
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_days),
        )
    )
    await attach_guest_cart(request, user, session)
    await session.commit()
    set_refresh_cookie(response, refresh, settings)
    return AuthOut(
        access_token=create_access_token(user.id, user.role, settings),
        user=UserOut.model_validate(user),
    )


def verify_origin(request: Request, settings: Settings) -> None:
    origin = request.headers.get("origin")
    if origin and origin not in settings.allowed_origins:
        raise HTTPException(
            status_code=403,
            detail={"code": "origin_denied", "message": "Request origin is not allowed."},
        )


@router.post("/refresh", response_model=AuthOut)
async def refresh_access(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AuthOut:
    verify_origin(request, settings)
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=401,
            detail={"code": "refresh_required", "message": "Sign in again to continue."},
        )
    stored = await session.scalar(
        select(RefreshSession).where(
            RefreshSession.token_hash == digest_token(token), RefreshSession.revoked_at.is_(None)
        )
    )
    if stored is None or stored.expires_at.replace(tzinfo=UTC) <= datetime.now(UTC):
        raise HTTPException(
            status_code=401,
            detail={"code": "refresh_invalid", "message": "Sign in again to continue."},
        )
    user = await session.get(User, stored.user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail={"code": "refresh_invalid", "message": "Sign in again to continue."},
        )
    stored.revoked_at = datetime.now(UTC)
    replacement = new_refresh_token()
    session.add(
        RefreshSession(
            user_id=user.id,
            token_hash=digest_token(replacement),
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_days),
        )
    )
    await session.commit()
    set_refresh_cookie(response, replacement, settings)
    return AuthOut(
        access_token=create_access_token(user.id, user.role, settings),
        user=UserOut.model_validate(user),
    )


@router.post("/session", response_model=AuthSessionOut)
async def inspect_session(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AuthSessionOut:
    verify_origin(request, settings)
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return AuthSessionOut(authenticated=False)
    stored = await session.scalar(
        select(RefreshSession).where(
            RefreshSession.token_hash == digest_token(token),
            RefreshSession.revoked_at.is_(None),
        )
    )
    if stored is None or stored.expires_at.replace(tzinfo=UTC) <= datetime.now(UTC):
        response.delete_cookie(
            COOKIE_NAME,
            path=f"{settings.api_v1_prefix}/auth",
            secure=settings.cookie_secure,
            httponly=True,
            samesite="strict",
        )
        return AuthSessionOut(authenticated=False)
    user = await session.get(User, stored.user_id)
    if user is None or not user.is_active:
        response.delete_cookie(
            COOKIE_NAME,
            path=f"{settings.api_v1_prefix}/auth",
            secure=settings.cookie_secure,
            httponly=True,
            samesite="strict",
        )
        return AuthSessionOut(authenticated=False)
    stored.revoked_at = datetime.now(UTC)
    replacement = new_refresh_token()
    session.add(
        RefreshSession(
            user_id=user.id,
            token_hash=digest_token(replacement),
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_days),
        )
    )
    await session.commit()
    set_refresh_cookie(response, replacement, settings)
    return AuthSessionOut(
        authenticated=True,
        access_token=create_access_token(user.id, user.role, settings),
        user=UserOut.model_validate(user),
    )


@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Response:
    verify_origin(request, settings)
    token = request.cookies.get(COOKIE_NAME)
    if token:
        stored = await session.scalar(
            select(RefreshSession).where(
                RefreshSession.token_hash == digest_token(token),
                RefreshSession.revoked_at.is_(None),
            )
        )
        if stored:
            stored.revoked_at = datetime.now(UTC)
            await session.commit()
    response.delete_cookie(
        COOKIE_NAME,
        path=f"{settings.api_v1_prefix}/auth",
        secure=settings.cookie_secure,
        httponly=True,
        samesite="strict",
    )
    return response


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(current_user)) -> UserOut:
    return UserOut.model_validate(user)
