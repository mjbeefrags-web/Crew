from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import admin_user
from app.core.config import Settings, get_settings
from app.db.session import get_session
from app.models import User

router = APIRouter(tags=["system"])
admin = APIRouter(prefix="/api/admin", tags=["administration"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy", "service": "crewww-api"}


@router.get("/ready")
async def ready(
    request: Request,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    try:
        await session.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail={"code": "database_unavailable", "message": "Database readiness check failed."},
        ) from exc
    redis = getattr(request.app.state, "redis", None)
    if settings.redis_required and redis is None:
        raise HTTPException(
            status_code=503,
            detail={"code": "redis_unavailable", "message": "Redis readiness check failed."},
        )
    if redis is not None:
        try:
            await redis.ping()
        except Exception as exc:
            if settings.redis_required:
                raise HTTPException(
                    status_code=503,
                    detail={
                        "code": "redis_unavailable",
                        "message": "Redis readiness check failed.",
                    },
                ) from exc
    return {"status": "ready"}


@admin.get("/system/status")
async def system_status(
    request: Request,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    _: User = Depends(admin_user),
) -> dict[str, object]:
    checked_at = datetime.now(UTC).isoformat()
    states: dict[str, dict[str, str]] = {}
    warnings: list[dict[str, str]] = []
    try:
        await session.execute(text("SELECT 1"))
        states["database"] = {"status": "healthy"}
    except Exception:
        states["database"] = {"status": "unavailable"}
        warnings.append(
            {"code": "DATABASE_UNAVAILABLE", "message": "Database connection check failed."}
        )
    redis = getattr(request.app.state, "redis", None)
    if not settings.redis_url:
        states["redis"] = {"status": "not_configured"}
        warnings.append(
            {
                "code": "REDIS_NOT_CONFIGURED",
                "message": "Redis is not configured for this environment.",
            }
        )
    elif redis is None:
        states["redis"] = {"status": "unavailable"}
        warnings.append({"code": "REDIS_UNAVAILABLE", "message": "Redis client is unavailable."})
    else:
        try:
            await redis.ping()
            states["redis"] = {"status": "healthy"}
        except Exception:
            states["redis"] = {"status": "unavailable"}
            warnings.append(
                {"code": "REDIS_UNAVAILABLE", "message": "Redis connection check failed."}
            )
    states["storage"] = {"status": "not_configured", "mode": "bundled_static_assets"}
    states["worker"] = {"status": "not_configured"}
    states["payment"] = {"status": "degraded", "mode": settings.payment_mode}
    states["email"] = {"status": "degraded", "mode": settings.email_mode}
    if settings.payment_mode == "mock":
        warnings.append(
            {
                "code": "PAYMENT_MOCK_MODE",
                "message": "Payment processing is simulated; no real payment provider is "
                "connected.",
            }
        )
    if settings.email_mode == "console":
        warnings.append(
            {
                "code": "EMAIL_CONSOLE_MODE",
                "message": "Email events use the local safe sink; messages are not delivered.",
            }
        )
    return {
        "environment": settings.app_env,
        "frontend_backend_connectivity": {"frontend": "connected", "backend": "healthy"},
        "services": states,
        "warnings": warnings,
        "checked_at": checked_at,
    }
