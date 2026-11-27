import secrets
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.api.deps import current_user, optional_user
from app.core.config import Settings, get_settings
from app.core.security import digest_token
from app.db.session import get_session
from app.integrations.email import ConsoleEmailProvider
from app.integrations.payments import MockPaymentProvider
from app.models import (
    Cart,
    CartItem,
    ContactMessage,
    InventoryAdjustment,
    InventoryReservation,
    Order,
    OrderItem,
    Payment,
    Product,
    ProductVariant,
    User,
    Wishlist,
    WishlistItem,
)
from app.schemas import (
    CartLineIn,
    CartOut,
    CartQuantityIn,
    CheckoutIn,
    ContactIn,
    NewsletterIn,
    OrderOut,
)

router = APIRouter(tags=["commerce"])
COOKIE_NAME = "crewww_cart"
payment_provider = MockPaymentProvider()
email_provider = ConsoleEmailProvider()


def product_filter(product_id: str):
    """Accept either a database UUID or a stable catalog slug.

    The psychedelic room uses canonical slugs from the shared frontend concept
    data, while ProductPage uses the UUID returned by the catalog API.
    """
    try:
        return Product.id == UUID(product_id)
    except ValueError:
        return Product.slug == product_id


async def get_or_create_cart(
    request: Request,
    response: Response,
    session: AsyncSession,
    user: User | None,
    settings: Settings,
) -> Cart:
    if user:
        cart = await session.scalar(
            select(Cart)
            .where(Cart.user_id == user.id)
            .options(
                selectinload(Cart.items)
                .joinedload(CartItem.variant)
                .joinedload(ProductVariant.product)
            )
        )
        if cart is None:
            cart = Cart(user_id=user.id)
            session.add(cart)
            await session.commit()
            await session.refresh(cart)
        return cart
    token = request.cookies.get(COOKIE_NAME)
    cart = None
    if token:
        cart = await session.scalar(
            select(Cart)
            .where(Cart.guest_token_hash == digest_token(token))
            .options(
                selectinload(Cart.items)
                .joinedload(CartItem.variant)
                .joinedload(ProductVariant.product)
            )
        )
    if cart is None:
        token = secrets.token_urlsafe(32)
        cart = Cart(guest_token_hash=digest_token(token))
        session.add(cart)
        await session.commit()
        await session.refresh(cart)
        response.set_cookie(
            COOKIE_NAME,
            token,
            max_age=60 * 60 * 24 * 30,
            httponly=True,
            secure=settings.cookie_secure,
            samesite="lax",
            path="/api/v1",
        )
    return cart


async def get_cart_items(session: AsyncSession, cart_id: UUID) -> list[CartItem]:
    return list(
        (
            await session.scalars(
                select(CartItem)
                .where(CartItem.cart_id == cart_id)
                .options(joinedload(CartItem.variant).joinedload(ProductVariant.product))
            )
        ).all()
    )


def cart_payload(cart: Cart, items: list[CartItem]) -> CartOut:
    currency = items[0].variant.product.currency if items else "USD"
    rows = []
    subtotal = 0
    for item in items:
        variant, product = item.variant, item.variant.product
        price = variant.sale_price_minor or variant.price_minor
        subtotal += price * item.quantity
        rows.append(
            {
                "id": item.id,
                "variant_id": variant.id,
                "sku": variant.sku,
                "product_id": product.id,
                "product_name": product.name,
                "image_url": product.image_url,
                "size": variant.size,
                "color": variant.color,
                "quantity": item.quantity,
                "unit_price_minor": price,
                "currency": product.currency,
            }
        )
    return CartOut(id=cart.id, items=rows, subtotal_minor=subtotal, currency=currency)


@router.get("/cart", response_model=CartOut)
async def read_cart(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    user: User | None = Depends(optional_user),
    settings: Settings = Depends(get_settings),
) -> CartOut:
    cart = await get_or_create_cart(request, response, session, user, settings)
    return cart_payload(cart, await get_cart_items(session, cart.id))


@router.delete("/cart", response_model=CartOut)
async def empty_cart(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    user: User | None = Depends(optional_user),
    settings: Settings = Depends(get_settings),
) -> CartOut:
    cart = await get_or_create_cart(request, response, session, user, settings)
    for item in await get_cart_items(session, cart.id):
        await session.delete(item)
    await session.commit()
    return cart_payload(cart, [])


