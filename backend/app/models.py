from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def new_id() -> UUID:
    return uuid4()


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        server_default=func.now(),
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    first_name: Mapped[str] = mapped_column(String(100), default="")
    last_name: Mapped[str] = mapped_column(String(100), default="")
    role: Mapped[str] = mapped_column(String(20), default="customer", index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    refresh_sessions: Mapped[list["RefreshSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class RefreshSession(Base):
    __tablename__ = "refresh_sessions"
    __table_args__ = (Index("ix_refresh_sessions_user_expiry", "user_id", "expires_at"),)

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user: Mapped[User] = relationship(back_populates="refresh_sessions")


class Category(TimestampMixin, Base):
    __tablename__ = "categories"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(140), unique=True)
    parent_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Collection(TimestampMixin, Base):
    __tablename__ = "collections"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(160), unique=True)
    slug: Mapped[str] = mapped_column(String(180), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Product(TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (
        Index("ix_products_status_category", "status", "category_id"),
        Index("ix_products_featured_new", "featured", "is_new"),
        Index("ix_products_status_created", "status", "created_at"),
        Index("ix_products_best_seller", "best_seller"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), index=True)
    category_id: Mapped[UUID] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"), index=True
    )
    audience: Mapped[str] = mapped_column(String(20), default="unisex")
    description: Mapped[str] = mapped_column(Text, default="")
    collection_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("collections.id", ondelete="SET NULL"), nullable=True, index=True
    )
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    image_url: Mapped[str] = mapped_column(String(500), default="")
    gallery_urls: Mapped[list[str]] = mapped_column(JSON, default=list)
    specifications: Mapped[dict[str, str]] = mapped_column(JSON, default=dict)
    colors: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_new: Mapped[bool] = mapped_column(Boolean, default=False)
    best_seller: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    fit: Mapped[str | None] = mapped_column(String(80), nullable=True)
    wash: Mapped[str | None] = mapped_column(String(80), nullable=True)
    age_band: Mapped[str | None] = mapped_column(String(80), nullable=True)
    collection: Mapped[Collection | None] = relationship()
    category_ref: Mapped[Category] = relationship(lazy="selectin")
    variants: Mapped[list["ProductVariant"]] = relationship(
        back_populates="product", cascade="all, delete-orphan", lazy="selectin"
    )
    images: Mapped[list["ProductImage"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ProductImage.sort_order",
    )


class ProductImage(Base):
    __tablename__ = "product_images"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    url: Mapped[str] = mapped_column(String(500))
    alt_text: Mapped[str] = mapped_column(String(240), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)
    product: Mapped[Product] = relationship(back_populates="images")


class ProductVariant(TimestampMixin, Base):
    __tablename__ = "product_variants"
    __table_args__ = (
        UniqueConstraint("product_id", "size", "color", name="uq_variant_product_size_color"),
        CheckConstraint("price_minor >= 0", name="ck_variant_price_nonnegative"),
        CheckConstraint("stock_quantity >= 0", name="ck_variant_stock_nonnegative"),
        Index("ix_variants_product_size", "product_id", "size"),
        Index("ix_variants_product_color", "product_id", "color"),
        Index("ix_variants_product_price", "product_id", "price_minor"),
    )

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    sku: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    size: Mapped[str] = mapped_column(String(32))
    color: Mapped[str] = mapped_column(String(64))
    color_value: Mapped[str] = mapped_column(String(20), default="#222222")
    price_minor: Mapped[int] = mapped_column(Integer)
    sale_price_minor: Mapped[int | None] = mapped_column(Integer, nullable=True)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)
    product: Mapped[Product] = relationship(back_populates="variants")


class InventoryAdjustment(Base):
    __tablename__ = "inventory_adjustments"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    variant_id: Mapped[UUID] = mapped_column(
        ForeignKey("product_variants.id", ondelete="CASCADE"), index=True
    )
    delta: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String(200))
    actor_user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InventoryReservation(Base):
    __tablename__ = "inventory_reservations"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_reservation_quantity_positive"),
        Index("ix_reservation_variant_status_expiry", "variant_id", "status", "expires_at"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    variant_id: Mapped[UUID] = mapped_column(
        ForeignKey("product_variants.id", ondelete="RESTRICT"), index=True
    )
    order_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True
    )
    quantity: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="held")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Cart(TimestampMixin, Base):
    __tablename__ = "carts"
    __table_args__ = (UniqueConstraint("user_id", name="uq_cart_user"),)
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    guest_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, unique=True)
    items: Mapped[list["CartItem"]] = relationship(
        back_populates="cart", cascade="all, delete-orphan", lazy="selectin"
    )


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (
        UniqueConstraint("cart_id", "variant_id", name="uq_cart_variant"),
        CheckConstraint("quantity > 0", name="ck_cart_quantity_positive"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    cart_id: Mapped[UUID] = mapped_column(ForeignKey("carts.id", ondelete="CASCADE"), index=True)
    variant_id: Mapped[UUID] = mapped_column(
        ForeignKey("product_variants.id", ondelete="RESTRICT"), index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    cart: Mapped[Cart] = relationship(back_populates="items")
    variant: Mapped[ProductVariant] = relationship(lazy="joined")


class Wishlist(Base):
    __tablename__ = "wishlists"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    items: Mapped[list["WishlistItem"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin"
    )


class WishlistItem(Base):
    __tablename__ = "wishlist_items"
    __table_args__ = (UniqueConstraint("wishlist_id", "product_id", name="uq_wishlist_product"),)
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    wishlist_id: Mapped[UUID] = mapped_column(
        ForeignKey("wishlists.id", ondelete="CASCADE"), index=True
    )
    product_id: Mapped[UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )


class Order(TimestampMixin, Base):
    __tablename__ = "orders"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_order_idempotency"),
        CheckConstraint("total_minor >= 0", name="ck_order_total_nonnegative"),
        Index("ix_orders_user_created", "user_id", "created_at"),
        Index("ix_orders_status_created", "status", "created_at"),
    )
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    guest_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    idempotency_key: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(320))
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    shipping_address: Mapped[dict[str, str]] = mapped_column(JSON)
    currency: Mapped[str] = mapped_column(String(3))
    subtotal_minor: Mapped[int] = mapped_column(Integer)
    delivery_minor: Mapped[int] = mapped_column(Integer)
    total_minor: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(32), default="pending_payment", index=True)
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )


class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    order_id: Mapped[UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    variant_id: Mapped[UUID] = mapped_column(ForeignKey("product_variants.id", ondelete="RESTRICT"))
    product_name: Mapped[str] = mapped_column(String(200))
    sku: Mapped[str] = mapped_column(String(100))
    size: Mapped[str] = mapped_column(String(32))
    color: Mapped[str] = mapped_column(String(64))
    unit_price_minor: Mapped[int] = mapped_column(Integer)
    quantity: Mapped[int] = mapped_column(Integer)
    order: Mapped[Order] = relationship(back_populates="items")


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (Index("ix_payments_order_status", "order_id", "status"),)
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    order_id: Mapped[UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(32), default="mock")
    provider_reference: Mapped[str] = mapped_column(String(120), unique=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    amount_minor: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3))
    order: Mapped[Order] = relationship(back_populates="payments")


class NewsletterSubscription(Base):
    __tablename__ = "newsletter_subscriptions"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ContactMessage(Base):
    __tablename__ = "contact_messages"
    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(320))
    topic: Mapped[str] = mapped_column(String(80))
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
