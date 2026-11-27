# Crewww storefront

React 19 + Vite storefront with a FastAPI commerce API, PostgreSQL, Redis,
Nginx, Docker Compose, migrations and an idempotent demo seed. Payments and
email are intentionally mocked; this is a production-shaped demo, not a live
commerce deployment.

## Stack

| Layer | Technology |
|---|---|
| Storefront | React 19, TypeScript, Vite, React Router, TanStack Query |
| API | FastAPI, SQLAlchemy async, asyncpg, Alembic |
| Database | PostgreSQL 17 (Docker), Redis 7 |
| Delivery | Nginx multi-stage image, Docker Compose |
| Tests | Vitest + Testing Library, axe, fast-check, Playwright, pytest, Hypothesis |

## Before you run (checklist)

You only need **Docker Desktop**. Do not install Node, Python, PostgreSQL or
Redis on the host for this workflow.

| Requirement | Check | If it fails |
|---|---|---|
| Docker Desktop installed and **running** | `docker version` prints a `Server` version | Open Docker Desktop and wait for **Engine running** |
| Compose v2+ | `docker compose version` | Update Docker Desktop |
| Windows WSL 2 backend | Docker Desktop → Settings → General | Enable **Use the WSL 2 based engine** |
| 4 GB+ free RAM | Task Manager | Close heavy apps before the first build |
| Port `8080` free (site) | `Get-NetTCPConnection -LocalPort 8080` returns nothing | Set `WEB_PORT=8081` in `.env` |
| Port `5433` free (DB tools) | `Get-NetTCPConnection -LocalPort 5433` returns nothing | Set `POSTGRES_PORT=5434` in `.env` |

> **Your installed PostgreSQL is not required and must not be running on `5432`
> for this stack.** Docker starts its own PostgreSQL 17. The app reaches it on
> the internal `db:5432`; your `psql`/pgAdmin/DBeaver connect on
> `127.0.0.1:5433`. A local PostgreSQL can stay on `5432` without conflict.

## Quick start (one command)

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

The defaults work for a local demo. First run takes a few minutes (image build);
later runs take seconds. `migrate` applies Alembic migrations and seeds the
catalog plus the bootstrap administrator before the API starts.

Wait for every service to report **healthy**:

```powershell
docker compose ps
```

Then open:

- Storefront: [http://localhost:8080](http://localhost:8080)
- Admin: [http://localhost:8080/admin](http://localhost:8080/admin)
- Login: [http://localhost:8080/login](http://localhost:8080/login)
- API health: [http://localhost:8080/api/health](http://localhost:8080/api/health)
- API readiness: [http://localhost:8080/api/ready](http://localhost:8080/api/ready)

### Optional: start + wait in one step

The starter script checks Docker, creates `.env` if missing, starts the stack,
and waits for `/api/ready`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start.ps1
```

### What to configure before sharing or deploying

Edit `.env`:

| Variable | Why |
|---|---|
| `POSTGRES_PASSWORD` | Replace the local placeholder |
| `JWT_SECRET` | 40+ random characters; production requires it |
| `WEB_HOST` | `127.0.0.1` for this laptop only, `0.0.0.0` for LAN clients |
| `FRONTEND_ORIGINS` | Every exact origin clients use, including port |
| `COOKIE_SECURE` | `false` for plain HTTP LAN demos, `true` behind HTTPS |
| `BOOTSTRAP_ADMIN_PASSWORD` | Change it, or clear both `BOOTSTRAP_ADMIN_*` and create an admin with the CLI |

Use `.env.production.example` as the deployment template. Production validates a
40+ character `JWT_SECRET`, PostgreSQL via asyncpg, `COOKIE_SECURE=true`, Redis,
explicit origins, and rejects a non-empty bootstrap admin password.

### Admin login

`.env.example` ships a local-only bootstrap administrator:

| Field | Value |
|---|---|
| Email | `admin@crewww.example.com` |
| Password | `CrewwwOwner!2026` |

The account is created in PostgreSQL on the first `migrate` run. Change the
password before sharing the stack, or clear both `BOOTSTRAP_ADMIN_*` variables
and create one with:

```powershell
docker compose exec api python -m app.create_admin `
  --email owner@crewww.example.com --password "your-password"
```

Staging and production reject a non-empty bootstrap password. See
[docs/operations/admin-user.md](./docs/operations/admin-user.md).

### If it does not start

| Symptom | Fix |
|---|---|
| `failed to connect to the docker API` | Start Docker Desktop and wait for **Engine running** |
| `port is already allocated` | Change `WEB_PORT` or `POSTGRES_PORT` in `.env`, then `docker compose up -d` |
| `web` is unhealthy | `docker compose logs web`; rebuild with `docker compose up -d --build web` |
| `api` is unhealthy | `docker compose logs migrate api`; confirm `migrate` exited `0` |
| `password authentication failed` | The volume kept an older password. Use the old value, or `docker compose down -v` (destroys data) |
| Admin login fails after pulling | `docker compose run --rm migrate` to create the bootstrap admin in the existing volume |
| `psql` is not recognized | Use `docker compose exec db psql -U crewww -d crewww`, or add `C:\Program Files\PostgreSQL\<version>\bin` to `PATH` |

## Deploy to Cloudflare + Railway + Neon + Upstash

This project uses a hybrid deployment model:

- **Frontend:** Cloudflare Workers/Pages (static Vite assets, free tier)
- **Backend:** Railway (FastAPI in Docker, no card required for the trial)
- **Database:** Neon (hosted PostgreSQL, free tier)
- **Cache:** Upstash (hosted Redis, free tier)

The repo includes `wrangler.jsonc` for the Cloudflare frontend and
`vercel.json` / `render.yaml` as alternative deployment configs. Railway is the
documented backend path because Render requires payment information.

### Frontend: Cloudflare

Install Wrangler and sign in. It opens your browser for Cloudflare OAuth.

```powershell
npm i -g wrangler
wrangler login
```

`VITE_*` values are inlined at build time. Set them before building:

```powershell
$env:VITE_DATA_MODE = 'api'
$env:VITE_API_BASE_URL = 'https://crewww-api-production.up.railway.app'
$env:VITE_INITIAL_ROUTE = '/'
$env:VITE_FEATURE_RECENTLY_VIEWED = 'true'
$env:VITE_FEATURE_COMMAND_PALETTE = 'true'
$env:VITE_FEATURE_AMBIENT_SOUND = 'true'
$env:VITE_FEATURE_WORLD_WALK = 'true'
```

Then deploy:

```powershell
npm run deploy
```

`npm run deploy` runs `npm run build` followed by `wrangler deploy`.
`wrangler.jsonc` configures the Worker's static assets and SPA fallback. The
current production URL is:

```text
https://crewww-storefront.crewww-storefront.workers.dev
```

Rebuild and redeploy whenever `VITE_API_BASE_URL` changes.

### Backend: Railway

Install the CLI and sign in. Railway opens your browser for GitHub OAuth; no
card is required for the trial.

```powershell
npm i -g @railway/cli
railway login
cd backend
railway init --name crewww-api
railway up --detach
railway domain
```

`railway up` detects `backend/Dockerfile`. Set `PORT=8000` because the Dockerfile
binds Uvicorn to port 8000. Then set the service variables:

| Variable | Value | Source |
|---|---|---|
| `APP_ENV` | `production` | — |
| `DEBUG` | `false` | — |
| `COOKIE_SECURE` | `true` | — |
| `DATABASE_URL` | pooled Neon URL (`...-pooler...`) | Neon (see below) |
| `DATABASE_URL_UNPOOLED` | direct Neon URL | Neon (see below) |
| `REDIS_URL` | `rediss://default:<token>@<host>.upstash.io:6379` | Upstash (see below) |
| `REDIS_REQUIRED` | `true` | — |
| `JWT_SECRET` | 40+ random characters | Generate with `openssl rand -hex 32` |
| `FRONTEND_ORIGINS` | `https://crewww-storefront.crewww-storefront.workers.dev` | Your Cloudflare URL |
| `PAYMENT_MODE` | `mock` | — |
| `EMAIL_MODE` | `console` | — |
| `AI_PROVIDER` | `local` | — |
| `AI_MODEL` | `gpt-4o-mini` | — |
| `PORT` | `8000` | Matches Dockerfile |

Example with the CLI (repeat for each variable):

```powershell
railway variable set APP_ENV=production
railway variable set DATABASE_URL="<pooled-url>"
railway redeploy --yes
```

The admin account already exists in Neon, so no bootstrap password is needed.
The migrations were applied directly to Neon with Alembic before the first
deploy. To create or reset an admin later, use `python -m app.create_admin` in
`railway ssh`.

> The app reads `DATABASE_URL`, **not** `POSTGRES_URL`. The API uses Neon's
> pooled URL; Alembic migrations use `DATABASE_URL_UNPOOLED`. Both accept
> Neon's `postgresql://` strings and are normalized to `postgresql+asyncpg://`.
> Neon's `sslmode` is translated to asyncpg's `ssl`, and `channel_binding` is
> removed because asyncpg does not support it.
> Production validation requires that driver, `COOKIE_SECURE=true`,
> `REDIS_REQUIRED=true` with a `REDIS_URL`, a 40+ character `JWT_SECRET`, and an
> empty bootstrap password.

### Database: Neon

Neon is already linked through `neon.ts` and `.neon`. To provision the declared
services and pull the branch credentials into the existing `.env`:

```powershell
npx neon@latest login
npx neon@latest deploy
```

`neon deploy` writes two values:

| Variable | Use |
|---|---|
| `DATABASE_URL` | Pooled connection (`-pooler` host) for the running API |
| `DATABASE_URL_UNPOOLED` | Direct connection for Alembic migrations |

The backend accepts either Neon's `postgresql://` format or
`postgresql+asyncpg://` and normalizes both to SQLAlchemy's asyncpg driver.
Add both values to Railway. Never run migrations through the pooled URL.

If you prefer the dashboard, create a free project at neon.tech and copy both
connection strings from **Connection Details**.

### Cache: Upstash

1. Create a Redis database at upstash.com (free tier, no card), or create a
   temporary one without signing in:

   ```powershell
   Invoke-RestMethod -Method Post -Uri 'https://upstash.com/start-redis' `
     -Headers @{ 'Idempotency-Key' = [guid]::NewGuid().ToString() }
   ```

   The response includes a console URL to claim the database. Temporary
   databases expire after 3 days, so claim it for long-term use.
2. Copy the Redis URL (`rediss://...` for TLS).
3. Add it to Railway as the `REDIS_URL` env var, and set `REDIS_REQUIRED=true`.

### Wiring it all together

| Service | URL | Where to configure |
|---|---|---|
| Cloudflare frontend | `https://crewww-storefront.crewww-storefront.workers.dev` | `VITE_API_BASE_URL` at build time = Railway URL |
| Railway backend | `https://crewww-api-production.up.railway.app` | `FRONTEND_ORIGINS` in Railway = Cloudflare URL |
| Neon PostgreSQL | pooled + direct URLs | `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in Railway |
| Upstash Redis | `rediss://...` | `REDIS_URL` in Railway |

After both deploys, open the Cloudflare URL. The frontend calls the Railway
API, which reads Neon PostgreSQL and caches through Upstash Redis.

## GitHub auto-deploy and service communication

Every push to `main` runs `.github/workflows/ci-deploy.yml`:

1. Frontend checks: `npm ci`, typecheck, Vitest, production build.
2. Backend checks: pytest and Ruff.
3. Deploys: `railway up` for the API, `wrangler deploy` for the storefront.
4. Live verification: smoke tests against the deployed API and frontend.

Pull requests run checks only; they never deploy.

```text
Browser
  -> Cloudflare Worker (static React app + hashed JS bundle)
  -> fetch(VITE_API_BASE_URL) with credentials
  -> Railway FastAPI
  -> SQLAlchemy/asyncpg -> Neon PostgreSQL
  -> redis asyncio      -> Upstash Redis

GitHub Actions
  -> Railway CLI  -> deploy backend
  -> Wrangler     -> deploy frontend
```

`VITE_*` values are compiled into the frontend bundle at build time, so the
workflow sets `VITE_API_BASE_URL` before `npm run build`. The API only accepts
browser calls from the comma-separated origins in `FRONTEND_ORIGINS`. The
Cloudflare URL is set there so CORS and credentialed cookies work.

### GitHub secrets to add

In the GitHub repo, go to **Settings → Secrets and variables → Actions → New
repository secret**:

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy permission. Create it in Cloudflare → My Profile → API Tokens → **Edit Cloudflare Workers**. |
| `RAILWAY_TOKEN` | Railway **project token** for the production environment. Create it in Railway project → Settings → Tokens. |
| `LIVE_ADMIN_EMAIL` | Optional: enables the live admin-login test. |
| `LIVE_ADMIN_PASSWORD` | Optional: enables the live admin-login test. |

Optional repository variables with safe defaults are `VITE_API_BASE_URL`,
`LIVE_API_URL`, `FRONTEND_ORIGIN`, `LIVE_FRONTEND_URL`, and
`RAILWAY_SERVICE_ID`. The Cloudflare account ID is already in
`wrangler.jsonc`.

### Communication tests

- `src/config/runtime.test.ts` verifies the frontend strips trailing slashes
  from the API URL and defaults to mock mode.
- `backend/tests/test_contract.py` verifies API payloads match the frontend
  types without needing hosted services.
- `backend/tests/test_live_communication.py` verifies the deployed boundaries:
  health, catalog, CORS, admin login (when secrets exist), and that the live
  Cloudflare bundle points at the live Railway API.

Run the live tests locally with:

```powershell
$env:LIVE_API_URL = 'https://crewww-api-production.up.railway.app'
$env:FRONTEND_ORIGIN = 'https://crewww-storefront.crewww-storefront.workers.dev'
cd backend
python -m pytest -q tests/test_live_communication.py
```

## Show it to clients on your Wi-Fi

By default the site is bound to `127.0.0.1`, so only this laptop can open it.
To let clients on the same network use it:

1. Find your laptop's LAN address:

   ```powershell
   ipconfig
   ```

   Use the IPv4 address of the active Wi-Fi/Ethernet adapter, for example
   `192.168.1.50`.

2. Edit `.env`:

   ```dotenv
   WEB_HOST=0.0.0.0
   FRONTEND_ORIGINS=http://localhost:8080,http://127.0.0.1:8080,http://192.168.1.50:8080
   ```

3. Recreate the web and API containers:

   ```powershell
   docker compose up -d --build
   ```

4. Allow Docker through Windows Firewall when prompted, then open
   `http://192.168.1.50:8080` from the client laptop or phone.

Notes:

- `FRONTEND_ORIGINS` must include the exact origin clients use, including the
  port. Auth requests reject unknown origins.
- Keep `COOKIE_SECURE=false` for plain HTTP on the LAN. Use HTTPS for anything
  beyond a trusted local demo.
- Do not port-forward this stack to the public internet: payments are mocked and
  the TLS/proxy setup is documented but not enabled by default.
- Revert `WEB_HOST=127.0.0.1` when the demo is over.

## Everyday commands

```powershell
docker compose ps                  # status
docker compose logs -f             # all logs
docker compose logs -f api web     # API + site
docker compose up -d --build       # rebuild after code/env changes
docker compose restart api         # restart one service
docker compose down                # stop, keep data
docker compose down -v             # stop and erase local database/cache
```

Rebuild the web image after changing `VITE_*` variables:

```powershell
docker compose up -d --build web
```

## PostgreSQL in Docker

PostgreSQL 17 runs as the `db` service. Data lives in the `postgres_data`
volume. The API uses the internal address `db:5432`; host tools use a
loopback-only port.

| Setting | Default |
|---|---|
| Host | `127.0.0.1` |
| Port | `5433` (`POSTGRES_PORT`) |
| Database | `crewww` |
| User | `crewww` |
| Password | `POSTGRES_PASSWORD` from `.env` |

Connect with your installed PostgreSQL client:

```powershell
psql -h 127.0.0.1 -p 5433 -U crewww -d crewww
```

Or from inside Docker:

```powershell
docker compose exec db psql -U crewww -d crewww
```

Useful SQL:

```sql
\dt
\d products
SELECT count(*) FROM products;
SELECT slug, name FROM products ORDER BY created_at LIMIT 5;
```

GUI clients (pgAdmin, DBeaver) use the same host/port/database/user values.
Port `5433` avoids clashing with a PostgreSQL installation already using
`5432`.

Migrations and seed:

```powershell
docker compose run --rm migrate
docker compose run --rm --entrypoint alembic migrate check
```

Backups:

```powershell
./scripts/backup-postgres.ps1 -OutputDir .\backups
./scripts/restore-postgres.ps1 -Dump .\backups\daily\<file>.dump
```

Full details: [docs/operations/postgres-docker.md](./docs/operations/postgres-docker.md)
and [docs/operations/backup-restore.md](./docs/operations/backup-restore.md).

### Use your installed PostgreSQL instead

Set `DATABASE_URL` in `.env` and run migrations against it:

```dotenv
DATABASE_URL=postgresql+asyncpg://crewww:password@host.docker.internal:5432/crewww
```

On Docker Desktop, `host.docker.internal` reaches the host. On Linux use the
host bridge IP (usually `172.17.0.1`) or add an `extra_hosts` entry. The
database and role must already exist; see
[docs/operations/production-checklist.md](./docs/operations/production-checklist.md#using-an-existing-postgresql-server).

## Configuration

Copy `.env.example` to `.env`. Important variables:

| Variable | Purpose | Default |
|---|---|---|
| `WEB_HOST` | Bind address for the site | `127.0.0.1` |
| `WEB_PORT` | Host port for the site | `8080` |
| `POSTGRES_PORT` | Host port for database tools | `5433` |
| `POSTGRES_DB` / `POSTGRES_USER` | Database name/user | `crewww` |
| `POSTGRES_PASSWORD` | Database password | local placeholder |
| `JWT_SECRET` | Access-token signing key | local placeholder |
| `FRONTEND_ORIGINS` | Comma-separated allowed browser origins | localhost/127.0.0.1 |
| `COOKIE_SECURE` | Secure refresh cookie flag | `false` locally |
| `BOOTSTRAP_ADMIN_EMAIL/PASSWORD` | First admin, created by seed | demo admin |
| `VITE_INITIAL_ROUTE` | Default route opened by Docker | `/` |
| `VITE_FEATURE_*` | Build-time feature flags | all `true` |

Feature flags: `VITE_FEATURE_RECENTLY_VIEWED`, `VITE_FEATURE_COMMAND_PALETTE`,
`VITE_FEATURE_AMBIENT_SOUND`, `VITE_FEATURE_WORLD_WALK`.

Staging/production templates: `.env.staging.example`,
`.env.production.example`. Production validation requires a 40+ character
`JWT_SECRET`, PostgreSQL via asyncpg, `COOKIE_SECURE=true`, Redis, explicit
origins and no bootstrap admin password.

## Local development without Docker

### Frontend

Requires Node.js 20.19+.

```powershell
npm ci
npm run dev
```

The dev server uses the mock adapters by default. To use the API, set
`VITE_DATA_MODE=api` and `VITE_API_BASE_URL=http://127.0.0.1:8000` before
starting Vite.

### Backend

Requires Python 3.12/3.13. SQLite is the default for isolated local work; use
PostgreSQL for parity.

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

The backend reads the root `.env` as well as `backend/.env`, so the bootstrap
admin and other settings work from either directory.

### Tests

```powershell
npm run typecheck
npm run lint
npm test -- --run
npm run build

cd backend
ruff check .
pytest -q
```

End-to-end (Playwright, Chromium):

```powershell
npx playwright install chromium
npm run test:e2e
```

## Health and smoke checks

```powershell
curl.exe -fsS http://localhost:8080/api/health
curl.exe -fsS http://localhost:8080/api/ready
curl.exe -fsS "http://localhost:8080/api/v1/products?pageSize=1"
```

Expected: `{"status":"healthy",...}`, `{"status":"ready"}`, and a product page
payload. If readiness fails, check `docker compose ps` and
`docker compose logs api db redis`.

Load test (optional, needs k6):

```powershell
k6 run -e BASE_URL=http://127.0.0.1:8080 perf/k6/catalog.js
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `port is already allocated` | Change `WEB_PORT` (site) or `POSTGRES_PORT` (database) in `.env`, then `docker compose up -d`. |
| Clients cannot open the LAN URL | Set `WEB_HOST=0.0.0.0`, add their exact origin to `FRONTEND_ORIGINS`, allow Docker in Windows Firewall, and use the laptop's LAN IP. |
| Admin login fails after pulling | Run `docker compose run --rm migrate` to create the bootstrap admin in an existing volume. |
| Database password/auth errors | The volume keeps the password used at creation. Use the old value or reset with `docker compose down -v` (destructive). |
| Init SQL did not run | Init scripts only run on an empty volume. |
| API cannot reach PostgreSQL | Inside Compose the host is `db`, not `localhost`. |
| 3D/showroom is slow on a client laptop | Enable browser hardware acceleration and close heavy tabs; the showroom is the heaviest route. |
| Docker daemon not running | Start Docker Desktop, then retry. |

## Documentation

- [Docker workflow](./DOCKER.md)
- [Deployment notes](./DEPLOYMENT.md)
- [PostgreSQL in Docker](./docs/operations/postgres-docker.md)
- [Admin accounts](./docs/operations/admin-user.md)
- [Backups and disaster recovery](./docs/operations/backup-restore.md)
- [Domain, DNS and TLS](./docs/operations/domain-tls.md)
- [CI/CD and releases](./docs/operations/ci-cd.md)
- [Production checklist](./docs/operations/production-checklist.md)
- [Architecture decisions](./docs/architecture/technical-decisions.md)
- [Backend architecture](./docs/architecture/backend-architecture.md)
- [Production audit](./docs/production/production-audit.md)
- [Performance tests](./perf/README.md)

## Current boundaries

- Prices, sizes, stock, fit and material statements are development data.
- Payments are mocked; no live payment credentials are used.
- Email uses a console sink and does not deliver messages.
- Product images and fonts are bundled; uploads/object storage are not
  implemented.
- Password recovery and email verification are not implemented.
- Public hosting requires TLS, real secrets, backups and a payment/email
  provider; see the production checklist.