@router.post("/cart/items", response_model=CartOut)
async def add_cart_item(
    payload: CartLineIn,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    user: User | None = Depends(optional_user),
    settings: Settings = Depends(get_settings),
) -> CartOut:
    cart = await get_or_create_cart(request, response, session, user, settings)
    variant = await session.scalar(
        select(ProductVariant)
        .join(Product)
        .where(
            product_filter(payload.product_id),
            Product.status.in_(["active", "sample"]),
            ProductVariant.size == payload.size,
            ProductVariant.color == payload.color,
        )
        .with_for_update()
    )
    if variant is None:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "variant_unavailable",
                "message": "That size and color are not available.",
            },
        )
    if variant.stock_quantity < payload.quantity:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "insufficient_stock",
                "message": "There is not enough stock for that quantity.",
            },
        )
    item = await session.scalar(
        select(CartItem).where(CartItem.cart_id == cart.id, CartItem.variant_id == variant.id)
    )
    if item:
        if item.quantity + payload.quantity > 20:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "quantity_limit",
                    "message": "A cart line can contain at most 20 pieces.",
                },
            )
        item.quantity += payload.quantity
    else:
        session.add(CartItem(cart_id=cart.id, variant_id=variant.id, quantity=payload.quantity))
    await session.commit()
    return cart_payload(cart, await get_cart_items(session, cart.id))


@router.patch("/cart/items/{item_id}", response_model=CartOut)
async def update_cart_item(
    item_id: UUID,
    payload: CartQuantityIn,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    user: User | None = Depends(optional_user),
    settings: Settings = Depends(get_settings),
) -> CartOut:
    cart = await get_or_create_cart(request, response, session, user, settings)
    item = await session.scalar(
        select(CartItem)
        .where(CartItem.id == item_id, CartItem.cart_id == cart.id)
        .options(joinedload(CartItem.variant))
    )
    if item is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "cart_item_not_found", "message": "Cart item not found."},
        )
    if item.variant.stock_quantity < payload.quantity:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "insufficient_stock",
                "message": "There is not enough stock for that quantity.",
            },
        )
    item.quantity = payload.quantity
    await session.commit()
    return cart_payload(cart, await get_cart_items(session, cart.id))


@router.delete("/cart/items/{item_id}", response_model=CartOut)
async def remove_cart_item(
    item_id: UUID,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    user: User | None = Depends(optional_user),
    settings: Settings = Depends(get_settings),
) -> CartOut:
    cart = await get_or_create_cart(request, response, session, user, settings)
    item = await session.scalar(
        select(CartItem).where(CartItem.id == item_id, CartItem.cart_id == cart.id)
    )
    if item:
        await session.delete(item)
        await session.commit()
    return cart_payload(cart, await get_cart_items(session, cart.id))


@router.get("/wishlist")
async def read_wishlist(
    session: AsyncSession = Depends(get_session), user: User = Depends(current_user)
) -> list[str]:
    wishlist = await session.scalar(
        select(Wishlist).where(Wishlist.user_id == user.id).options(selectinload(Wishlist.items))
    )
    return [str(item.product_id) for item in wishlist.items] if wishlist else []


@router.put("/wishlist/{product_id}", status_code=204)
async def save_wishlist(
    product_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(current_user),
) -> None:
    product = await session.scalar(
        select(Product).where(Product.id == product_id, Product.status.in_(["active", "sample"]))
    )
    if product is None:
        raise HTTPException(
            status_code=404, detail={"code": "product_not_found", "message": "Product not found."}
        )
    wishlist = await session.scalar(
        select(Wishlist).where(Wishlist.user_id == user.id).options(selectinload(Wishlist.items))
    )
    if wishlist is None:
        wishlist = Wishlist(user_id=user.id, items=[])
        session.add(wishlist)
        await session.flush()
    existing = await session.scalar(
        select(WishlistItem.id).where(
            WishlistItem.wishlist_id == wishlist.id, WishlistItem.product_id == product_id
        )
    )
    if existing is None:
        session.add(WishlistItem(wishlist_id=wishlist.id, product_id=product_id))
    await session.commit()


@router.delete("/wishlist/{product_id}", status_code=204)
async def remove_wishlist(
    product_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(current_user),
) -> None:
    wishlist = await session.scalar(select(Wishlist).where(Wishlist.user_id == user.id))
    if wishlist:
        item = await session.scalar(
            select(WishlistItem).where(
                WishlistItem.wishlist_id == wishlist.id, WishlistItem.product_id == product_id
            )
        )
        if item:
            await session.delete(item)
            await session.commit()


