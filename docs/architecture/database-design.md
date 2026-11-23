# Database Design

PostgreSQL is the durable system of record. UUID primary keys, UTC timestamps, normalized email, explicit currency codes, foreign keys and check constraints are used. Prices are integer minor units to avoid floating-point arithmetic.

## Core entities

- `users`, `refresh_sessions`: customer/admin identity, password hash, role, revocable hashed refresh tokens.
- `categories`, `collections`, `products`, `product_images`, `product_variants`: navigable published catalog and media metadata.
- `inventory_adjustments`, `inventory_reservations`: auditable stock changes and checkout holds.
- `carts`, `cart_items`, `wishlists`, `wishlist_items`: persistent customer/guest commerce intent.
- `orders`, `order_items`, `payments`: immutable purchase snapshots and payment lifecycle.

## Invariants

- Email and SKU are unique after normalization.
- Variant stock is nonnegative; requested quantity is positive.
- Order-item title, SKU, unit price and currency are snapshots; catalog edits do not rewrite past orders.
- Order totals are computed server-side from snapshots and validated shipping/tax rules.
- Inventory reservation and order creation share one database transaction and use row locking/conditional stock updates to prevent overselling.
- Payment records contain provider references/status only; never PAN or CVV.
- Refresh tokens are stored as hashes and have revocation/expiry timestamps.

The ERD in `database-erd.md` is the implementation target; migrations, not application startup table creation, own production schema changes.
