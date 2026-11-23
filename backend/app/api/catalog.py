from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import admin_user
from app.db.session import get_session
from app.models import Category, Collection, InventoryAdjustment, Product, ProductVariant, User
from app.schemas import (
    CategoryCreateIn,
    CollectionCreateIn,
    InventoryAdjustIn,
    ProductCreateIn,
    ProductOut,
    ProductPageOut,
    ProductUpdateIn,
)

router = APIRouter(tags=["catalog"])
admin = APIRouter(prefix="/admin", tags=["administration"])


def product_payload(product: Product) -> ProductOut:
    variants = product.variants
    prices = [variant.sale_price_minor or variant.price_minor for variant in variants]
    colors = product.colors or [
        {"name": item.color, "value": item.color_value} for item in variants
    ]
    image_urls = (
        [image.url for image in product.images] or product.gallery_urls or [product.image_url]
    )
    return ProductOut(
        id=str(product.id),
        slug=product.slug,
        name=product.name,
        category=product.category_ref.slug,
        price=(min(prices) / 100 if prices else 0),
        currency=product.currency,
        audience=product.audience,
        color=colors[0]["name"] if colors else "",
        sizes=sorted({variant.size for variant in variants}),
        imageUrl=product.image_url,
        isNew=product.is_new,
        collection=product.collection.name if product.collection else "CREWWW / CURRENT EDIT",
        description=product.description,
        available=any(variant.stock_quantity > 0 for variant in variants),
        bestSeller=product.best_seller,
        colors=colors,
        specifications=product.specifications or {},
        salePrice=(
            min(
                (
                    variant.sale_price_minor
                    for variant in variants
                    if variant.sale_price_minor is not None
                ),
                default=0,
            )
            / 100
            or None
        ),
        fit=product.fit,
        wash=product.wash,
        ageBand=product.age_band,
        galleryUrls=image_urls,
        isPreviewData=product.status == "sample",
    )


def product_statement():
    return select(Product).options(
        selectinload(Product.variants),
        selectinload(Product.collection),
        selectinload(Product.category_ref),
        selectinload(Product.images),
    )


@router.get("/products", response_model=ProductPageOut)
async def list_products(
    session: AsyncSession = Depends(get_session),
    category: str | None = None,
    collection: str | None = None,
    size: str | None = None,
    color: str | None = None,
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    available: bool | None = None,
    new_only: bool | None = None,
    featured: bool | None = None,
    best_seller: bool | None = None,
    term: str | None = Query(default=None, max_length=120),
    sort: str = Query(
        default="featured", pattern="^(featured|newest|popular|price-asc|price-desc|name)$"
    ),
    page: int = Query(default=1, ge=1, le=10000),
    page_size: int = Query(default=24, ge=1, le=48),
) -> ProductPageOut:
    filters = [Product.status.in_(["active", "sample"])]
    if category:
        filters.append(Product.category_ref.has(Category.slug == category))
    if collection:
        filters.append(
            Product.collection.has(Collection.slug == collection)
            | Product.collection.has(Collection.name == collection)
        )
    if size:
        filters.append(Product.variants.any(ProductVariant.size == size))
    if color:
        filters.append(Product.variants.any(func.lower(ProductVariant.color) == color.lower()))
    if min_price is not None:
        filters.append(Product.variants.any(ProductVariant.price_minor >= min_price * 100))
    if max_price is not None:
        filters.append(Product.variants.any(ProductVariant.price_minor <= max_price * 100))
    if available:
        filters.append(Product.variants.any(ProductVariant.stock_quantity > 0))
    if new_only:
        filters.append(Product.is_new.is_(True))
    if featured:
        filters.append(Product.featured.is_(True))
    if best_seller:
        filters.append(Product.best_seller.is_(True))
    if term and term.strip():
        value = f"%{term.strip()}%"
        filters.append(
            or_(
                Product.name.ilike(value),
                Product.description.ilike(value),
                Product.category_ref.has(Category.slug.ilike(value)),
            )
        )
    lowest_price = (
        select(func.min(ProductVariant.price_minor))
        .where(ProductVariant.product_id == Product.id)
        .scalar_subquery()
    )
    ordering = {
        "featured": (Product.featured.desc(), Product.created_at.desc()),
        "newest": (Product.created_at.desc(),),
        "popular": (Product.best_seller.desc(), Product.created_at.desc()),
        "price-asc": (lowest_price.asc(),),
        "price-desc": (lowest_price.desc(),),
        "name": (Product.name.asc(),),
    }
    query = product_statement().where(and_(*filters))
    total = (
        await session.scalar(select(func.count()).select_from(Product).where(and_(*filters))) or 0
    )
    query = query.order_by(*ordering[sort])
    rows = (await session.scalars(query.offset((page - 1) * page_size).limit(page_size))).all()
    return ProductPageOut(
        items=[product_payload(product) for product in rows],
        total=total,
        page=page,
        pageSize=page_size,
    )


@router.get("/products/featured", response_model=list[ProductOut])
async def featured_products(session: AsyncSession = Depends(get_session)) -> list[ProductOut]:
    rows = (
        await session.scalars(
            product_statement()
            .where(Product.status.in_(["active", "sample"]), Product.featured.is_(True))
            .order_by(Product.created_at.desc())
            .limit(12)
        )
    ).all()
    return [product_payload(product) for product in rows]


