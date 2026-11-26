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

## Quick start

Requirements: Docker Desktop (or Docker Engine) with Compose v2. No host Node,
Python, PostgreSQL or Redis is required.

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
```

Wait for `db`, `redis`, `api` and `web` to report healthy. The one-shot
`migrate` service applies Alembic migrations and seeds the demo catalog plus the
bootstrap administrator before the API starts.

Open:

- Storefront: [http://localhost:8080](http://localhost:8080)
- Admin: [http://localhost:8080/admin](http://localhost:8080/admin)
- Login: [http://localhost:8080/login](http://localhost:8080/login)
- API health: [http://localhost:8080/api/health](http://localhost:8080/api/health)
- API readiness: [http://localhost:8080/api/ready](http://localhost:8080/api/ready)

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
[docs/operations/ci-cd.md#admin-accounts](./docs/operations/ci-cd.md#admin-accounts).

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
- [Admin accounts](./docs/operations/ci-cd.md#admin-accounts)
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
