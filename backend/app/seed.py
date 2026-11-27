import asyncio
import re
from dataclasses import dataclass

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionFactory, engine
from app.models import Category, Collection, Product, ProductImage, ProductVariant, User


@dataclass(frozen=True)
class ProductSeed:
    slug: str
    name: str
    price_minor: int
    collection: str
    description: str
    colors: tuple[tuple[str, str], ...]
    image_url: str = ""
    gallery_urls: tuple[str, ...] = ()
    is_new: bool = False
    best_seller: bool = False
    sku_prefix: str = ""
    stock_quantity: int = 20

    @property
    def color_options(self) -> list[dict[str, str]]:
        return [{"name": name, "value": value} for name, value in self.colors]

    def image_for(self, index: int) -> str:
        return self.image_url or f"/images/crewww/hoodie-{index + 1:02}.webp"

    def sku_for(self, color: str, size: str) -> str:
        if self.sku_prefix:
            return f"{self.sku_prefix}-{color.replace(' ', '').upper()}-{size}"
        return f"{self.slug}-{color.lower()}-{size.lower()}"


BASE_PRODUCTS = [
    ProductSeed(
        slug="vivre-la-vie-hoodie",
        name="Vivre La Vie Hoodie",
        price_minor=7400,
        collection="CREWWW / GRAPHIC HOODIES",
        description=(
            "Back graphic featuring the Vivre La Vie artwork, from the supplied "
            "Crewww reference set."
        ),
        colors=(("Black", "#171719"),),
        is_new=True,
    ),
    ProductSeed(
        slug="passion-racing-hoodie",
        name="Passion Racing Hoodie",
        price_minor=8200,
        collection="CREWWW / GRAPHIC HOODIES",
        description="Automotive graphic hoodie shown in the supplied product photography.",
        colors=(("Black", "#171719"),),
        is_new=True,
    ),
    ProductSeed(
        slug="joy-of-outdoors-hoodie",
        name="Joy of Outdoors Hoodie",
        price_minor=7800,
        collection="CREWWW / OUTSIDE HOURS",
        description="Mocha fleece with a large outdoors inspired back graphic.",
        colors=(("Mocha", "#795247"), ("Black", "#171719")),
        best_seller=True,
    ),
    ProductSeed(
        slug="crane-garden-hoodie",
        name="Crane Garden Hoodie",
        price_minor=8600,
        collection="CREWWW / GRAPHIC HOODIES",
        description="Black fleece with a crane and garden illustration across the back.",
        colors=(("Black", "#171719"),),
        is_new=True,
    ),
    ProductSeed(
        slug="cherry-blossom-hoodie",
        name="Cherry Blossom Hoodie",
        price_minor=7600,
        collection="CREWWW / GRAPHIC HOODIES",
        description="Pink fleece with a cherry blossom and branch illustration.",
        colors=(("Rose", "#d7a4ae"),),
        best_seller=True,
    ),
    ProductSeed(
        slug="new-york-hoodie",
        name="New York Hoodie",
        price_minor=7200,
        collection="CREWWW / CITY NOTES",
        description="Pink fleece with a New York city graphic at the chest.",
        colors=(("Rose", "#d7a4ae"),),
    ),
    ProductSeed(
        slug="tokyo-graphic-hoodie",
        name="Tokyo Graphic Hoodie",
        price_minor=8400,
        collection="CREWWW / CITY NOTES",
        description="Graphic pink hoodie from the supplied Tokyo design reference.",
        colors=(("Rose", "#d7a4ae"),),
        is_new=True,
    ),
    ProductSeed(
        slug="crew-script-hoodie",
        name="Crew Script Hoodie",
        price_minor=6800,
        collection="CREWWW / ESSENTIALS",
        description="Forest green pullover with a bold script treatment across the back.",
        colors=(("Forest", "#254c43"),),
        best_seller=True,
    ),
]

