# Frontend Milestones

The frontend is the product for this phase. Backend work stays out of scope until the complete storefront is implemented and reviewed.

| Milestone | Scope | Exit criteria |
|---|---|---|
| M1 | Initial ARCFIELD sportswear exploration, shell and design-system foundation | Existing build/tests and baseline screenshots documented |
| M1.1 | Reassess local fashion business, research accessible retailer pages/secondary UX evidence, plan full taxonomy/nav/motion, audit foundation and dependencies | Evidence limitations explicit, category/routes and journeys documented, foundation defects fixed, tests/browser checks pass, no full-store implementation |
| M2 | Build full active-brand editorial homepage, desktop/mobile navigation and cinematic fashion-world scene | Screenshots refined across breakpoints; collection entrances, 2D path, 3D fallback and reduced motion tested |
| M2.1 | Stabilize the existing showroom; fix browser startup, critical interactions, responsive layout, reduced motion, and browser verification | Build/type/unit/browser checks pass; five responsive screenshots; known issues documented |
| M3 | Shop, new arrivals, kids, denim fits, clothes taxonomy, drops, best sellers, accessories/shoes, search, product pages/lookbook | All discovery routes/filters/variants work with typed mock services and visual/browser checks |
| M4 | Wishlist, persistent cart, checkout, simulated auth/orders/account | End-to-end mock journeys, validation/recovery states and visual checks pass |
| M5 | About/support/policies/stores/remaining content and not-found polish | Full accessibility/performance/browser review and completion gate pass |

## Current progress

The active storefront identity is **Crewww**, based on the user-provided product references in `docs/material/`. The `/` route now shows an eight-piece hoodie capsule, local product reference images, and an illustrative Three.js hoodie viewer. Product, price, variant and availability data are provisional mock records. The current implementation and boundaries are documented in [showroom-architecture.md](./showroom-architecture.md).

M2.1 stabilization is verified with deterministic Playwright server startup, catalog/bag/studio tests, reduced-motion and WebGL-fallback coverage, browser error/network capture, mobile navigation checks and five responsive captures. Independent browser review found and fixed missing viewport overlays for the inspection studio and bag, nonfunctional controls in the no-WebGL fallback, and low-contrast add-to-bag styling. Full M2 sections were still open when M3 began. The current execution is now M3 frontend completion only; M4 and backend work have not started. The procedural viewer is not production garment data.

### M2.1 / Crewww stabilization verification

- Root cause fixed: an orphaned Vite process held port 4173 while the prior Playwright server configuration could reuse or silently start on another port. Test startup now uses `--strictPort` and server reuse is opt-in via `PW_REUSE_SERVER=1`.
- `npm run build`: passed (type check + Vite production build). Vite reports the optional shared Three.js runtime at ~570 kB minified (~143 kB gzip); it is dynamically imported and not part of the shared route shell.
- `npm test`: passed, 7 tests across 2 files.
- `npm run test:e2e -- --workers=1`: passed, 8 Chromium tests. Coverage includes product search/filter/sort, actual storefront raycast and accessible collection navigation, direct shop-all path, mobile menu/search/home/footer routes, studio history/focus, 3D controls and no-WebGL fallback, bag persistence/removal and drawer geometry, responsive overflow/image loading at 5 widths, console/local asset errors, reduced motion and design-system validation.
- The Three.js implementation is dynamically split into small `CrewwwWorld`/`HoodieViewer` modules and a shared `three.module` chunk (~570 kB minified / 143 kB gzip). Vite's chunk-size warning remains; the shared scene runtime is loaded only by the showroom.
- Screenshots captured and visually reviewed at 360, 390, 768, 1024 and 1440 CSS px: [360](./visual-checks/crewww-home-360.png), [390](./visual-checks/crewww-home-390.png), [768](./visual-checks/crewww-home-768.png), [1024](./visual-checks/crewww-home-1024.png), [1440](./visual-checks/crewww-home-1440.png).
- Known limits: the hoodie model and city environment are procedural/illustrative, not production garment/environment assets; demo prices, sizes, variants and inventory need owner confirmation; physical mobile/WebGL performance, quantified FPS/GPU measurement and assistive-technology review are outstanding. Full M2 homepage scope is still open.
- Repository note: this workspace has no `.git` directory, so the current branch and Git status/diff cannot be verified. `main.py` is not present at the project root and was not changed.
- Detailed browser startup root cause and verification boundaries: [showroom-qa.md](./showroom-qa.md).

## M1.1 verification record

- Historical M1.1 dependency audit found GSAP, Motion, Three.js, React Three Fiber and Drei unused at that milestone. Those packages were removed then; Three.js has since been re-added for the Crewww hoodie viewer. `npm audit` at M1.1 reported 0 vulnerabilities.
- Added skip-to-content link; removed an unsupported coordinate cue; broadened product types/audience without assuming the client’s actual market/currency. USD values remain demo-only.
- Browser test caught and fixed a race where cross-route navigation scrolled before the target section mounted. Regression test now covers it.
- `npm run build`: passed (TypeScript + Vite production build).
- `npm test`: passed, 6 tests across 2 files.
- `npm run test:e2e`: passed, 6 Chromium tests covering desktop, tablet, mobile, design-system validation, cross-route anchors, keyboard skip link, and reduced motion.
- `npm audit`: passed, 0 vulnerabilities.
- Final screenshots were recaptured and visually inspected at 1440 × 1000, 768 × 900, and 390 × 844: [home desktop](./visual-checks/m1-desktop.png), [home tablet](./visual-checks/m1-tablet.png), [home mobile](./visual-checks/m1-mobile.png), [design system desktop](./visual-checks/m1-design-system-desktop.png), [design system mobile](./visual-checks/m1-design-system-mobile.png).
- `main.py` was not edited during M1.1.
- Primary access limitation: direct inspection of Zara, ASOS, Gucci, Aesop, Dior, Jacquemus and Louis Vuitton failed/was blocked/showed maintenance. For those brands, the research doc records source access honestly and draws only general principles from accessible independent UX/accessibility/technical sources; it makes no retailer-specific claims. This is a disclosed research limitation, not a fabricated completion.
- **M1.1 status:** Audit, source-attributed findings, local-fashion taxonomy, brand reassessment, navigation/motion/interaction plans and foundation fixes are complete. Direct competitor observations remain partial as documented. No M2/full-store implementation has started; wait for architectural and brand-direction review.
