# Interaction Strategy — Commerce + Editorial

M1.1 defines rules and journeys only; full interactions are not implemented.

## Principles

- Every affordance has an explicit purpose, visible state and useful outcome. No decorative-looking control that silently does nothing.
- Preserve browser-native link, form, focus and history behavior.
- Hover is enhancement; focus, click/tap and keyboard provide equivalent routes.
- Keep product facts and service details near the decision they inform.
- Give confirmation after add/save/remove/submit; protect destructive changes with undo or confirmation where appropriate.
- Use errors as recoverable product states, not toasts that vanish before they can be read.

## Interaction patterns

| Surface | Proposed behavior |
|---|---|
| Campaign / image reveal | Reveal by opacity/clip on first viewport entry; avoid cumulative layout shift. Image hotspots have labeled buttons and nearby textual product list. |
| Product-card hover | Optional second view/color or quick-shop affordance only on fine pointer; always present equivalent mobile/focus controls. |
| Cursor | No custom cursor by default. If a lookbook uses one, only on fine pointers; never hide OS cursor, never encode important information exclusively in it. |
| Size/fit | Explicit selected state with textual size, size guide and fit notes. Denim fit comparison uses named attributes and measurement guidance. |
| Search | Search control opens a labeled panel/drawer; focus input, show suggestions with keyboard navigation, allow Escape clear/close, provide results count and no-results recovery. |
| Cart | Persistent count reflects actual lines. Add feedback identifies item/size and opens or links to bag; quantity and remove update totals with polite announcement. Empty state links back to a useful destination. |
| Drawers | Enter with focus, Escape/close, restore focus; keep form errors and selections if closed where safe. |
| Filters/sort | Selected filters are removable chips; result count updates; clear-all and apply/reset behavior are clear on mobile. Preserve/share URL state when feasible. |
| Lookbook / shop the look | Hotspots are keyboard accessible and have product-list equivalents; selecting a product keeps story context. |
| Store locator | User can search place/postcode or browse store list; location permission is optional; results include hours, address, phone and directions. |
| Newsletter/contact/auth | Inline labels and validation; explain what happens to submitted data; simulated success is identified as a frontend demo until a backend exists. |

## Journey-level feedback

Campaign/drop → item → options → bag → checkout → confirmation; denim landing → fit guide → fit-specific items; kids → age/size → item; search → suggestions/results/recovery; store search → detail/directions; account/order → support/returns. Each path gets pending, empty, error, success and retry/recovery states as applicable.

## Testing

Test keyboard-only use, touch, reduced motion, browser back/forward, direct route entry, missing assets, empty inventory, invalid forms, delayed/failing mock service and persisted cart/wishlist. Visual refinement does not replace behavior tests.