def order_payload(order: Order) -> OrderOut:
    payment_status = order.payments[0].status if order.payments else "pending"
    return OrderOut(
        id=order.id,
        created_at=order.created_at,
        status=order.status,
        email=order.email,
        currency=order.currency,
        subtotal_minor=order.subtotal_minor,
        delivery_minor=order.delivery_minor,
        total_minor=order.total_minor,
        items=[
            {
                "product_name": item.product_name,
                "sku": item.sku,
                "size": item.size,
                "color": item.color,
                "unit_price_minor": item.unit_price_minor,
                "quantity": item.quantity,
            }
            for item in order.items
        ],
        payment_status=payment_status,
    )


@router.post("/checkout", response_model=OrderOut, status_code=201)
async def checkout(
    payload: CheckoutIn,
    request: Request,
    idempotency_key: str = Header(alias="Idempotency-Key", min_length=12, max_length=100),
    session: AsyncSession = Depends(get_session),
    user: User | None = Depends(optional_user),
) -> OrderOut:
    owner_id = user.id if user else None
    existing = await session.scalar(
        select(Order)
        .where(Order.idempotency_key == idempotency_key)
        .options(selectinload(Order.items), selectinload(Order.payments))
    )
    if existing:
        request_guest_hash = (
            digest_token(request.cookies[COOKIE_NAME]) if request.cookies.get(COOKIE_NAME) else None
        )
        if existing.user_id != owner_id or (
            owner_id is None and existing.guest_token_hash != request_guest_hash
        ):
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "idempotency_conflict",
                    "message": "This checkout key was already used.",
                },
            )
        return order_payload(existing)
    await session.rollback()
    try:
        async with session.begin():
            variants: list[tuple[ProductVariant, Product, int]] = []
            for line in payload.lines:
                variant = await session.scalar(
                    select(ProductVariant)
                    .join(Product)
                    .where(
                        product_filter(line.product_id),
                        Product.status.in_(["active", "sample"]),
                        ProductVariant.size == line.size,
                        ProductVariant.color == line.color,
                    )
                    .with_for_update()
                )
                if variant is None:
                    raise HTTPException(
                        status_code=409,
                        detail={
                            "code": "variant_unavailable",
                            "message": "A selected product variant is no longer available.",
                        },
                    )
                product = await session.get(Product, variant.product_id)
                if product is None or variant.stock_quantity < line.quantity:
                    raise HTTPException(
                        status_code=409,
                        detail={
                            "code": "insufficient_stock",
                            "message": "A selected product does not have enough stock.",
                        },
                    )
                variants.append((variant, product, line.quantity))
            currencies = {product.currency for _, product, _ in variants}
            if len(currencies) != 1:
                raise HTTPException(
                    status_code=409,
                    detail={
                        "code": "currency_mismatch",
                        "message": "Products in one order must use a single currency.",
                    },
                )
            currency = currencies.pop()
            subtotal = sum(
                (variant.sale_price_minor or variant.price_minor) * quantity
                for variant, _, quantity in variants
            )
            delivery = (
                1600 if payload.delivery_method == "express" else (0 if subtotal >= 10000 else 700)
            )
            guest_token = request.cookies.get(COOKIE_NAME)
            order = Order(
                user_id=owner_id,
                guest_token_hash=digest_token(guest_token)
                if guest_token and user is None
                else None,
                idempotency_key=idempotency_key,
                email=payload.shipping.email.lower(),
                first_name=payload.shipping.first_name,
                last_name=payload.shipping.last_name,
                shipping_address=payload.shipping.model_dump(
                    exclude={"first_name", "last_name", "email"}
                ),
                currency=currency,
                subtotal_minor=subtotal,
                delivery_minor=delivery,
                total_minor=subtotal + delivery,
                status="pending_payment",
                items=[],
                payments=[],
            )
            session.add(order)
            await session.flush()
            for variant, product, quantity in variants:
                variant.stock_quantity -= quantity
                session.add(
                    InventoryAdjustment(
                        variant_id=variant.id,
                        delta=-quantity,
                        reason=f"Order {order.id} stock allocation",
                        actor_user_id=owner_id,
                    )
                )
                session.add(
                    InventoryReservation(
                        variant_id=variant.id,
                        order_id=order.id,
                        quantity=quantity,
                        status="committed",
                        expires_at=datetime.now(UTC),
                    )
                )
                order.items.append(
                    OrderItem(
                        variant_id=variant.id,
                        product_name=product.name,
                        sku=variant.sku,
                        size=variant.size,
                        color=variant.color,
                        unit_price_minor=variant.sale_price_minor or variant.price_minor,
                        quantity=quantity,
                    )
                )
            guest_token = request.cookies.get(COOKIE_NAME)
            if owner_id:
                cart_id = await session.scalar(select(Cart.id).where(Cart.user_id == owner_id))
            elif guest_token:
                cart_id = await session.scalar(
                    select(Cart.id).where(Cart.guest_token_hash == digest_token(guest_token))
                )
            else:
                cart_id = None
            if cart_id:
                for cart_item in (
                    await session.scalars(select(CartItem).where(CartItem.cart_id == cart_id))
                ).all():
                    await session.delete(cart_item)
            payment = await payment_provider.authorize(
                order.total_minor, order.currency, idempotency_key
            )
            order.payments.append(
                Payment(
                    provider="mock",
                    provider_reference=payment.reference,
                    status=payment.status,
                    amount_minor=order.total_minor,
                    currency=order.currency,
                )
            )
            order.status = "processing" if payment.status == "succeeded" else "pending_payment"
            await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        existing = await session.scalar(
            select(Order)
            .where(Order.idempotency_key == idempotency_key)
            .options(selectinload(Order.items), selectinload(Order.payments))
        )
        if existing:
            request_guest_hash = (
                digest_token(request.cookies[COOKIE_NAME])
                if request.cookies.get(COOKIE_NAME)
                else None
            )
            if existing.user_id != owner_id or (
                owner_id is None and existing.guest_token_hash != request_guest_hash
            ):
                raise HTTPException(
                    status_code=409,
                    detail={
                        "code": "idempotency_conflict",
                        "message": "This checkout key was already used.",
                    },
                ) from exc
            return order_payload(existing)
        raise
    await session.refresh(order, attribute_names=["items", "payments"])
    await email_provider.send("order_confirmation", order.email)
    return order_payload(order)


