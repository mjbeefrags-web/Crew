# Crewww Showroom QA / M2.1

## Scope and environment

Independent stabilization review of the existing Crewww hoodie showroom at `/` only. This review did not implement the outstanding full M2 campaign/storefront scope or begin M3.

- Workspace: `D:\Projects\LocalBrand` on Windows.
- Runtime: Node 26.13.1; npm package scripts; Vite 8.3.8; React 19.3.1; TypeScript 7.0.2.
- Browser: Playwright's bundled Chromium, headed page contexts managed by the Playwright runner.
- Viewports: 1440 × 1000, 1024 × 900, 768 × 900, 390 × 844 and 360 × 800 CSS pixels.
- Git metadata: no `.git` directory exists in this project root, so branch, status and a trustworthy before/after Git diff are unavailable. No attempt was made to initialize Git or discard files.
- `main.py`: not present in the project root; no `main.py` was edited.

## Findings, severity and repairs

| Severity | Finding | Resolution |
|---|---|---|
| Major | The product inspection studio markup had no base overlay/layout styling. It appeared in document flow after the page instead of covering the viewport, making the central garment inspection experience unusable. | Added a fixed, scrollable full-screen studio, responsive two-column/stacked layout, product viewer stage, variant/size controls and visible purchase actions. Added a browser assertion that the studio is fixed. |
| Major | The shopping bag had no base scrim or drawer styling and rendered after the page content. | Added a fixed scrim and responsive side drawer with item rows, close control, empty state and mobile-safe dimensions. Browser QA verifies the drawer stays inside the 390 px viewport; screenshot captured. |
| Moderate | WebGL-unavailable hoodie preview still showed rotate/reset controls even though there was no scene to manipulate. | Hide scene-dependent controls in the fallback. Added an explicit WebGL-disabled browser test. World fallback and collection links remain available. |
| Moderate | The add-to-bag CTA inherited the dark theme button color, leaving its label low contrast against the dark fill. | Applied a high-contrast lime CTA treatment and hover state. |
| Minor | Studio and drawer entry animations needed an explicit reduced-motion override. | Disabled those entry/exit animations when `prefers-reduced-motion: reduce` is active. Existing reduced-motion behavior is covered in Chromium. |

No critical blocker remains in the tested showroom journey.

## Verification

- `npm run build` — passed. This includes `tsc --noEmit` and the production Vite build.
- `npm test` — passed: 7 tests across 2 Vitest files.
- `npm run test:e2e -- --workers=1` — passed: 8 Chromium tests.
- Chromium browser console audit — uncaught page errors: 0; console errors: 0; failed same-origin requests: 0; same-origin HTTP responses ≥ 400: 0.
- Five viewport checks assert the hero is present, document width does not exceed the target viewport, all eight product images load, and responsive full-page screenshots can be produced.
- Browser interactions cover search, combined category/collection/size/color/price/availability filters, reset, sort, storefront raycast destination, accessible destination links, shop-all, inspection history/back/Escape/focus restoration, variant and size selection, quantity, add-to-bag, bag persistence/removal, 3D rotate/reset, keyboard skip link, reduced motion, design-system validation and WebGL fallback.
- Route smoke checks cover `/` and `/design-system`; unhandled paths use the app's not-found route. No backend routes are expected.

### Build and runtime weight

The production build reports the shared Three.js module at 569.67 kB minified / 143.19 kB gzip. It is split from the route shell and loaded with the showroom's deferred 3D modules. The main application JS is 451.48 kB minified / 139.31 kB gzip. Vite emits its standard warning for a chunk above 500 kB.

The 3D code uses low-power renderer hints, caps device pixel ratio at 1.25 for the district and 1.5 for the hoodie, and renders on initialization, resize or user interaction rather than running a continuous animation loop. Source review confirms scene cleanup disposes geometry, materials, textures and renderers. Chromium verified successful scene initialization and a no-WebGL fallback. FPS, GPU utilization, GPU memory/heap behavior and low-end physical-device performance were not measured; no values are inferred.

### Screenshots

All captures below were generated from the running Playwright Chromium application. The five matrix screenshots are full-page captures; interactive state captures show the browser viewport.

- Responsive full page: [360 px](./visual-checks/crewww-home-360.png), [390 px](./visual-checks/crewww-home-390.png), [768 px](./visual-checks/crewww-home-768.png), [1024 px](./visual-checks/crewww-home-1024.png), [1440 px](./visual-checks/crewww-home-1440.png).
- Desktop campaign hero: [1440 px](./visual-checks/m2.1-hero-1440.png).
- Desktop catalog section: [1440 px](./visual-checks/m2.1-catalog-1440.png).
- Desktop interactive product inspection / procedural hoodie: [1440 px](./visual-checks/m2.1-studio-1440.png).
- Mobile shopping bag drawer: [390 px](./visual-checks/m2.1-bag-390.png).

## Remaining issues and limits

- The procedural hoodie is an illustrative shape, not production GLB/GLTF garment geometry. Product-specific fit, back graphics and material maps are not represented by the 3D model.
- Price, sizes, colors, stock, materials and care details are provisional mock records and must be confirmed by the Crewww owner before commerce launch.
- Some supplied product reference photos contain original social/app overlays or badges and have not been retouched.
- Physical-device testing, quantified frame/GPU measurements, screen-reader review, keyboard-only audit beyond automated journeys, and full color-contrast/WCAG review remain outstanding.
- The Vite Three.js chunk warning remains as stated above.
- The full requested M2 homepage is incomplete: campaign/new-arrival/category feature sections, kids, denim, accessories/shoes, brand story, store discovery and newsletter are not implemented. These are explicitly outside this M2.1 stabilization pass. No M3 implementation began.

## M2.1 acceptance

| Gate | Status |
|---|---|
| Showroom loads and route navigation works | Pass in Chromium |
| Critical and major showroom defects repaired | Pass; both modal-flow defects repaired |
| Major catalog, inspection and bag interactions work | Pass in automated Chromium journeys |
| Mobile usable at 360 px and 390 px | Pass for layout bounds, image loading and drawer geometry |
| Build and type check | Pass |
| Unit tests | Pass, 7/7 |
| Browser suite | Pass, 8 Chromium tests |
| Browser verification documented | Pass; console/network checks included |
| Screenshots available | Pass; five widths plus hero, catalog, studio and mobile drawer states |
| Remaining issues documented | Pass |

**M2.1 stabilization status:** Pass. **Full M2 status:** incomplete as listed above. M3 has not started; stop for project-owner review.
