# Operations

Runbooks for the production environment.

| Document | Use it when |
|---|---|
| [ci-cd.md](ci-cd.md) | Changing pipelines, cutting a release, rolling back |
| [postgres-docker.md](postgres-docker.md) | Connecting to the database, migrations, resets, DB tools |
| [backup-restore.md](backup-restore.md) | Scheduling backups, restoring data, DR drill |
| [database-handoff.md](database-handoff.md) | Database audit findings, gaps for frontend/backend, mirror usage |
| [domain-tls.md](domain-tls.md) | Pointing DNS, issuing certificates, tightening headers |
| [production-checklist.md](production-checklist.md) | Preparing a go-live or an infrastructure review |

Related:

- `DOCKER.md` — one-command local stack
- `DEPLOYMENT.md` — deployment notes
- `docs/production/` — historical audits and readiness notes
- `perf/README.md` — k6 load testing