@router.get("/orders", response_model=list[OrderOut])
async def list_orders(
    session: AsyncSession = Depends(get_session), user: User = Depends(current_user)
) -> list[OrderOut]:
    rows = (
        await session.scalars(
            select(Order)
            .where(Order.user_id == user.id)
            .options(selectinload(Order.items), selectinload(Order.payments))
            .order_by(Order.created_at.desc())
        )
    ).all()
    return [order_payload(order) for order in rows]


@router.get("/orders/{order_id}", response_model=OrderOut)
async def get_order(
    order_id: UUID,
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: User | None = Depends(optional_user),
) -> OrderOut:
    order = await session.scalar(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.items), selectinload(Order.payments))
    )
    guest_token = request.cookies.get(COOKIE_NAME)
    authorized = order is not None and (
        (user is not None and order.user_id == user.id)
        or (
            user is None
            and guest_token is not None
            and order.guest_token_hash == digest_token(guest_token)
        )
    )
    if not authorized:
        raise HTTPException(
            status_code=404, detail={"code": "order_not_found", "message": "Order not found."}
        )
    return order_payload(order)


@router.post("/newsletter", status_code=202)
async def newsletter(
    payload: NewsletterIn, session: AsyncSession = Depends(get_session)
) -> dict[str, bool]:
    from app.models import NewsletterSubscription

    existing = await session.scalar(
        select(NewsletterSubscription).where(NewsletterSubscription.email == payload.email.lower())
    )
    if existing is None:
        session.add(NewsletterSubscription(email=payload.email.lower()))
        await session.commit()
    await email_provider.send("newsletter_subscription", payload.email)
    return {"accepted": True}


@router.post("/contact", status_code=202)
async def contact(
    payload: ContactIn, session: AsyncSession = Depends(get_session)
) -> dict[str, bool]:
    session.add(
        ContactMessage(
            name=payload.name,
            email=payload.email.lower(),
            topic=payload.topic,
            message=payload.message,
        )
    )
    await session.commit()
    await email_provider.send("contact_message", payload.email)
    return {"accepted": True}
