# Security Architecture

## Trust boundaries

Browser input, localStorage and URL query parameters are untrusted. FastAPI validates all input, resolves identity from signed/opaque credentials and enforces authorization in server dependencies. PostgreSQL is authoritative. Redis is ephemeral and cannot grant permissions or establish inventory truth. Payment/email adapters are isolated integrations.

## Controls

- Argon2id password hashes; uniform login errors; rate limiting; bounded login/reset flows.
- Short-lived access token; rotating opaque refresh session stored hashed; revocable logout/session records.
- Admin role checks server-side; object ownership predicates prevent IDOR for carts/orders.
- Prices and totals recalculated by backend; stock held transactionally; idempotent checkout/payment operations.
- Same-origin reverse proxy, explicit CORS allow-list for local separate-origin development, secure cookies in production, and CSRF/origin checks for cookie-authenticated refresh/logout.
- Pydantic input/output schemas, SQLAlchemy bound parameters, image upload omitted until a safe storage/scanning policy exists.
- Structured logs redact credentials, tokens, PII where avoidable, and never log settings dumps.
- Safe diagnostics expose dependency name/state/check time and sanitized warning codes only. Never return connection strings, env values, tokens or exception traces.
- Dependency lock/audit, non-root containers, minimal runtime images, security headers and health checks.

## Limits

An internal Compose setup and automated tests do not constitute a penetration test or production security certification. Production must configure TLS, secret rotation, backups, alerting, legal/privacy review and provider webhook secrets before launch.
