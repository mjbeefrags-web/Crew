# PostgreSQL in Docker

The Compose stack ships PostgreSQL 17 as the `db` service. The API talks to it
over the private Compose network; the host can reach it on a loopback-only port
for `psql`, pgAdmin, or DBeaver. No PostgreSQL installation is required on the
host.

```
host                          Docker network (internal)
┌────────────────────┐        ┌─────────────────────────────┐
│ psql / pgAdmin     │        │  web (nginx)                │
│ 127.0.0.1:5433 ────┼───────▶│  api (FastAPI) ──▶ db:5432  │
└────────────────────┘        │  migrate (alembic + seed)   │
                              │  redis                      │
                              └─────────────────────────────┘
```

## What the service defines

`compose.yaml` starts `postgres:17-alpine` with:

| Setting | Default | Env variable |
|---|---|---|
| Database | `crewww` | `POSTGRES_DB` |
| User | `crewww` | `POSTGRES_USER` |
| Password | `local-only-change-me-123456` | `POSTGRES_PASSWORD` |
| Host port | `127.0.0.1:5433` | `POSTGRES_PORT` |
| Data volume | `postgres_data` | — |
| Init scripts | `deploy/postgres/init/` | — |

The init scripts run **once, on an empty volume**, and install `pg_trgm`,
`pg_stat_statements`, and `uuid-ossp`, plus set the database timezone to UTC.
The API connects with `postgresql+asyncpg://...@db:5432/...`; `db` is the
Compose service name and must not be replaced with `localhost` inside a
container.

## Start it

```powershell
Copy-Item .env.example .env
docker compose up -d db
docker compose ps db
docker compose logs -f db
```

Wait for `healthy`:

```powershell
docker compose ps db
# NAME ... STATUS: Up (healthy)
```

Start the rest of the stack (migrations and seed run automatically):

```powershell
docker compose up -d --build
```

## Connect from the host

Your installed PostgreSQL client can reach the container on port `5433`:

```powershell
psql -h 127.0.0.1 -p 5433 -U crewww -d crewww
```

```bash
# macOS / Linux
psql "postgresql://crewww:local-only-change-me-123456@127.0.0.1:5433/crewww"
```

GUI clients use the same values:

| Field | Value |
|---|---|
| Host | `127.0.0.1` |
| Port | `5433` |
| Database | `crewww` |
| User | `crewww` |
| Password | value of `POSTGRES_PASSWORD` |

If port `5433` is already taken, change `POSTGRES_PORT` in `.env` and restart
the service:

```powershell
docker compose up -d db
```

## Connect from inside the stack

Run `psql` in the database container without exposing a port:

```powershell
docker compose exec db psql -U crewww -d crewww
```

Useful commands:

```sql
\dt                      -- tables
\d products              -- columns, indexes, constraints
\di                      -- indexes
SELECT count(*) FROM products;
SELECT slug, name FROM products ORDER BY created_at LIMIT 5;
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

Run a SQL file from the host:

```powershell
Get-Content .\deploy\sql\production-indexes-concurrent.sql |
  docker compose exec -T db psql -U crewww -d crewww
```

Run a one-off query from the API container:

```powershell
docker compose exec api python -c "import asyncio, asyncpg; ..."
```

Prefer `psql` for ad-hoc work and the application/migrations for schema changes.

## Migrations and seed

The one-shot `migrate` service runs:

```bash
alembic upgrade head
python -m app.seed
```

Run it again after pulling changes:

```powershell
docker compose run --rm migrate
```

Check the schema matches the models:

```powershell
docker compose run --rm --entrypoint alembic migrate check
```

The seed is idempotent. It creates the catalog and, on a fresh database, the
bootstrap admin from `.env` (`admin@crewww.example.com` by default). It never
resets an existing admin password; use `python -m app.create_admin --force`.

## Persistence and resets

Data lives in the `postgres_data` volume, so `docker compose down` keeps it.

```powershell
# Stop and remove containers but keep data
docker compose down

# Destructive: delete the database volume too
docker compose down -v
```

Use `down -v` only when you intentionally want a clean database; it re-runs the
init scripts and seed on the next start.

## Backups

The backup scripts use `pg_dump` inside the running container:

```powershell
./scripts/backup-postgres.ps1 -OutputDir .\backups
```

```bash
./scripts/backup-postgres.sh ./backups
```

Restore with the matching script. See
[backup-restore.md](backup-restore.md) for retention, RPO/RTO, and the restore
drill.

## Performance checks

The database starts with `pg_stat_statements` preloaded. Slow queries over
`POSTGRES_SLOW_QUERY_MS` (default 250 ms) appear in the logs:

```powershell
docker compose logs db | Select-String "duration:"
```

Inspect the heaviest statements:

```sql
SELECT calls,
       round(mean_exec_time::numeric, 2) AS avg_ms,
       round(total_exec_time::numeric, 2) AS total_ms,
       query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 15;
```

Apply the online index script on a busy database:

```powershell
Get-Content .\deploy\sql\production-indexes-concurrent.sql |
  docker compose exec -T db psql -U crewww -d crewww
```

## Using your installed PostgreSQL instead

The container is the default. To use a PostgreSQL server you installed on the
host or another machine, set `DATABASE_URL` in `.env` and run migrations against
it:

```dotenv
DATABASE_URL=postgresql+asyncpg://crewww:password@host.docker.internal:5432/crewww
```

- `host.docker.internal` works on Docker Desktop. On Linux, use the host bridge
  IP (usually `172.17.0.1`) or add an `extra_hosts` entry.
- The database and role must already exist; see
  [production-checklist.md](production-checklist.md#using-an-existing-postgresql-server).
- The bundled `db` container still starts because other services depend on it.
  You can leave it idle, or remove the `db` service and the `depends_on` entries
  for a fully external database.
- Production validation requires `postgresql+asyncpg://`, so use the asyncpg
  driver, not `postgresql://`.

## Production notes

- Replace `POSTGRES_PASSWORD` with a long random value and keep `.env` out of
  git.
- Keep the published port loopback-only. Do not expose `5432`/`5433` publicly;
  the TLS reverse proxy only needs `web`.
- For a managed or remote database, enable TLS in the URL and restrict
  `pg_hba.conf` to the application host.
- Size `DB_POOL_SIZE` + `DB_MAX_OVERFLOW` per API worker so the total stays below
  `POSTGRES_MAX_CONNECTIONS`.
- Take and verify backups on a schedule. A container volume is not a backup.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `port is already allocated` | Another PostgreSQL owns the port. Change `POSTGRES_PORT` in `.env`, then `docker compose up -d db`. |
| `password authentication failed` | The volume was created with an older `POSTGRES_PASSWORD`. Either use the old password or reset the volume (destructive). |
| Init scripts did not run | They only run on an empty volume. Use `docker compose down -v` for a local reset. |
| API cannot connect | Inside Compose the host is `db`, not `localhost`. Check `docker compose logs api db` and `docker compose ps`. |
| `pg_stat_statements` missing | The extension is created by the init script and requires `shared_preload_libraries`; both are configured. Recreate the volume if the database predates them. |
| Database is unhealthy | `docker compose logs db`; check disk space and `POSTGRES_MAX_CONNECTIONS`. |
