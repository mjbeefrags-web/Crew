import asyncio
import base64
import os
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.ai.advisor import advise, tool_manifest
from app.analytics.metrics import compute_metrics
from app.api.catalog import product_payload
from app.api.commerce import order_payload
from app.api.deps import admin_user
from app.core.config import Settings, get_settings
from app.db.session import get_session
from app.models import (
    InventoryAdjustment,
    InventoryReservation,
    Order,
    Product,
    ProductVariant,
    User,
)
from app.schemas import (
    AdminOrderStatusIn,
    AdminProductOut,
    AiAdviceOut,
    AiAdviseIn,
    ImageUploadIn,
    OrderOut,
    UserOut,
)

router = APIRouter(
    prefix="/api/v1/admin", tags=["administration"], dependencies=[Depends(admin_user)]
)


@router.get("/metrics")
async def admin_metrics(
    session: AsyncSession = Depends(get_session),
    days: int = Query(default=30, ge=7, le=365),
    cogs_ratio: float = Query(default=0.45, ge=0, le=1),
) -> dict[str, object]:
    """Server-computed commercial metrics with formulas and assumptions."""
    return await compute_metrics(session, days=days, cogs_ratio=cogs_ratio)


@router.post("/uploads")
async def upload_image(payload: ImageUploadIn) -> dict[str, str]:
    """Store an admin-supplied product image and return its public URL."""
    allowed = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }
    suffix = Path(payload.filename).suffix.lower()
    if suffix not in allowed:
        raise HTTPException(
            status_code=415,
            detail={"code": "unsupported_image", "message": "Use JPG, PNG or WebP images."},
        )
    try:
        content = base64.b64decode(payload.data, validate=True)
    except Exception as exc:
        raise HTTPException(
            status_code=422, detail={"code": "invalid_image", "message": "Invalid base64 image."}
        ) from exc
    if not content or len(content) > 5_000_000:
        raise HTTPException(
            status_code=413,
            detail={"code": "image_too_large", "message": "Images must be under 5 MB."},
        )
    directory = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))
    directory.mkdir(parents=True, exist_ok=True)
    name = f"{uuid4().hex}{suffix}"
    (directory / name).write_bytes(content)
    return {"url": f"/api/uploads/{name}", "filename": name}


@router.get("/ai/tools")
async def ai_tools() -> dict[str, object]:
    return {"tools": tool_manifest()}


@router.post("/ai/advise", response_model=AiAdviceOut)
async def ai_advise(
    payload: AiAdviseIn,
    settings: Settings = Depends(get_settings),
) -> AiAdviceOut:
    result = await asyncio.to_thread(
        advise, settings, {"question": payload.question, "signals": payload.signals}
    )
    return AiAdviceOut.model_validate(result)


@router.get("/products", response_model=list[AdminProductOut])
async def admin_products(
    session: AsyncSession = Depends(get_session),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=200, ge=1, le=500),
) -> list[AdminProductOut]:
    rows = (
        await session.scalars(
            select(Product)
            .options(
                selectinload(Product.variants),
                selectinload(Product.collection),
                selectinload(Product.category_ref),
                selectinload(Product.images),
            )
            .order_by(Product.name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    def as_admin_product(product: Product) -> AdminProductOut:
        payload = product_payload(product).model_dump()
        # product_payload already serialises variants; AdminProductOut expects
        # the simplified admin variant shape instead.
        payload.pop("variants", None)
        return AdminProductOut(
            **payload,
            variants=[
                {
                    "id": variant.id,
                    "sku": variant.sku,
                    "size": variant.size,
                    "color": variant.color,
                    "price_minor": variant.price_minor,
                    "stock_quantity": variant.stock_quantity,
                }
                for variant in product.variants
            ],
        )

    return [as_admin_product(product) for product in rows]


@router.get("/customers", response_model=list[UserOut])
async def admin_customers(
    session: AsyncSession = Depends(get_session),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=200, ge=1, le=500),
) -> list[UserOut]:
    users = (
        await session.scalars(
            select(User)
            .order_by(User.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return [UserOut.model_validate(user) for user in users]


@router.patch("/customers/{user_id}/status", response_model=UserOut)
async def update_customer(
    user_id: UUID,
    active: bool,
    session: AsyncSession = Depends(get_session),
    actor: User = Depends(admin_user),
) -> UserOut:
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=404, detail={"code": "customer_not_found", "message": "Customer not found."}
        )
    if user.id == actor.id and not active:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "cannot_disable_self",
                "message": "Administrators cannot disable their own account.",
            },
        )
    user.is_active = active
    await session.commit()
    return UserOut.model_validate(user)


@router.get("/orders", response_model=list[OrderOut])
async def admin_orders(
    session: AsyncSession = Depends(get_session),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=200, ge=1, le=500),
) -> list[OrderOut]:
    orders = (
        await session.scalars(
            select(Order)
            .options(selectinload(Order.items), selectinload(Order.payments))
            .order_by(Order.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return [order_payload(order) for order in orders]


@router.patch("/orders/{order_id}/status", response_model=OrderOut)
async def update_order_status(
    order_id: UUID,
    payload: AdminOrderStatusIn,
    session: AsyncSession = Depends(get_session),
    actor: User = Depends(admin_user),
) -> OrderOut:
    order = await session.scalar(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items), selectinload(Order.payments))
    )
    if order is None:
        raise HTTPException(
            status_code=404, detail={"code": "order_not_found", "message": "Order not found."}
        )
    allowed = {
        "pending_payment": {"cancelled"},
        "processing": {"shipped", "cancelled"},
        "shipped": {"delivered"},
    }
    if payload.status not in allowed.get(order.status, set()):
        raise HTTPException(
            status_code=409,
            detail={
                "code": "invalid_order_transition",
                "message": "This order status transition is not allowed.",
            },
        )
    if payload.status == "cancelled":
        for item in order.items:
            variant = await session.scalar(
                select(ProductVariant).where(ProductVariant.id == item.variant_id).with_for_update()
            )
            if variant is not None:
                variant.stock_quantity += item.quantity
                session.add(
                    InventoryAdjustment(
                        variant_id=variant.id,
                        delta=item.quantity,
                        reason=f"Cancelled order {order.id} stock release",
                        actor_user_id=actor.id,
                    )
                )
        reservations = (
            await session.scalars(
                select(InventoryReservation).where(
                    InventoryReservation.order_id == order.id,
                    InventoryReservation.status == "committed",
                )
            )
        ).all()
        for reservation in reservations:
            reservation.status = "released"
        for payment in order.payments:
            payment.status = "refunded_mock"
    order.status = payload.status
    await session.commit()
    return order_payload(order)
