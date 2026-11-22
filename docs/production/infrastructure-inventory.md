# Infrastructure Inventory

**Audit date:** 2026-11-22 (Africa/Cairo)

## Current components

| Area | Present state | Evidence / notes |
|---|---|---|
| Frontend runtime | React 19, TypeScript, Vite 8 SPA | Root `package.json`, `src/main.tsx`, `vite.config.ts` |
| Routing | React Router 7 | `src/app/App.tsx`; frontend routes only |
| Client data cache | TanStack Query 5 | Query provider and mock service adapters |
| Client UI state | Zustand 5 and localStorage | Demo cart, wishlist and form records; browser-local only |
| 3D | Three.js 0.187 | Lazily loaded showroom and hoodie scene; illustrative assets/model |
| Product/content/commerce services | In-memory/local mock adapters | `src/services/mock*Service.ts` |
| Database | **Absent** | No DB driver, URL, schema, migration tool, Alembic config or database service |
| API/backend | **Absent** | No Python source or API server; no `main.py` in project root |
| Redis/cache broker | **Absent** | No configuration or service dependency |
| Background workers/scheduler | **Absent** | No queue or worker code/configuration |
| Authentication/authorization | **Absent as a trusted service** | UI/demo concepts only; no identity provider or server-side role enforcement |
| Payment | **Absent** | Checkout is explicitly local demonstration only |
| Email | **Absent** | Newsletter/contact store local demo records; no message delivery |
| File/object storage | **Absent** | Product images are static local public assets; no upload/storage provider |
| Reverse proxy/TLS | **Absent** | No Nginx or proxy config |
| Containers | **Absent** | No Dockerfile or Compose manifest. Host has Docker 29.9.2 and Compose v5.6.1 installed, not project services. |
| CI/CD | **Absent** | No `.github` workflows or other pipeline configuration |
| Infrastructure as code | **Absent** | No Terraform/Pulumi/Kubernetes/deployment manifests |
| Observability | **Absent** | No application logging/metrics/tracing/error reporting service configuration |
| Environment configuration | Partial frontend ignore rule only | `.gitignore` excludes `.env*`, with `.env.example` exception; no example or validated settings module |
| Tests | Vitest, Testing Library, Playwright Chromium | Current suite: unit 6/7 pass; Playwright result in production audit |

## Repository shape

```text
docs/                 architecture, design, milestone, QA and local product references
e2e/                  Playwright browser suite
public/images/        static showroom/product imagery
src/app/              routes, providers, site shell
src/components/       shared UI and Three.js viewers
src/data/mock/        mock catalog/content data
src/domain/           TypeScript domain contracts
src/features/         catalog/search/product routes
src/pages/             storefront, editorial, commerce and content views
src/services/          mock service adapters
src/state/             browser-owned state
src/styles/            CSS and design tokens
```

Generated/local folders `dist/`, `node_modules/` and `test-results/` are also present.

## Production topology prerequisites (not implemented)

The intended topology cannot be inferred as deployed from this repository. A candidate architecture to review would be a static React build behind a TLS-terminating reverse proxy, a FastAPI application, PostgreSQL with migration/backup/restore procedures, and optional Redis/worker services only where confirmed product workflows require them. Secrets should enter via deployment secret injection and remain server-side. This is a recommendation, not a current inventory item or a deployment claim.
