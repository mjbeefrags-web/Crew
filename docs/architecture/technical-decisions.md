# Technical Decisions and ADR Index

**Status:** decisions are provisional until backed by implementation and tests. See individual ADRs under this folder.

## Active decisions

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | Modular FastAPI application with routes, core, integrations, schemas and persistence | Implemented first cut; business logic still needs finer service/repository extraction |
| ADR-002 | PostgreSQL target; SQLAlchemy 2 async ORM; Alembic migrations | Implemented; PostgreSQL execution still awaits full Docker verification |
| ADR-003 | Argon2id password hashes, short-lived access JWTs and rotating opaque refresh sessions | Implemented and covered by API tests |
| ADR-004 | Server-owned prices and stock; transactional, idempotent mock checkout and inventory ledger | Implemented with local SQLite test coverage; production concurrency remains unverified |
| ADR-005 | Mock payment and console email adapters only; no real credentials or paid provider activation | Implemented |
| ADR-006 | Same-origin `/api` reverse proxy; browser keeps access token in memory, refresh token in HttpOnly cookie | Implemented; Compose browser integration pending |
| ADR-007 | Redis for shared login rate limiting; no task worker until an actual asynchronous requirement exists | Implemented for auth throttling in Compose plan; runtime verification pending |
| ADR-008 | AI remains an optional boundary with no access to price, stock, authorization or payment decisions | Documented; no AI integration implemented |
| ADR-009 | Docker Compose is for local full-stack operation; no public deployment in this task | Implemented; clean deployment verification in progress |

## Decision process

Record context, decision, alternatives and consequences in an ADR when a choice materially affects security, persistence, API contracts or operations. Update this index when an ADR changes. Do not treat a documented intention as implementation evidence.
