# Docker workflow

The local Compose topology runs an Nginx static frontend/reverse proxy, FastAPI API, PostgreSQL, Redis and one-shot migration/seed service. Only the website port is published, bound to `127.0.0.1`. The API, database and Redis use the internal Compose network and service DNS names (`api`, `db`, `redis`).

## Start / inspect / stop

```powershell
Copy-Item .env.example .env
docker compose up --build -d
docker compose ps
docker compose logs -f
docker compose down
```

The first run builds the frontend and backend images, waits for PostgreSQL/Redis health, applies Alembic migrations, seeds the sample hoodie catalog, then starts the API and web services. The seed is idempotent. Routine `down` and `up` preserve named database and Redis volumes.

### Admin login on a fresh clone

`.env.example` ships a local-only bootstrap administrator:

| Email | Password |
|---|---|
| `admin@crewww.example.com` | `CrewwwOwner!2026` |

Copying `.env.example` to `.env` and starting the stack creates that account in
PostgreSQL on the first `migrate` run. Sign in at `http://127.0.0.1:8080/login`,
then open `/admin`. Change the password (or clear both variables and use
`python -m app.create_admin`) before sharing the stack. Staging/production
settings reject a non-empty bootstrap password.

Docker preview opens at `/` by default through `VITE_INITIAL_ROUTE`; set it to another route when the default is not wanted.

## Services and readiness

- `web`: Nginx SPA fallback, `/api/*` reverse proxy and `/healthz` health check. Published at `http://localhost:${WEB_PORT:-8080}`.
- `api`: FastAPI at internal port 8000, health checked through `/api/ready`.
- `migrate`: exits after `alembic upgrade head` and `python -m app.seed`.
- `db`: PostgreSQL 17 with persistent `postgres_data` volume and `pg_isready` check.
- `redis`: Redis 7 with AOF and persistent `redis_data` volume; Compose health check uses `redis-cli ping`.

There is no worker or scheduler: no implemented job currently needs one. Redis is used for shared login throttling and is required by the Compose configuration.

## Environment variables

Copy `.env.example` to `.env`. Values are local-only placeholders. Compose reads database credentials, port, CORS origin, JWT secret, optional bootstrap admin and adapter settings there. Do not reuse those defaults outside this isolated loopback-bound development stack. Staging/production settings validate a high-entropy JWT secret, PostgreSQL, secure cookies, non-debug operation, explicit CORS origins and no bootstrap admin password.

The PostgreSQL password in this initial Compose contract should use letters and digits to avoid URI-encoding ambiguity in `DATABASE_URL`. The API only reads secrets in the backend container; no secret is built into the browser bundle or diagnostics response.

## Persistence and recovery

`docker compose down` keeps both named volumes. To back up the local PostgreSQL database while the stack is running:

```powershell
docker compose exec -T db pg_dump -U crewww crewww > crewww-backup.sql
```

Restore into the same development database after taking a separate backup:

```powershell
Get-Content .\crewww-backup.sql | docker compose exec -T db psql -U crewww -d crewww
```

These commands assume the default database/user. Substitute the configured values if changed. No backup is created automatically; keep backup files private and outside the Git workspace.

## Troubleshooting

- `web` stays unhealthy: inspect `docker compose logs web api`; confirm port 8080 is available.
- Migration fails: inspect `docker compose logs migrate db`; check credentials and DB health. The named DB volume is retained when containers are stopped.
- API readiness fails: inspect `docker compose logs api redis db` and verify service DNS/config values.
- Admin login unavailable: set `BOOTSTRAP_ADMIN_EMAIL` and a strong temporary `BOOTSTRAP_ADMIN_PASSWORD` before the first run; after startup, clear the password in `.env` and recreate the one-shot migration container to remove it from its environment. Rotate the account password through a future admin credential workflow before shared use.
- Clean local reset is destructive: `docker compose down -v` removes persistent data. Use only when you intentionally want to erase the local database/cache.

## Current verification boundary

Docker and Compose CLIs are installed in the current environment, but the Docker Engine is not currently reachable. Container builds, health checks, PostgreSQL persistence and full-stack clean-deployment verification therefore remain unverified until the daemon is available.
