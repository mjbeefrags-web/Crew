# Database handoff (frontend + backend agents)

Audit of the local mirror (`crewww_live`) and the deployed Neon database
(`Crew` / `production`) on 2026-11-27. The mirror is refreshed from Neon every
15 minutes — see [local-live-sync.md](local-live-sync.md) for the setup.

## 1. Verification evidence

Both databases agree exactly on key counts and migration state:

| Check | Local `crewww_live` | Neon `production` |
|---|---|---|
| Tables in `public` | 19 | 19 |
| Alembic head | `c1a2b3d4e5f6` | `c1a2b3d4e5f6` |
| `products` | 13 | 13 |
| `product_variants` | 170 | 170 |
| `users` | 3 | 3 |
| `orders` | 1 | 1 |
| `carts` | 108 | 108 |
| `cart_items` | 17 | 17 |

Full local row counts: `alembic_version` 1, `cart_items` 17, `carts` 108,
`categories` 12, `collections` 5, `contact_messages` 0,
`inventory_adjustments` 1, `inventory_reservations` 1,
`newsletter_subscriptions` 0, `order_items` 1, `orders` 1, `payments` 1,
`product_images` 13, `product_variants` 170, `products` 13,
`refresh_sessions` 12, `users` 3, `wishlist_items` 0, `wishlists` 1.

Constraints from `78dc8de83270_initial_commerce_schema.py` and
`c1a2b3d4e5f6_production_query_indexes.py` are all present: 20 foreign keys,
the expected unique indexes (`uq_cart_user`, `uq_cart_variant`,
`uq_order_idempotency`, `ix_users_email`, `ix_newsletter_subscriptions_email`,
`ix_product_variants_sku`, `ix_products_slug`, etc.) and all five CHECK
constraints (`ck_cart_quantity_positive`, `ck_reservation_quantity_positive`,
`ck_order_total_nonnegative`, `ck_variant_price_nonnegative`,
`ck_variant_stock_nonnegative`).

Reproduce the integrity check:

```powershell
$pg = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$db = "postgresql+asyncpg://crewww:PASSWORD@127.0.0.1:5432/crewww_live" -replace 'postgresql\+asyncpg://','postgresql://'
& $pg $db -Atc @"
select 'products_without_variants', count(*) from products p where not exists (select 1 from product_variants v where v.product_id=p.id)
union all select 'products_without_images', count(*) from products p where not exists (select 1 from product_images i where i.product_id=p.id)
union all select 'variants_negative_price', count(*) from product_variants where price_minor < 0
union all select 'variants_negative_stock', count(*) from product_variants where stock_quantity < 0
union all select 'cart_items_bad_qty', count(*) from cart_items where quantity <= 0
union all select 'reservations_bad_qty', count(*) from inventory_reservations where quantity <= 0
union all select 'order_total_mismatch', count(*) from orders where total_minor <> subtotal_minor + delivery_minor
union all select 'payment_amount_mismatch', count(*) from payments p join orders o on o.id=p.order_id where p.amount_minor <> o.total_minor
union all select 'expired_refresh_sessions', count(*) from refresh_sessions where expires_at < now()
union all select 'active_but_expired_reservations', count(*) from inventory_reservations where status='active' and expires_at < now()
union all select 'admin_users', count(*) from users where role='admin'
union all select 'unverified_users', count(*) from users where not email_verified;
"@
```

Result at audit time: all anomaly counts **0**; `admin_users` **1**;
`unverified_users` **2**.

Status distribution: `products.status='sample'` (13/13),
`orders.status='processing'` (1), `payments.status='succeeded'` (1),
`inventory_reservations.status='committed'` (1), users: 2 `customer` + 1 `admin`.
All products are `audience='unisex'`, `currency='USD'`.

## 2. Backend gaps / potential errors

1. **Mirror is a full replace.** `scripts/sync-from-neon.ps1` restores with
   `--clean --if-exists --single-transaction` every 15 minutes. Any local
   write to `crewww_live` is destroyed at the next tick. Do not use this DB
   for persistence tests.
2. **Env split matters.** The host-only `DATABASE_URL` must stay in
   `backend/.env`. Re-adding it to the root `.env` overrides Compose's
   `db:5432` default and makes `migrate` fail when the host Postgres is off.
3. **Case-sensitive email uniqueness.** `users.email` and
   `newsletter_subscriptions.email` are unique on the raw string, so
   `A@x.com` and `a@x.com` can coexist. Normalize to lowercase on write or
   add a `lower(email)` unique index.
4. **Unvalidated status varchars.** `orders.status`, `payments.status`,
   `products.status`, and `inventory_reservations.status` have no CHECK or
   enum constraint. Validate allowed values in the API; otherwise invalid
   strings can be persisted.
5. **Inventory oversell risk.** `product_variants.stock_quantity` is a plain
   integer. Checkout must lock the row (`SELECT ... FOR UPDATE`) or use an
   atomic `UPDATE ... WHERE stock_quantity >= qty`; there is no DB-level
   guarantee that active reservations are within stock.
6. **Session growth.** `refresh_sessions` has 12 rows and no TTL cleanup job;
   none are currently expired, but the table grows without pruning.
7. **Duplicate order items.** `order_items` has no unique
   `(order_id, variant_id)` constraint, so a retried "add item" can duplicate
   a line.
8. **PostgreSQL minor skew.** Neon runs 18.7, local runs 18.3. The sync
   strips the `pg_attver` column marker from dumps. Avoid 18.7-only database
   features until the local server is upgraded, or the mirror will fail.

## 3. Frontend gaps / potential errors

- All 13 products are `status='sample'`. `backend/app/api/catalog.py` exposes
  `active` **and** `sample` and sets `isPreviewData=true` for `sample`. Do not
  filter `sample` out of the catalog; render the preview indication.
- `sale_price_minor` is nullable; `gallery_urls`, `specifications`, and
  `colors` are JSON columns. Handle null/empty values gracefully.
- `color_value` on variants holds valid hex strings (e.g. `#171719`,
  `#4b332b`) and can drive swatches directly.
- `products` has 12 categories and 5 collections; all currency values are
  `USD` and all audiences `unisex`.
- 2 of 3 users have `email_verified=false`; verification state must be
  reflected in auth UI flows.
- The mirror contains real user and order records. Do not use it for public
  demos or screenshots.

## 4. Using the mirror

| Task | Command / detail |
|---|---|
| One manual refresh | `npm run sync:db` |
| Automatic refresh | Windows Task `Crewww Neon to Local Sync`, every 15 min while online |
| Run log | `logs\sync-neon.log` |
| Kept dumps | `backups\neon\` (last 7 verified) |
| pgAdmin server | `Crewww Live Mirror (Neon)` → `127.0.0.1:5432`, DB `crewww_live`, user `crewww`, password `local-only-change-me-123456` |
| Local backend | `backend/.env` → `DATABASE_URL=postgresql+asyncpg://crewww:...@127.0.0.1:5432/crewww_live` |
| Docker Compose | Unaffected; uses its own `db:5432` service from the root `.env` defaults |
| Neon credential | DPAPI-encrypted at `%LOCALAPPDATA%\crewww\neon-direct.url` (no plaintext secret in repo) |
