# Crewww Design System — Foundation & Reassessment

## Current implemented showroom tokens

| Token | Value | Current role |
|---|---|---|
| Chalk | `#F1F0E8` | Main canvas and display type |
| Charcoal | `#111210` | Storefront canvas |
| Forest | `#233B32` | Brand surface/header accent |
| Acid lime | `#C9EF68` | Accent/markers |
| Graphite | `#151613` | Text/footer |
| Muted | `#777A72` | Secondary label |
| Error | `#923D32` | Error state |

Current type: Instrument Serif display, DM Sans reading/UI, DM Mono metadata.

## Direction assessment

The active concept now adapts the interface to Crewww hoodie references: dark charcoal surfaces, forest green, acid-lime accents and editorial typography. Product imagery remains the owner-supplied source material. Other prior foundation routes preserve the original system and are not yet fully rebranded.

## Layout

- Current breakpoints: compact mobile ≤680px; tablet 681–900px; desktop >900px.
- Baseline viewport tests: 390px mobile, 768px tablet, 1440px desktop.
- Use fluid type, editorial whitespace and intentional image ratios, but protect mobile product names and controls from oversized display typography.
- Category/listing templates should prioritize filters, result count and scan-friendly products; campaign pages can be more art-directed.
- Reserve image/video/3D dimensions to avoid layout shift.
- Minimum touch target should meet WCAG 2.2 AA 24×24 CSS px or a valid spacing exception; prefer ~44px for primary touch controls.

## Component contracts

- **Buttons:** clear verb, solid/outline/text hierarchy, visible focus, disabled/busy states.
- **Inputs:** persistent label, input purpose/autocomplete, inline accessible validation.
- **Navigation:** destinations as links, disclosure/action as buttons, active/current state, keyboard/pointer parity.
- **Product cards:** image, category, name, localized price, color/availability signal and labeled save/quick-shop actions.
- **Drawers/modals:** dialog semantics, labelled title, close/Escape, focus containment/return, body scroll behavior.
- **Toasts:** brief polite status; errors remain available until understood.
- **Loading:** reserved geometry, no indefinite shimmer.
- **Empty/error/success:** explain status and provide a next action/retry where relevant.
- **Denim fit guidance:** dimensions and definitions as text; visuals supplement, never replace, fit names or measurements.

## Motion/accessibility

See [motion-system.md](./motion-system.md). Honor `prefers-reduced-motion`, include a site-level opt-out if custom parallax is used, do not auto-play attention-grabbing motion on commerce routes, and provide keyboard/touch equivalents for hover interactions.
