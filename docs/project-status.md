# Project Status

**Updated:** 2026-11-22 (Africa/Cairo)  
**Active effort:** autonomous backend, storefront integration and local production preparation.  
**Release state:** local-development stack only; production readiness is not claimed.  
**Git:** branch `main`; initial checkpoint `6734ad0` preserves the workspace state from before this effort. Current implementation changes are not yet committed.

## Architecture today

- React 19 + TypeScript + Vite storefront; React Router routes; TanStack Query for server reads; Zustand for interface/session state; Three.js-powered showroom and hoodie viewer.
- FastAPI + Pydantic Settings backend; async SQLAlchemy 2; Alembic; PostgreSQL target and local SQLite test/dev option; Redis-backed authentication throttling.
- Domain persistence: users/refresh sessions, categories/collections/products/images/variants, inventory adjustments/reservations, customer/guest carts, wishlist, orders/items/payments, newsletter and contact.
- `compose.yaml`: Nginx frontend/reverse proxy, FastAPI API, PostgreSQL, Redis and a one-shot migration/seed service. Only loopback website port is published; named volumes retain database/cache data.
- Real provider integrations are deliberately absent: mock payment, console email, bundled static assets. No AI feature, worker, external storage, or public host is configured.

## Milestone status

| Workstream | Status | Evidence / remaining work |
|---|---|---|
| Repository discovery and safe checkpoint | Complete | Initial Git checkpoint verified. Existing `main.py` is untouched. |
| M2.1 showroom regression stabilization | Complete | Build, 7 unit tests, 8 browser tests and five viewport captures passed earlier in this effort. |
| M3 storefront stabilization | Complete for available frontend scope | Full route foundation and mock adapters retained; screens, taxonomy and account demo behavior remain sample content. |
| Backend architecture / ADRs | Written and implemented at first cut | Architecture records under `docs/architecture`; a few planned boundaries (separate service/repository modules) remain intentionally consolidated in route modules and need refactoring before growth. |
| FastAPI configuration, health and admin diagnostics | Implemented, tested | Pydantic settings; `/api/health`, `/api/ready`, `/api/admin/system/status`; redaction/role tests. |
| Auth/catalog/cart/checkout API | Implemented, tested locally | Argon2id, rotating refresh, server-owned prices/stock, guest carts, guest-to-account cart transfer, idempotency and mock checkout. |
| Frontend API integration | Partial | Catalog, auth, cart, wishlist, checkout, account orders, contact/newsletter, diagnostics. About/editorial/store data and other content still use mock adapters. |
| Docker local stack | Implemented; clean run underway | Compose config parses; Docker Desktop has now been started to build and verify containers. Full health/data-preservation checks are still pending this run. |
| Production/provider readiness | Incomplete by design | No real payments, email, uploads/storage, verified policies, shipping, tax, production CI, public deployment or hosting purchase. |

## Verified in this run

- Frontend TypeScript: passed.
- Frontend production bundle: passed. Vite reports a large Three.js chunk (about 570 kB minified / 143 kB gzip) as a warning.
- Frontend unit suite: 7/7 passed.
- Backend pytest suite: 7/7 passed against in-memory SQLite.
- Backend Ruff checks: passed.
- Alembic migrations: applied through `6bcec67530dd` on the persistent local SQLite development database.
- Docker Compose static configuration: parsed successfully.
- Full browser suite: initial local Vite startup was denied permission to bind 127.0.0.1:4173. The test config now supports a caller-supplied base URL, and Compose browser verification will be attempted against the actual running stack.

## Important product and security limits

- Product names/imagery are derived from `docs/material/`; price, fit, composition, size assortment and stock remain unapproved sample values.
- Mock payments always simulate success; no bank/card data is collected. Email events are not delivered.
- Password recovery and email verification are not enabled. Customer profile and address editing are not backed by API endpoints.
- The admin bootstrap password is a local-only first-run convenience. Clear it and recreate the one-shot migration service after creating the admin account; establish a safer provisioning/rotation process before sharing an environment.
- SQLite tests do not replace a real PostgreSQL integration/concurrency run. Docker acceptance still depends on verified health, auth, purchase and volume-restart behavior.
- No public deployment or external financial commitment was made.

## Next gates

1. Finish Compose clean start, service health and API/storefront browser workflows; verify data remains after container restart without removing volumes.
2. Finish API-mode frontend interaction tests and run the full existing Playwright suite against the stack where it fits the current demo contract.
3. Inspect `docker compose logs`, PostgreSQL migrations and Redis health; document measured results and remaining blockers in `docs/reports/autonomous-execution.md`.
4. Complete production provider/region research, CI and operational security tasks, then stop for owner review before any public deployment.
