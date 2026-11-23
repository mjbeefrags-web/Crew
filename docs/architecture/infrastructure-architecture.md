# Infrastructure Architecture

## Local target

Compose services: Nginx serving the multi-stage React build and proxying `/api`; FastAPI backend; PostgreSQL with named persistent volume; Redis for shared rate-limit/catalog-cache data. A worker is omitted until asynchronous work exists. Services use internal Compose DNS names. Only the proxy is published to the host; database and Redis ports remain internal by default. Health checks gate startup/readiness; migrations run as a controlled backend startup step.

## Reliability and security

Restart policies, bounded health checks, startup dependency conditions, non-root app containers, read-only/static frontend where practical, no hard-coded credentials, sample-only env file, and data-preserving `docker compose down`. Backup/restore commands are documented separately and never part of routine shutdown. Local Compose is not production hosting and does not expose the application publicly.

## Production boundary

Production provider selection, regional availability, billing eligibility and current prices require separate research. This task does not purchase, activate, register or deploy any service. See `docs/production/` for preparation and remaining owner decisions.
