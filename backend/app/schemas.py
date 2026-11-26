from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: EmailStr
    first_name: str
    last_name: str
    role: str
    is_active: bool


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class AuthOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class AuthSessionOut(BaseModel):
    authenticated: bool
    access_token: str | None = None
    user: UserOut | None = None


class ColorOut(BaseModel):
    name: str
    value: str


class SpecificationsOut(BaseModel):
    material: str = ""
    fit: str = ""
    care: str = ""
    details: str = ""


class ProductVariantOut(BaseModel):
    id: str
    sku: str
    size: str
    color: str
    colorValue: str
    price: float
    salePrice: float | None = None
    stockQuantity: int


class ProductOut(BaseModel):
    id: str
    slug: str
    name: str
    category: str
    price: float
    currency: str
    audience: str
    color: str
    sizes: list[str]
    imageUrl: str
    isNew: bool
    collection: str
    description: str
    available: bool
    bestSeller: bool
    colors: list[ColorOut]
    specifications: SpecificationsOut
    salePrice: float | None = None
    fit: str | None = None
    wash: str | None = None
    ageBand: str | None = None
    galleryUrls: list[str] = Field(default_factory=list)
    isPreviewData: bool = True
    variants: list[ProductVariantOut] = Field(default_factory=list)


class ProductPageOut(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    pageSize: int


class ProductCreateIn(BaseModel):
    slug: str = Field(min_length=2, max_length=180, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name: str = Field(min_length=2, max_length=200)
    category: str = Field(min_length=2, max_length=40)
    audience: str = "unisex"
    description: str = ""
    collection: str = Field(min_length=2, max_length=160)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    image_url: str = ""
    sizes: list[str] = Field(min_length=1, max_length=30)
    colors: list[ColorOut] = Field(min_length=1, max_length=20)
    price_minor: int = Field(ge=0)
    stock_quantity: int = Field(default=0, ge=0)
    featured: bool = False
    is_new: bool = False
    best_seller: bool = False
    status: Literal["draft", "active", "sample", "archived"] = "draft"


class ProductUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    status: Literal["draft", "active", "sample", "archived"] | None = None
    featured: bool | None = None
    is_new: bool | None = None
    best_seller: bool | None = None


class AdminVariantOut(BaseModel):
    id: UUID
    sku: str
    size: str
    color: str
    price_minor: int
    stock_quantity: int


class AdminProductOut(ProductOut):
    variants: list[AdminVariantOut]


class CategoryCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=140, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class CollectionCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    slug: str = Field(min_length=2, max_length=180, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    description: str = Field(default="", max_length=1000)


class InventoryAdjustIn(BaseModel):
    delta: int = Field(ge=-100000, le=100000)
    reason: str = Field(min_length=3, max_length=200)

    @field_validator("delta")
    @classmethod
    def nonzero_delta(cls, value: int) -> int:
        if value == 0:
            raise ValueError("Inventory adjustment must be nonzero")
        return value


class CartLineIn(BaseModel):
    product_id: UUID
    size: str = Field(min_length=1, max_length=32)
    color: str = Field(min_length=1, max_length=64)
    quantity: int = Field(ge=1, le=20)


class CartQuantityIn(BaseModel):
    quantity: int = Field(ge=1, le=20)


class CartItemOut(BaseModel):
    id: UUID
    variant_id: UUID
    sku: str
    product_id: UUID
    product_name: str
    image_url: str
    size: str
    color: str
    quantity: int
    unit_price_minor: int
    currency: str


class CartOut(BaseModel):
    id: UUID
    items: list[CartItemOut]
    subtotal_minor: int
    currency: str


class ShippingIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    address_line1: str = Field(min_length=3, max_length=200)
    address_line2: str = Field(default="", max_length=200)
    city: str = Field(min_length=2, max_length=100)
    region: str = Field(default="", max_length=100)
    postal_code: str = Field(default="", max_length=30)
    country_code: str = Field(min_length=2, max_length=2)


class CheckoutIn(BaseModel):
    lines: list[CartLineIn] = Field(min_length=1, max_length=30)
    shipping: ShippingIn
    delivery_method: Literal["standard", "express"] = "standard"
    payment_method: Literal["mock-card", "pay-on-delivery"] = "mock-card"

    @model_validator(mode="after")
    def unique_variants(self) -> "CheckoutIn":
        keys = [(line.product_id, line.size, line.color.casefold()) for line in self.lines]
        if len(keys) != len(set(keys)):
            raise ValueError("A product variant can appear only once in checkout lines")
        return self


class OrderItemOut(BaseModel):
    product_name: str
    sku: str
    size: str
    color: str
    unit_price_minor: int
    quantity: int


class OrderOut(BaseModel):
    id: UUID
    created_at: datetime
    status: str
    email: EmailStr
    currency: str
    subtotal_minor: int
    delivery_minor: int
    total_minor: int
    items: list[OrderItemOut]
    payment_status: str


class AdminOrderStatusIn(BaseModel):
    status: str = Field(pattern=r"^(processing|shipped|delivered|cancelled)$")


class NewsletterIn(BaseModel):
    email: EmailStr


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    topic: str = Field(min_length=2, max_length=80)
    message: str = Field(min_length=10, max_length=4000)


class AiAdviseIn(BaseModel):
    question: str = Field(default="", max_length=400)
    signals: dict[str, Any] = Field(default_factory=dict)


class AiRecommendation(BaseModel):
    title: str
    detail: str
    priority: Literal["high", "medium", "low"]
    horizon: str
    evidence: str


class AiSource(BaseModel):
    title: str
    excerpt: str


class AiAdviceOut(BaseModel):
    provider: str
    summary: str
    recommendations: list[AiRecommendation]
    sources: list[AiSource]
