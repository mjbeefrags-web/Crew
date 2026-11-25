# Production go-live checklist

Every item is either verified in this repository or has a named owner action.
Do not mark the rollout complete until the command in the evidence column has
been run against the target environment.

## 1. Containerized deployment

- [x] Multi-stage web image (`node:24-alpine` build → `nginx:1.29-alpine`)
      — `Dockerfile`
- [x] Multi-stage API image (`python:3.13-slim`, non-root `app` user)
      — `backend/Dockerfile`
- [x] `HEALTHCHECK` on web (`/healthz`) and API (`/api/ready`)
      — both Dockerfiles, `compose.yaml`
- [x] Resource limits and log rotation for every service — `compose.yaml`
- [x] `.dockerignore` excludes `node_modules`, `.env*`, caches, test output
- [x] `depends_on` uses `service_healthy` / `service_completed_successfully`
- [x] Build args carry `VITE_*` configuration into the web image
- [ ] Host firewall allows only 80/443; `8080` stays loopback-bound
      — `sudo ss -lntp`

## 2. CI/CD

- [x] `.github/workflows/ci.yml` runs web, API, migrations, Docker, Compose smoke
- [x] `.github/workflows/e2e.yml` nightly Playwright
- [x] `.github/workflows/release.yml` tag/version check + release artifact
- [ ] `main` protected with the five required checks
- [ ] First tagged release published and deploy rehearsed against staging

## 3. Environment parity and flags

- [x] `.env.example`, `.env.staging.example`, `.env.production.example`
- [x] Settings validation rejects unsafe staging/production values
      — `backend/app/core/config.py`
- [x] Build-time feature flags — `src/config/features.ts`
- [ ] Host files `.env.staging` / `.env.production` created from templates
- [ ] `FRONTEND_ORIGINS` matches the public host exactly (no trailing slash)

## 4. Domain, DNS, TLS

- [ ] A/AAAA records resolve to the server — `dig +short <domain>`
- [ ] Certbot certificate issued and renewal dry-run passes
- [ ] `deploy/nginx.tls.conf.template` installed with the real domain
- [ ] HSTS/CSP present — `curl -fsSI https://<domain>/`
- [ ] TLS grade checked externally (A or A+)

## 5. Backups and disaster recovery

- [x] `scripts/backup-postgres.ps1` / `.sh` with 7/4/2 retention and verification
- [x] `scripts/restore-postgres.ps1` / `.sh` with confirmation and single transaction
- [x] `docs/operations/backup-restore.md` with RPO 24h / RTO 4h and failure playbook
- [ ] Nightly timer/cron installed on the host
- [ ] Off-host copy configured (rclone/object storage)
- [ ] Restore drill completed and timed on staging
- [ ] PITR decision recorded (WAL archiving is off today)

## 6. Scalability and performance

- [x] PostgreSQL tuning flags (connections, buffers, slow query log,
      `pg_stat_statements`) — `compose.yaml`, `deploy/postgres/init/`
- [x] Connection pool sizing via `DB_POOL_*` — `backend/app/db/session.py`
- [x] Redis cache/broker with `allkeys-lru` and health check
- [x] Catalog/search indexes, including trigram GIN — migration `c1a2b3d4e5f6`
- [x] Online index script for busy databases — `deploy/sql/production-indexes-concurrent.sql`
- [x] k6 load profile with thresholds — `perf/k6/catalog.js`
- [x] Request IDs + duration logging — `backend/app/main.py`
- [ ] Baseline k6 run recorded on production-sized data
- [ ] Top 10 `pg_stat_statements` queries reviewed after launch

## 7. Testing

- [x] Unit/integration suite (Vitest) and Playwright journeys
- [x] API contract tests against frontend types — `backend/tests/test_contract.py`
- [x] Property-based tests (Hypothesis, fast-check)
- [x] Accessibility gate with axe — `src/test/a11y.test.tsx`
- [x] Mobile drop overlay regression — `e2e/mobile.spec.ts`
- [ ] Coverage threshold enforced (add `@vitest/coverage-v8` before enabling)
- [ ] Visual regression optional (Chromatic/Percy)

## 8. PostgreSQL on the existing server

- [x] Compose provisions PostgreSQL 17 with a named volume
- [x] Extensions: `pg_trgm`, `pg_stat_statements`, `uuid-ossp`
- [x] Migrations + idempotent seed run in the `migrate` service
- [x] UTC timezone and 250 ms slow-query logging
- [ ] External database path (if not using the Compose `db`): create role/db,
      set `DATABASE_URL`, enable `pg_hba.conf` for the app host
- [ ] `POSTGRES_PASSWORD` and `JWT_SECRET` replaced with random 40+ char values
- [ ] `BOOTSTRAP_ADMIN_*` removed after the first admin exists

## Sign-off commands

```bash
docker compose --env-file .env.production up -d --build
docker compose ps
curl -fsS https://<domain>/api/ready
curl -fsS https://<domain>/api/v1/products?pageSize=1
./scripts/backup-postgres.sh ./backups
k6 run -e BASE_URL=https://<domain> perf/k6/catalog.js
```
