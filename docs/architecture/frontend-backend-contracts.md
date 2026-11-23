# Frontend / Backend Contracts

The frontend uses the existing `CatalogService`, `CommerceService` and `ContentService` boundaries. A central adapter composition selects mock preview or API adapters via a validated public build setting; API secrets never enter Vite variables. Components consume domain types and query hooks, not URLs or raw fetch calls.

The API adapter uses a same-origin `/api/v1` base, typed JSON schemas, credentials for the refresh cookie, and in-memory access-token state. It normalizes network, validation, authorization and server errors. TanStack Query owns server state; Zustand owns only interaction/session memory that cannot be trusted by the backend. Cart UI may optimistically update but always reconciles with API totals and variant availability. Checkout transmits product variant IDs and quantities, never authoritative prices.

Mock adapters remain available for deterministic story/design testing; they must be labeled as previews and must not silently substitute for a failed configured API in production. API-mode failures render retry/error states rather than switching to demo checkout.
