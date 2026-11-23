# ADR-002: PostgreSQL, SQLAlchemy 2 and Alembic

- **Status:** Accepted
- **Context:** Inventory reservation, order snapshots, idempotency, user records and relationships require durable transactional constraints.
- **Decision:** PostgreSQL is authoritative; use async SQLAlchemy 2 and Alembic migrations. SQLite may support isolated fast unit/API tests but does not replace PostgreSQL integration/migration verification.
- **Consequences:** Local and CI integration checks must run PostgreSQL; deployment must back up data before schema changes. Migrations, never implicit `create_all`, define deployed schema.
