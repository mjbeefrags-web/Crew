# Frontend Architecture & Current Implementation

## Current application

Vite + React + strict TypeScript app at the repository root. React Router renders the Crewww storefront at `/`, the earlier foundation concept at `/concept`, the component/design preview at `/design-system`, and a designed not-found route. `SiteLayout` owns global chrome; `ShowroomPage` composes the catalog and inspection interaction; `HoodieViewer` is dynamically imported and owns its Three.js resources. TanStack Query and `CatalogService` remain available for the mock product boundary. Mock records live in `src/data/mock/`.

`main.py` is outside this application and was not edited in this milestone.

## Planned module boundaries

```text
src/
  app/          route tree, providers, shell, service composition
  components/   accessible reusable primitives
  data/mock/    mock records and deterministic fixture builders
  domain/       product/category/customer/cart/order/store contracts
  features/     catalog, denim-fit, search, cart, account, store-finder
  pages/        route-level views/composition only
  scenes/       optional isolated campaign/product scene notes
  services/     service interfaces/adapters (mock first, API later)
  state/        client-owned cart/wishlist/session UI state
  styles/       tokens, foundations, component and responsive CSS
  test/         setup, fixtures, mock handlers
  utils/        pure formatting/normalization helpers
```

Current code is still a small foundation, not a finished production architecture. Avoid creating empty abstraction layers until a feature uses them.

## API seam and data flow

`Product`, `ProductCollection`, and `CatalogService` define the initial typed boundary. UI requests go through feature hooks/services; pages must not import records from `data/mock`. Define explicit contracts next for categories/fit, search, customer/auth, cart, order, and stores before those features are built. Future FastAPI adapters translate HTTP data/errors into these domain results; components must not know endpoints, auth token formats, or response wrappers.

- TanStack Query: asynchronous service/cache state (catalog, products, locations, orders).
- Zustand: client-owned session UI state (cart/wishlist) only when features exist; do not copy Query data into stores.
- React Hook Form + Zod: validated forms; keep field errors accessible.
- Locale/currency: use ISO currency codes and explicit locale configuration/formatters; do not assume the client market from the Streetwearts example.
- Mock services must support deterministic responses, delay/failure injection for tests, and explicit error states.

## Routing, content and commerce

The route tree is intentionally explicit; unknown paths render not-found rather than silently showing home. Full hierarchy and page boundaries are in [page-inventory.md](./page-inventory.md). A later route tree should group shared listing templates without collapsing Kids, Denim fit education, Drops, Best Sellers, stores, or policies into generic pages.

## Dependency audit (M1.1)

- React, React DOM, React Router: in use for UI and routes.
- Vite, React plugin, TypeScript: in use for build/type checking.
- Tailwind CSS Vite plugin and Tailwind CSS: installed as requested; authored foundation is currently custom CSS with design tokens and has no Tailwind utility classes. Decide whether to retain after M2 establishes component styling conventions.
- TanStack Query, Zustand, React Hook Form, Zod, `@hookform/resolvers`: used at the foundation/query/form/state boundary.
- Vitest, Testing Library, jsdom, Playwright: used in current tests.
- **Three.js is now installed and used by the dynamically imported `HoodieViewer` prototype.** R3F, Drei, GSAP and Motion remain absent. The Three.js chunk is about 566 kB minified and 143 kB gzip; physical-device evaluation is still needed.
- Google Fonts are requested remotely by `index.html`; local font files or a self-hosting decision should be made before production/privacy/performance sign-off. CSS fallbacks work if fonts fail.

## Architecture risks and open questions

- Current Crewww records use USD and provisional hoodie descriptions, prices, variants and availability; none are confirmed sales data. The client’s market, currency, language, age bands and real size runs remain unconfirmed.
- `CatalogService` currently covers only a featured product, collection list, and one product lookup. It is not the final service API.
- Current UI uses one global Zustand notice; cart and wishlist stores are not implemented.
- Route-level loading/error and not-found states exist for the foundation. A global React error boundary, route-level code splitting and API error policy should be added with actual pages.
- Do not load WebGL on every route. The hoodie viewer is an optional dynamic chunk with fallback; device/motion evaluation remains open.
- Local store data must have an explicit freshness/source policy; browser location permission is optional, never a prerequisite.

## Accessibility, performance, and verification

Use semantic landmarks, skip link, visible focus, keyboard-operable controls, accessible names/states and reduced motion. Reserve image/scene geometry. Lazy-load below-fold media and optional scenes. At M2+, check Core Web Vitals with field/lab data rather than asserting performance from a local screenshot. Current browser review is a foundation review, not a WCAG or performance certification.
