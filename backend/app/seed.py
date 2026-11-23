import asyncio
import re

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionFactory, engine
from app.models import Category, Collection, Product, ProductImage, ProductVariant, User

PRODUCTS = [
    (
        "vivre-la-vie-hoodie",
        "Vivre La Vie Hoodie",
        7400,
        "Black",
        "#171719",
        "CREWWW / GRAPHIC HOODIES",
        True,
        False,
        "Back graphic featuring the Vivre La Vie artwork, from the supplied Crewww reference set.",
    ),
    (
        "passion-racing-hoodie",
        "Passion Racing Hoodie",
        8200,
        "Black",
        "#171719",
        "CREWWW / GRAPHIC HOODIES",
        True,
        False,
        "Automotive graphic hoodie shown in the supplied product photography.",
    ),
    (
        "joy-of-outdoors-hoodie",
        "Joy of Outdoors Hoodie",
        7800,
        "Mocha",
        "#795247",
        "CREWWW / OUTSIDE HOURS",
        False,
        True,
        "Mocha fleece with a large outdoors inspired back graphic.",
    ),
    (
        "crane-garden-hoodie",
        "Crane Garden Hoodie",
        8600,
        "Black",
        "#171719",
        "CREWWW / GRAPHIC HOODIES",
        True,
        False,
        "Black fleece with a crane and garden illustration across the back.",
    ),
    (
        "cherry-blossom-hoodie",
        "Cherry Blossom Hoodie",
        7600,
        "Rose",
        "#d7a4ae",
        "CREWWW / GRAPHIC HOODIES",
        False,
        True,
        "Pink fleece with a cherry blossom and branch illustration.",
    ),
    (
        "new-york-hoodie",
        "New York Hoodie",
        7200,
        "Rose",
        "#d7a4ae",
        "CREWWW / CITY NOTES",
        False,
        False,
        "Pink fleece with a New York city graphic at the chest.",
    ),
    (
        "tokyo-graphic-hoodie",
        "Tokyo Graphic Hoodie",
        8400,
        "Rose",
        "#d7a4ae",
        "CREWWW / CITY NOTES",
        True,
        False,
        "Graphic pink hoodie from the supplied Tokyo design reference.",
    ),
    (
        "crew-script-hoodie",
        "Crew Script Hoodie",
        6800,
        "Forest",
        "#254c43",
        "CREWWW / ESSENTIALS",
        False,
        True,
        "Forest green pullover with a bold script treatment across the back.",
    ),
]
SIZES = ["S", "M", "L", "XL", "XXL"]


async def seed() -> None:
    async with SessionFactory() as session:
        category = await session.scalar(select(Category).where(Category.slug == "hoodies"))
        if category is None:
            category = Category(name="Hoodies", slug="hoodies")
            session.add(category)
            await session.flush()
        for name in [
            "tops",
            "t-shirts",
            "sweatshirts",
            "shirts",
            "jackets",
            "trousers",
            "shorts",
            "denim",
            "kids",
            "accessories",
            "shoes",
        ]:
            row = await session.scalar(select(Category).where(Category.slug == name))
            if row is None:
                session.add(Category(name=name.replace("-", " ").title(), slug=name))
        await session.flush()
        for product_data in PRODUCTS:
            (
                slug,
                name,
                price,
                color,
                color_value,
                collection_name,
                is_new,
                best_seller,
                description,
            ) = product_data
            product = await session.scalar(select(Product).where(Product.slug == slug))
            collection = await session.scalar(
                select(Collection).where(Collection.name == collection_name)
            )
            if collection is None:
                collection_slug = re.sub(r"[^a-z0-9]+", "-", collection_name.lower()).strip("-")
                collection = Collection(
                    name=collection_name, slug=collection_slug, description="Crewww product edit."
                )
                session.add(collection)
                await session.flush()
            colors = [{"name": color, "value": color_value}]
            if slug == "joy-of-outdoors-hoodie":
                colors.append({"name": "Black", "value": "#171719"})
            image_url = f"/images/crewww/hoodie-{PRODUCTS.index(product_data) + 1:02}.jpg"
            if product is None:
                product = Product(
                    slug=slug,
                    name=name,
                    category_id=category.id,
                    audience="unisex",
                    description=description,
                    collection_id=collection.id,
                    currency="USD",
                    image_url=image_url,
                    gallery_urls=[],
                    specifications={
                        "material": "Cotton fleece (confirm final composition)",
                        "fit": "Relaxed fit (confirm production sample)",
                        "care": "Care guidance to be confirmed with the product owner.",
                        "details": "Product details shown are provisional.",
                    },
                    colors=colors,
                    featured=True,
                    is_new=is_new,
                    best_seller=best_seller,
                    status="sample",
                )
                product.images.append(
                    ProductImage(
                        url=product.image_url,
                        alt_text=f"{name} product photograph",
                        sort_order=0,
                        is_primary=True,
                    )
                )
                session.add(product)
            elif product.status == "sample":
                product.name = name
                product.category_id = category.id
                product.description = description
                product.collection_id = collection.id
                product.image_url = image_url
                product.colors = colors
                product.featured = True
                product.is_new = is_new
                product.best_seller = best_seller
            existing_skus = {variant.sku for variant in product.variants}
            for color_option in colors:
                variant_color = color_option["name"]
                for size in SIZES:
                    sku = f"{slug}-{variant_color.lower()}-{size.lower()}"
                    if sku in existing_skus:
                        continue
                    product.variants.append(
                        ProductVariant(
                            sku=sku,
                            size=size,
                            color=variant_color,
                            color_value=color_option["value"],
                            price_minor=price,
                            stock_quantity=20,
                        )
                    )
        settings = get_settings()
        bootstrap_password = (
            settings.bootstrap_admin_password.get_secret_value().strip()
            if settings.bootstrap_admin_password
            else ""
        )
        if settings.bootstrap_admin_email and bootstrap_password:
            admin = await session.scalar(
                select(User).where(User.email == settings.bootstrap_admin_email.lower())
            )
            if admin is None:
                session.add(
                    User(
                        email=settings.bootstrap_admin_email.lower(),
                        password_hash=hash_password(bootstrap_password),
                        first_name="Store",
                        last_name="Administrator",
                        role="admin",
                        is_active=True,
                        email_verified=True,
                    )
                )
        await session.commit()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
