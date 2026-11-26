# Local development (Docker or your own Postgres)

## Option A — Docker (recommended)

```bash
docker compose up -d --build
# open http://localhost:8080
docker compose logs -f
docker compose down
```

Compose starts Postgres 17, Redis 7, a one-shot migration/seed service, the
FastAPI service and the nginx web service. `VITE_INITIAL_ROUTE=/` shows the
showroom; set it to a drop slug only to preview that drop as the landing page.

## Option B — Postgres and Redis installed on the host

You said you will install Postgres. Create a database and a user, then point the
API at it with a `DATABASE_URL` using the asyncpg driver:

```bash
# PowerShell example
$env:DATABASE_URL = "postgresql+asyncpg://crewww:YOUR_PASSWORD@127.0.0.1:5432/crewww"
$env:REDIS_URL = "redis://127.0.0.1:6379/0"
$env:REDIS_REQUIRED = "false"   # set true once Redis is running
$env:JWT_SECRET = "a-long-random-secret-at-least-40-characters-123456"
```

If Redis is not running yet, leave `REDIS_URL` empty and `REDIS_REQUIRED=false`:
catalog caching falls back to a process-local TTL cache, so the API still works.

Run the backend from `backend/` using the existing virtual environment:

```bash
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Run the web app in a second terminal:

```bash
npm run dev
```

The web dev server normally uses port 5173 and reads its API base from
`VITE_API_BASE_URL`. For a same-origin local API use
`VITE_API_BASE_URL=http://127.0.0.1:8000`; for Docker keep it empty and let nginx
proxy `/api/` to the API service.

## Verify the stack

```bash
curl.exe http://127.0.0.1:8080/api/ready     # {"status":"ready"} in Docker
npm run typecheck && npm run lint && npm test -- --run
cd backend && .\.venv\Scripts\python.exe -m pytest -q
```

## What is authoritative

- **Postgres** — orders, variants, stock, customers, migrations. Source of truth.
- **Redis** — read-through catalog cache and auth rate limits. A cache miss never
  changes data. Admin mutations invalidate catalog keys.
- **nginx** — public entry point, gzip, immutable cache headers for hashed assets.
- **Admin advisor** — RAG over a bundled playbook, advisory only; see
  [ai-advisor.md](../ai-advisor.md).
