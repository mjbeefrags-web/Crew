# Client experience review — current pass

This is a working review, not a claim of final acceptance. It records what was
tested, what was repaired in this pass and what still needs owner/device input.

## What was tested

- Production build served by the Docker stack at `127.0.0.1:8080` and dev server.
- Chromium at 320, 390, 768, 1024 and 1440 CSS pixels.
- Routes: `/`, `/shop`, `/clothes`, `/denim`, PDP, `/drops`, `/cart`, `/checkout`,
  `/about`, `/admin`.
- Interactions: scroll-follow navigation, quick-add size choice, mobile menu,
  filters, admin advisor, cart/checkout empty states, API readiness.
- Checks: horizontal overflow, console errors, first paint, transferred bytes,
  unit tests, API tests, lint, build, container health.

## Findings and repairs

| Severity | Finding                                                                                                                                                | Repair                                                                                                                                                                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Critical | The header was declared `position: sticky` but a later rule forced `position: relative; z-index: 1`, so it scrolled away and sat behind content.       | Restored sticky positioning and a stacking order above the page in the final cascade; verified the bar stays at `top: 0` while scrolling.                                                                                                                                                                                                             |
| Major    | No follow-scroll behaviour; the owner had to return to the top to navigate.                                                                            | Added rAF-throttled direction tracking that slides the bar away on downward scroll and returns it on a small upward movement. Menu-open, focus-in-header, route change and reduced-motion keep it visible.                                                                                                                                            |
| Major    | Commerce templates had no phone breakpoints: catalog rail and grid stayed side by side; footer columns overlapped; PDP 3D controls covered size chips. | Added mobile breakpoints, a filter drawer toggle, a photo-led PDP with opt-in 3D, and a compact sticky buy bar. Zero overflow now at all five widths.                                                                                                                                                                                                 |
| Major    | Prototype chrome (“DEVELOPMENT PREVIEW”, “ADMIN DEMO”, “Owner console · demo”) was visible to shoppers.                                                | Softened preview copy, hid admin links unless an API-mode admin is signed in, and moved product readiness notes to quiet footnotes.                                                                                                                                                                                                                   |
| Major    | Initial load pulled 3.9 MB of images and the WebGL runtime before first paint on `/shop` and `/drops`.                                                 | WebP conversion (5.0 MB → 1.93 MB), local fonts, lazy home bundle, idle-mounted world, removed unused preloads, `content-visibility` on long sections. `/shop` images now ~0.82 MB, first paint ~280 ms; `/drops` ~1.87 MB, ~120 ms.                                                                                                                  |
| Major    | Quick-add silently selected XS and the first colour.                                                                                                   | Multi-size products now require an explicit size choice before adding.                                                                                                                                                                                                                                                                                |
| Moderate | Owner dashboard could describe signals but not propose a next move from playbook knowledge.                                                            | Added a RAG advisor over a bundled operating playbook with an MCP-compatible tool manifest and admin-only endpoints. See `docs/ai-advisor.md`.                                                                                                                                                                                                        |
| Moderate | Visual feel was dark but static; the brand palette was not present in the persistent nav.                                                              | Added a psychedelic 3D breathing aura behind the nav, depth on hover, and a logo that cycles through the drop colourways. Reduced motion and phone layouts are handled.                                                                                                                                                                               |
| Moderate | The hand-off between the world hero and the scroll journey was an abrupt, empty band, and early accents leaned on lime green.                          | Added a fixed-height `scroll-breath` threshold with four plum/pink/violet colour fields that breathe on a 12 s cycle and react to scroll velocity/progress. The logo, nav accents and aura use the same purple/pink palette from the campaign photography. The spacer never changes layout height, so it cannot create horizontal or vertical jitter. |

## Current acceptance gates

- `npm run build`, `npm run lint`, `npm test` — pass.
- Backend `pytest` and `ruff check` — pass (including advisor/RAG tests).
- Playwright overflow audit — zero horizontal overflow at all five widths.
- Docker Compose — all services healthy, `/` and `/api/ready` return 200.
- Browser console — no uncaught errors during the tested journeys.

## Still outstanding / owner decisions

- Real payment and delivered email are still mock/console adapters by design;
  production configuration intentionally refuses anything else until adapters exist.
- Physical iOS/Android GPU and frame-rate measurement has not been done. The
  WebGL world is idle-mounted and opted into, but device testing is still needed
  before promising frame budgets.
- Screen-reader and full WCAG contrast review is outstanding. Keyboard focus,
  Escape, reduced motion and focus restoration were checked in Chromium.
- Drop-to-product attribution in analytics is still an editorial slug map until
  real drops and stock are linked in the backend.
- The advisor's remote provider is optional and unverified without a key; the
  local provider is the tested default.
