# ADR-001: Modular FastAPI Application

- **Status:** Accepted
- **Context:** The storefront currently has typed TypeScript mock-service boundaries but no API. Backend workflows include catalog, identity, inventory and transactional checkout; placing these in one route file would couple transport, persistence and business rules.
- **Decision:** Use FastAPI routers per API domain, domain services for workflows, repositories for SQLAlchemy access, Pydantic request/response schemas, and adapter interfaces for external providers.
- **Consequences:** More files and explicit dependency wiring, offset by testable business rules and a stable frontend contract. Avoid empty abstraction layers until used.
