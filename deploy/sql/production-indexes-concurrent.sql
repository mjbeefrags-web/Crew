-- Online indexes for an already-busy production database.
-- Run with: psql "$DATABASE_URL" -f deploy/sql/production-indexes-concurrent.sql
--
-- The Alembic migration (c1a2b3d4e5f6) creates the composite indexes inside a
-- transaction. This file creates the same set with CONCURRENTLY, then adds the
-- PostgreSQL-only search indexes that are deliberately not part of the Alembic
-- metadata. Every statement is IF NOT EXISTS, so running it before or after
-- the migration is safe. Do not wrap this file in a transaction.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Same indexes as the Alembic migration, built without locking writes.
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_products_status_created
  ON products (status, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_products_best_seller
  ON products (best_seller);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_variants_product_size
  ON product_variants (product_id, size);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_variants_product_color
  ON product_variants (product_id, color);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_variants_product_price
  ON product_variants (product_id, price_minor);

CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_orders_user_created
  ON orders (user_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_orders_status_created
  ON orders (status, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_payments_order_status
  ON payments (order_id, status);

-- PostgreSQL-only search acceleration. Alembic does not manage these names;
-- `alembic revision --autogenerate` will propose dropping them, so review its
-- output before applying it on a database that has run this file.
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_products_name_trgm
  ON products USING gin (name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_products_description_trgm
  ON products USING gin (description gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_variants_in_stock_partial
  ON product_variants (product_id) WHERE stock_quantity > 0;

ANALYZE products;
ANALYZE product_variants;
ANALYZE orders;
ANALYZE payments;