@router.get("/products/{slug}", response_model=ProductOut)
async def get_product(slug: str, session: AsyncSession = Depends(get_session)) -> ProductOut:
    product = await session.scalar(
        product_statement().where(Product.slug == slug, Product.status.in_(["active", "sample"]))
    )
    if product is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "product_not_found", "message": "This product is no longer available."},
        )
    return product_payload(product)


@router.get("/categories")
async def list_categories(
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, str | None]]:
    rows = (
        await session.scalars(
            select(Category).where(Category.is_active.is_(True)).order_by(Category.name)
        )
    ).all()
    return [
        {
            "id": str(row.id),
            "name": row.name,
            "slug": row.slug,
            "parentId": str(row.parent_id) if row.parent_id else None,
        }
        for row in rows
    ]


@router.get("/collections")
async def list_collections(session: AsyncSession = Depends(get_session)) -> list[dict[str, str]]:
    rows = (
        await session.scalars(
            select(Collection).where(Collection.is_active.is_(True)).order_by(Collection.name)
        )
    ).all()
    return [
        {"id": str(row.id), "name": row.name, "slug": row.slug, "description": row.description}
        for row in rows
    ]


@admin.post("/products", response_model=ProductOut, status_code=201)
async def create_product(
    payload: ProductCreateIn,
    session: AsyncSession = Depends(get_session),
    actor: User = Depends(admin_user),
) -> ProductOut:
    collection_slug = payload.collection.lower().replace(" / ", "-").replace(" ", "-")
    collection = await session.scalar(
        select(Collection).where(Collection.name == payload.collection)
    )
    if collection is None:
        collection = Collection(name=payload.collection, slug=collection_slug, description="")
        session.add(collection)
        await session.flush()
    category = await session.scalar(select(Category).where(Category.slug == payload.category))
    if category is None:
        category = Category(name=payload.category.replace("-", " ").title(), slug=payload.category)
        session.add(category)
        await session.flush()
    product = Product(
        slug=payload.slug,
        name=payload.name,
        category_id=category.id,
        audience=payload.audience,
        description=payload.description,
        collection_id=collection.id,
        currency=payload.currency.upper(),
        image_url=payload.image_url,
        colors=[color.model_dump() for color in payload.colors],
        featured=payload.featured,
        is_new=payload.is_new,
        best_seller=payload.best_seller,
        status=payload.status,
    )
    for color in payload.colors:
        for size in payload.sizes:
            sku = f"{payload.slug}-{color.name}-{size}".lower().replace(" ", "-")[:100]
            product.variants.append(
                ProductVariant(
                    sku=sku,
                    size=size,
                    color=color.name,
                    color_value=color.value,
                    price_minor=payload.price_minor,
                    stock_quantity=payload.stock_quantity,
                )
            )
    session.add(product)
    await session.commit()
    product = await session.scalar(product_statement().where(Product.id == product.id))
    assert product is not None
    return product_payload(product)


@admin.patch("/products/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: UUID,
    payload: ProductUpdateIn,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(admin_user),
) -> ProductOut:
    product = await session.scalar(product_statement().where(Product.id == product_id))
    if product is None:
        raise HTTPException(
            status_code=404, detail={"code": "product_not_found", "message": "Product not found."}
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await session.commit()
    product = await session.scalar(product_statement().where(Product.id == product_id))
    assert product is not None
    return product_payload(product)


@admin.post("/categories", status_code=201)
async def create_category(
    payload: CategoryCreateIn,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(admin_user),
) -> dict[str, str]:
    if await session.scalar(select(Category.id).where(Category.slug == payload.slug)):
        raise HTTPException(
            status_code=409,
            detail={
                "code": "category_exists",
                "message": "A category with that slug already exists.",
            },
        )
    category = Category(name=payload.name, slug=payload.slug)
    session.add(category)
    await session.commit()
    return {"id": str(category.id), "name": category.name, "slug": category.slug}


@admin.post("/collections", status_code=201)
async def create_collection(
    payload: CollectionCreateIn,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(admin_user),
) -> dict[str, str]:
    if await session.scalar(select(Collection.id).where(Collection.slug == payload.slug)):
        raise HTTPException(
            status_code=409,
            detail={
                "code": "collection_exists",
                "message": "A collection with that slug already exists.",
            },
        )
    collection = Collection(name=payload.name, slug=payload.slug, description=payload.description)
    session.add(collection)
    await session.commit()
    return {
        "id": str(collection.id),
        "name": collection.name,
        "slug": collection.slug,
        "description": collection.description,
    }


@admin.post("/inventory/{variant_id}/adjust", status_code=204)
async def adjust_inventory(
    variant_id: UUID,
    payload: InventoryAdjustIn,
    session: AsyncSession = Depends(get_session),
    actor: User = Depends(admin_user),
) -> None:
    variant = await session.scalar(
        select(ProductVariant).where(ProductVariant.id == variant_id).with_for_update()
    )
    if variant is None:
        raise HTTPException(
            status_code=404, detail={"code": "variant_not_found", "message": "Variant not found."}
        )
    if variant.stock_quantity + payload.delta < 0:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "insufficient_stock",
                "message": "Stock cannot be adjusted below zero.",
            },
        )
    variant.stock_quantity += payload.delta
    session.add(
        InventoryAdjustment(
            variant_id=variant.id,
            delta=payload.delta,
            reason=payload.reason,
            actor_user_id=actor.id,
        )
    )
    await session.commit()
