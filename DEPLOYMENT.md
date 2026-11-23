# Deployment preparation

## Local Compose

Follow [DOCKER.md](./DOCKER.md) for the one-command local application. The Compose file binds the website to localhost only and must not be treated as an internet-facing production deployment.

## Staging / production prerequisites

The application is **not production ready**. Before selecting a host or exposing a service, the project owner must approve a deployment target and supply verified business, security and operational requirements. Required implementation work includes:

1. Use a managed PostgreSQL service with encrypted connections, private networking, automated backups and a tested restore runbook.
2. Use managed Redis or an equivalent shared rate-limit store with TLS, authentication, capacity monitoring and recovery settings.
3. Place frontend/API behind a managed TLS ingress/WAF; set `COOKIE_SECURE=true`, strict CORS origins, trusted proxy behavior, request limits and production security headers.
4. Replace mock payments with an owner-selected provider, hosted/tokenized payment flow, signed webhooks, reconciliation and refund handling. Never collect card numbers in this app.
5. Replace console email with a verified transactional email provider; implement verification, password recovery, customer/order notifications, suppression and retry handling.
6. Decide a durable object-storage/CDN strategy for product images and uploads; implement access policy, size/type validation, image processing and backups.
7. Confirm legal entity, currency, tax, shipping, returns, privacy, terms, store details and the source of truth for final product names/prices/variants/stock.
8. Add production observability, alerting, error tracking, structured request IDs, secret management, key rotation, dependency scanning and an incident response procedure.
9. Complete PostgreSQL concurrency/integration tests, CI pipelines, browser acceptance, accessibility review, threat modeling and disaster-recovery drills.
10. Review account creation, admin provisioning, authorization, audit retention, data deletion and customer-support workflows.

## Configuration profiles

`Settings` supports `local`, `docker`, `staging` and `production`. Staging and production reject unsafe defaults (weak JWT secret, SQLite, insecure cookies, debug mode, wildcard origins and a present bootstrap admin password). The current mock payment and console email modes stay explicitly non-live. Do not mark a deployment production-ready until operational providers and the checks above are implemented and independently verified.

## Safe deployment workflow (future)

There is no deployment pipeline or public host configured by this task. Do not deploy from this repository until the owner explicitly authorizes a target environment and the production-readiness gate is satisfied. For any future rollout, prefer immutable image tags, backward-compatible migrations, staged traffic, health-gated rollback and a verified database backup.
