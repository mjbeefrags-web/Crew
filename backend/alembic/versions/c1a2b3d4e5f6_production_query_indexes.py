"""production query indexes

Revision ID: c1a2b3d4e5f6
Revises: 6bcec67530dd
Create Date: 2026-11-25

Adds the composite indexes used by catalog browsing, filtering, and order
history. Every index here is also declared in ``app.models`` so
``alembic check`` stays clean.

Advanced PostgreSQL-only indexes (trigram GIN for ``ILIKE`` search, a partial
in-stock index) live in ``deploy/sql/production-indexes-concurrent.sql``: they
are built online by an operator and intentionally kept out of the migration so
that autogenerate stays portable and predictable.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "c1a2b3d4e5f6"
down_revision: str | None = "6bcec67530dd"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Catalog listing: status filter + created_at ordering.
    op.create_index("ix_products_status_created", "products", ["status", "created_at"])
    op.create_index("ix_products_best_seller", "products", ["best_seller"])

    # Variant facets: size, color, price.
    op.create_index("ix_variants_product_size", "product_variants", ["product_id", "size"])
    op.create_index("ix_variants_product_color", "product_variants", ["product_id", "color"])
    op.create_index("ix_variants_product_price", "product_variants", ["product_id", "price_minor"])

    # Order history and operations.
    op.create_index("ix_orders_user_created", "orders", ["user_id", "created_at"])
    op.create_index("ix_orders_status_created", "orders", ["status", "created_at"])
    op.create_index("ix_payments_order_status", "payments", ["order_id", "status"])


def downgrade() -> None:
    op.drop_index("ix_payments_order_status", table_name="payments")
    op.drop_index("ix_orders_status_created", table_name="orders")
    op.drop_index("ix_orders_user_created", table_name="orders")
    op.drop_index("ix_variants_product_price", table_name="product_variants")
    op.drop_index("ix_variants_product_color", table_name="product_variants")
    op.drop_index("ix_variants_product_size", table_name="product_variants")
    op.drop_index("ix_products_best_seller", table_name="products")
    op.drop_index("ix_products_status_created", table_name="products")
