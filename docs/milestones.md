# ARCFIELD / Crewww milestones

The active brand implementation follows the user-supplied Crewww references in `docs/material/`. Earlier M1/M2/M2.1 and production-audit records are historical; this tracker is the current milestone source of truth.

| Milestone | Scope | Status |
|---|---|---|
| M1 / M1.1 | Research, brand direction, design system, routes and accessibility foundation | Complete; source limitations are documented in the research notes. |
| M2 / M2.1 | Immersive Crewww hoodie showroom, procedural Three.js viewer, responsive QA and browser stabilization | Implemented and previously verified; product imagery/model remain development assets. |
| M3 | Storefront route foundation, catalog, product detail, search, editorial/content and responsive shell | Complete for the available frontend scope. Many editorial, location, support and policy records are previews. |
| M4 | Auth, cart, wishlist, checkout and order flows | Frontend demo flows existed first; API-backed local flows are now implemented at first cut and covered by backend tests. Frontend-to-API browser acceptance is in progress. |
| M5.1 | Production audit and infrastructure discovery | Historical audit completed before backend work; its findings are superseded by the status in `docs/project-status.md` and this report. No readiness claim. |
| M6 | Modular FastAPI, settings, PostgreSQL schema, migrations, auth, catalog, inventory, cart, checkout, orders and admin diagnostics | Core API implemented with SQLite-backed API tests; PostgreSQL/container verification is in progress. |
| M7 | Frontend service switching and full-stack integration | Partial: catalog/auth/cart/wishlist/checkout/orders/newsletter/contact/diagnostics wired; content/catalog completeness and browser purchase journeys remain. |
| M8 | One-command local Docker Compose deployment | Compose, Dockerfiles, Nginx, health checks, persistent volumes, migrations and seed implemented. Clean environment and persistence verification in progress. |
| M9 | System configuration dashboard and security tests | Implemented at `/admin/system`, permission and secret-redaction tests pass; browser-mode verification pending. |
| M10 | Hosting/provider research and cost comparison for Egypt | Not started. Must use current official provider pricing/region sources and present assumptions without buying/activating services. |
| M11 | CI, operations, incident response, backup/restore and deployment documentation | Local docs exist; automated CI, backups in managed storage, monitoring and production operations remain. |
| M12 | Final integration gate and owner review | Not passed. Stop before any public deployment and wait for owner authorization. |

## Current execution acceptance notes

- Frontend checks in this execution: TypeScript, production Vite build and 7 unit tests pass; 3D bundle-size warning remains.
- Backend checks: 7 API tests pass; Ruff clean; Alembic SQLite database at head `6bcec67530dd`.
- Compose config parses. Docker Desktop was available but initially stopped; the daemon was started and the clean Compose build/run is being verified.
- Playwright startup against the prior Vite target could not bind port 4173 in this environment. The configuration now supports `PW_BASE_URL` so browser checks can target the Compose site instead.
- No live payments, live email, AI provider, storage upload, paid hosting or public deployment.
- Acceptance remains incomplete until Compose service health, end-to-end browser behaviors and volume persistence have actual results documented.
