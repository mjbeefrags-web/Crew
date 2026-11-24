# Crewww storefront

React/Vite storefront and FastAPI commerce API for the Crewww fashion showroom. The app now supports a local Docker Compose stack with PostgreSQL, Redis, migrations, a seed catalog and an Nginx reverse proxy. Payment and email integrations are intentionally simulated; this repository is not cleared for live commerce or public deployment.

## Start the full local stack

Requirements: Docker Desktop (or Docker Engine) with Compose v2. No host Python, Node, PostgreSQL or Redis install is needed.

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

Open [http://localhost:8080](http://localhost:8080). By default Docker opens the site at `/`; set `VITE_INITIAL_ROUTE` in `.env` to change it. The port is bound to loopback only. Compose runs Alembic migrations and an idempotent development seed before starting the API and website.

```powershell
docker compose ps
docker compose logs -f
docker compose down
```

`docker compose down` preserves PostgreSQL and Redis named volumes. To remove local data, that requires an explicit `docker compose down -v` command; do not use it if data should be kept.

See [DOCKER.md](./DOCKER.md), [DEPLOYMENT.md](./DEPLOYMENT.md) and [docs/project-status.md](./docs/project-status.md) for configuration, operations and implementation boundaries.

## Run frontend without Docker

Requires Node.js 20.19+ and npm. In the Codex portable runtime, use the node runtime path documented in the existing project setup or provide Node/npm on `PATH`.

```powershell
npm ci
npm run dev
```

Set `VITE_DATA_MODE=api` and `VITE_API_BASE_URL` to use the API from a separately started backend; otherwise, frontend preview mode uses the explicit mock adapters.

## Backend development

Requires Python 3.12 or 3.13 and PostgreSQL for parity with the container deployment. A local SQLite URL is provided for isolated API tests.

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

The backend tests use an in-memory SQLite database:

```powershell
python -m pytest tests -q
ruff check app tests alembic
```

## Current boundaries

- The supplied `docs/material/` images inform the product catalog. Seeded prices, sizes, stock, fit and material statements are development values, not approved inventory data.
- The current admin bootstrap is optional through `.env`; its password must be removed from the environment after initial setup.
- Payments are mocked; no payment credentials are present or used.
- Email uses a safe console sink; it does not deliver messages.
- Product imagery is bundled with the frontend; uploads and external object storage are not implemented.
- Password recovery and email verification are not implemented.
- AI functions, real fulfillment, production deployment and external hosting remain future work.

## Project documentation

- [Architecture decisions](./docs/architecture/technical-decisions.md)
- [Backend architecture](./docs/architecture/backend-architecture.md)
- [Milestones](./docs/milestones.md)
- [Production audit](./docs/production/production-audit.md)
- [M2.1 showroom QA](./docs/showroom-qa.md)
