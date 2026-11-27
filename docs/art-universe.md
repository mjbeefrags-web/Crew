# Art universe and purchase experience

The homepage no longer mounts the walkable Three.js district. It uses a
CSS-3D **universe of arts**: each psychedelic plate floats in space inside its
own generated world of roads, rising buildings and a rotating black hole,
coloured from the piece accent.

- No WebGL chunk on `/`; the production home bundle loads only the storefront code.
- Hover/focus brings a world forward and zooms its art; the other worlds recede.
- Click warps into the drop room for that specific piece.
- Phones show three worlds, with reduced effects; reduced-motion users get a static scene.

## Why this sells

Conversion research (Baymard, Nielsen Norman Group, Shopify/Yotpo 2026) is clear
about what moves a fashion shopper:

- Product visuals drive ~93% of purchase decisions.
- Reviews/social proof near the title can lift CVR substantially; we use honest
  merchandising flags (`CREW FAVOURITE` / `JUST LANDED`) rather than invented stars.
- Size uncertainty is the top fashion friction, so the PDP now puts a
  `CHECK YOUR SIZE` action beside real stock counts and the free-delivery threshold.
- Mobile needs a sticky, high-contrast CTA; buttons now lift, glow and sweep on
  hover/focus instead of looking static.

The navbar also wears the artwork: a low-opacity art rail, palette-matched
accents, and the psychedelic side pop-out. Everything stays in the same visual
language as the drop rooms.

## Iteration log

1. Replaced the idle-mounted WebGL world with CSS-3D art portals.
2. Removed continuous node movement that blocked reliable hover; life now comes
   from world layers, so interaction is stable on desktop and touch.
3. Made the hero copy pointer-transparent so portals receive hovers while CTA
   links remain clickable.
4. Added warp transition, per-piece accent colours and black-hole rotation.
5. Added header art rail, button lift/glow, and PDP trust strip.
6. Verified desktop/phone screenshots, hover/click travel and zero page errors.
