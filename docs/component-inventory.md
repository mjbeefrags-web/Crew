# Component Inventory & Architecture

Current implementation status after the Crewww showroom adaptation.

## Implemented

- **SiteLayout:** Crewww announcement/header/navigation, skip link, bag trigger, footer and shared notice host.
- **BrandMark:** Crewww wordmark with circle-C signet.
- **ShowroomPage:** homepage hero, hoodie catalog, local search/filter/sort, wishlist, detail studio, size/color/quantity selectors and persisted demo bag.
- **CrewwwWorld:** dynamic Three.js fashion-district scene with storefronts, locally textured campaign displays, bounded pointer/scroll camera movement, raycast hotspots and matching accessible collection links.
- **HoodieViewer:** dynamically imported Three.js procedural garment prototype with drag and button rotation, reset, mock color updates, WebGL fallback and accessible product reference link.
- **Button**, **Toast:** shared action and notice primitives.
- **FoundationPage:** earlier concept route at `/concept` using the mock catalog service.
- **DesignSystemPage:** interactive token/type/button/form/product/system-state specimen at `/design-system`.
- **NotFoundPage:** explicit unknown-route state and home recovery.
- **useFeaturedProduct / mockCatalogService:** TanStack Query boundary and initial typed mock catalog adapter.
- **Product types and fixtures:** `src/domain/product.ts` and `src/data/mock/catalog.ts` provide typed demo products and collections.
- **QA:** Vitest component/service tests and Playwright showroom journeys, viewport checks and screenshot output.

## Planned commerce components

- **Global nav:** desktop mega-menu, mobile full-screen nav, accordion tree, search panel, account/wishlist/cart utilities.
- **Taxonomy:** category tiles, collection/drop hero, product rail, breadcrumb, category intro, fit finder, fit comparison and size guide.
- **Listing:** product grid/card, swatch selector, result count, filter/sort bar, filter drawer, chips, pagination/load-more, empty/error/skeleton states.
- **Product:** media gallery/zoom, size/color/fit selectors, availability, delivery/returns summary, details accordion, recommendations.
- **Shopping:** quick-shop dialog/drawer, wishlist control, cart line, totals, promotion code, checkout step form, order summary and confirmation.
- **Content:** lookbook story, shoppable hotspot with list alternative, about/story content, FAQ accordion, policies, contact/support.
- **Stores:** searchable store list/map shell, location card/detail, opening-hours table, phone/directions action.
- **Account:** auth/forgot form, account nav, profile/address editor, order list/timeline/detail.
- **System:** focus-managed modal/drawer, form field/error, toast, skeleton, empty state, alert, retry boundary.
- **Campaign/3D:** responsive poster, lazy WebGL scene boundary, scene status/fallback and accessible product/story CTA.

## Not implemented

Editorial/category landing pages beyond the hoodie capsule, denim/kids/accessories/shoes, lookbook, store discovery, newsletter, production product pages, real services, checkout and account experiences remain future storefront scope. No M3 work has started.