PSYCHEDELIC_ROOT = "/images/drops/psychedelic-minds"
PSYCHEDELIC_COLORWAYS = (
    ("White", "#eae5d8"),
    ("Deep Red", "#7d2026"),
    ("Black", "#171719"),
    ("Chocolate Brown", "#4b332b"),
    ("Petrol Blue", "#1d4b56"),
)
PSYCHEDELIC_PRODUCTS = [
    ProductSeed(
        slug="mind-01-psychedelic-hoodie",
        name="Out of Focus Hoodie",
        price_minor=8800,
        collection="CREWWW / PSYCHEDELIC MINDS",
        description=(
            "Physically here. Mentally somewhere else. Full-colour DTG artwork "
            "from the supplied concept plate."
        ),
        colors=PSYCHEDELIC_COLORWAYS,
        image_url=f"{PSYCHEDELIC_ROOT}/hoodie-product-photos/01-out-of-focus-hoodie.webp",
        gallery_urls=(
            f"{PSYCHEDELIC_ROOT}/print-plates/01-out-of-focus-dtg-back-print.webp",
        ),
        is_new=True,
        sku_prefix="CREW-PM01",
    ),
    ProductSeed(
        slug="mind-02-psychedelic-hoodie",
        name="Life in Scroll Hoodie",
        price_minor=8800,
        collection="CREWWW / PSYCHEDELIC MINDS",
        description=(
            "A never-ending feed. A life on repeat. Full-colour DTG artwork "
            "from the supplied concept plate."
        ),
        colors=PSYCHEDELIC_COLORWAYS,
        image_url=f"{PSYCHEDELIC_ROOT}/hoodie-product-photos/02-life-in-scroll-hoodie.webp",
        gallery_urls=(
            f"{PSYCHEDELIC_ROOT}/print-plates/02-life-in-scroll-dtg-back-print.webp",
        ),
        is_new=True,
        sku_prefix="CREW-PM02",
    ),
    ProductSeed(
        slug="mind-03-psychedelic-hoodie",
        name="The Gift Theory Hoodie",
        price_minor=8800,
        collection="CREWWW / PSYCHEDELIC MINDS",
        description=(
            "The more gifts, the merrier. Full-colour DTG artwork from the "
            "supplied concept plate."
        ),
        colors=PSYCHEDELIC_COLORWAYS,
        image_url=f"{PSYCHEDELIC_ROOT}/hoodie-product-photos/03-the-gift-theory-hoodie.webp",
        gallery_urls=(
            f"{PSYCHEDELIC_ROOT}/print-plates/03-the-gift-theory-dtg-back-print.webp",
        ),
        is_new=True,
        sku_prefix="CREW-PM03",
    ),
    ProductSeed(
        slug="mind-04-psychedelic-hoodie",
        name="Lost in the Frequency Hoodie",
        price_minor=8800,
        collection="CREWWW / PSYCHEDELIC MINDS",
        description=(
            "Reality is loud. Music takes you somewhere else. Full-colour DTG "
            "artwork from the supplied concept plate."
        ),
        colors=PSYCHEDELIC_COLORWAYS,
        image_url=(
            f"{PSYCHEDELIC_ROOT}/hoodie-product-photos/04-lost-in-the-frequency-hoodie.webp"
        ),
        gallery_urls=(
            f"{PSYCHEDELIC_ROOT}/print-plates/04-lost-in-the-frequency-dtg-back-print.webp",
        ),
        is_new=True,
        sku_prefix="CREW-PM04",
    ),
    ProductSeed(
        slug="mind-05-psychedelic-hoodie",
        name="Outsourced Mind Hoodie",
        price_minor=8800,
        collection="CREWWW / PSYCHEDELIC MINDS",
        description=(
            "Keep your mind yours. Full-colour DTG artwork from the supplied "
            "concept plate."
        ),
        colors=PSYCHEDELIC_COLORWAYS,
        image_url=f"{PSYCHEDELIC_ROOT}/hoodie-product-photos/05-outsourced-mind-hoodie.webp",
        gallery_urls=(
            f"{PSYCHEDELIC_ROOT}/print-plates/05-outsourced-mind-dtg-back-print.webp",
        ),
        is_new=True,
        sku_prefix="CREW-PM05",
    ),
]

PRODUCTS = [*BASE_PRODUCTS, *PSYCHEDELIC_PRODUCTS]
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

        for index, product_seed in enumerate(PRODUCTS):
            product = await session.scalar(
                select(Product).where(Product.slug == product_seed.slug)
            )
            collection = await session.scalar(
                select(Collection).where(Collection.name == product_seed.collection)
            )
            if collection is None:
                collection_slug = re.sub(
                    r"[^a-z0-9]+", "-", product_seed.collection.lower()
                ).strip("-")
                collection = Collection(
                    name=product_seed.collection,
                    slug=collection_slug,
                    description="Crewww product edit.",
                )
                session.add(collection)
                await session.flush()
            colors = product_seed.color_options
            image_url = product_seed.image_for(index)
            if product is None:
                product = Product(
                    slug=product_seed.slug,
                    name=product_seed.name,
                    category_id=category.id,
                    audience="unisex",
                    description=product_seed.description,
                    collection_id=collection.id,
                    currency="USD",
                    image_url=image_url,
                    gallery_urls=list(product_seed.gallery_urls),
                    specifications={
                        "material": "Cotton fleece (confirm final composition)",
                        "fit": "Relaxed fit (confirm production sample)",
                        "care": "Care guidance to be confirmed with the product owner.",
                        "details": "Product details shown are provisional.",
                    },
                    colors=colors,
                    featured=not product_seed.sku_prefix,
                    is_new=product_seed.is_new,
                    best_seller=product_seed.best_seller,
                    status="sample",
                )
                product.images.append(
                    ProductImage(
                        url=image_url,
                        alt_text=f"{product_seed.name} product photograph",
                        sort_order=0,
                        is_primary=True,
                    )
                )
                session.add(product)
            elif product.status == "sample":
                product.name = product_seed.name
                product.category_id = category.id
                product.description = product_seed.description
                product.collection_id = collection.id
                product.image_url = image_url
                product.gallery_urls = list(product_seed.gallery_urls)
                product.colors = colors
                product.is_new = product_seed.is_new
                product.best_seller = product_seed.best_seller
            existing_skus = {variant.sku for variant in product.variants}
            for color_option in colors:
                variant_color = color_option["name"]
                for size in SIZES:
                    sku = product_seed.sku_for(variant_color, size)
                    if sku in existing_skus:
                        continue
                    product.variants.append(
                        ProductVariant(
                            sku=sku,
                            size=size,
                            color=variant_color,
                            color_value=color_option["value"],
                            price_minor=product_seed.price_minor,
                            stock_quantity=product_seed.stock_quantity,
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
