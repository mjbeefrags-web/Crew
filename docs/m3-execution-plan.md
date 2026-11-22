# M3 Execution Plan — Complete Frontend

## M3 scope

Complete the React frontend only, based on the accepted M1.1 navigation/content plan and the M2.1 Crewww showroom. Preserve the existing Three.js district, real hoodie references, inspection interaction, search/filter behavior and tested browser history flows. Do not add an API server, database, real payment/email provider, paid service or real authentication.

## Repository baseline

- Vite + React + strict TypeScript, React Router, TanStack Query, Zustand, React Hook Form/Zod, Three.js.
- Existing routes: `/`, `/concept`, `/design-system`, unmatched-route fallback.
- Existing route data: eight Crewww hoodie products; 17 local owner-provided hoodie references; editorial preview images include denim/kids/accessory/shoe campaign candidates.
- No `.git` directory is present, so branch/status/diff cannot establish prior ownership of files. `main.py` is absent at the repository root.
- No `AGENTS.md` instructions were found.
- No new dependencies are planned; CSS and existing React/Three stack cover M3.

## Implementation stages

1. Extend typed catalog, discovery, commerce, content, store and account service contracts; keep mock adapters isolated from React presentation.
2. Add reusable category/catalog/filter/product-card components and preserve all eight real hoodie records. Clearly flag every non-owner-confirmed item and commerce value as demonstration data; never imply provisional stores, stock, prices or policies are real.
3. Add reusable product detail, search, wishlist, cart, guest checkout, order confirmation, simulated account/auth and customer support/contact routes.
4. Expand the homepage around the current Crewww district: campaign, new arrivals, category discovery, denim/kids/accessory/shoe previews, drops, best sellers, lookbook, brand story, stores, newsletter and full footer. Keep a direct static shopping path if WebGL is unavailable.
5. Implement grouped desktop mega-navigation and responsive mobile navigation with keyboard, escape, outside-click, focus and reduced-motion behavior.
6. Add mock data/state and tests for filters, variants, cart totals, wishlist, checkout validation/success, search, content forms and route journeys.
7. Run typecheck, build, unit/browser tests, visual QA at 360/390/768/1024/1440, capture screenshots, document remaining data/performance/accessibility limits, and stop at M3 approval.

## Boundaries and acceptance

- M4 is not part of this change. No backend architecture proposal or backend implementation starts before M3 review.
- Mock checkout is explicitly simulated and creates only a local demo order; it is not a payment.
- Account, store, policy and non-hoodie product data are clearly marked preview/demo content pending owner confirmation.
- Every visible control must navigate, submit, update state or be presented as noninteractive content.
- The M3 acceptance gate is recorded in `docs/reports/m3-completion.md` and `docs/milestones.md` after tests complete.
