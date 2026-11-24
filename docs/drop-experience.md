# Psychedelic Minds — drop experience

## Intent

Concept 02 from `docs/material/CREW_Hoodie_Collection.pdf` is treated as a game drop, not a
catalogue filter. The visitor enters through the home-page portal banner or `/drops`, picks a
transmission, and lands in a chamber where the hoodie behaves like an unlocked in-game item.

The visual language is a dark fairground: marquee bulbs, funhouse rings, chromatic edges,
grain, and a live camera. It is an original interpretation of carnival/psych-rock energy —
no third-party artwork, audio, or protected assets are used.

## Source material

Slides 19–31 of the hoodie PDF contain the concept names and copy. Slide 1 of
`CREW lOGO OPTIONS.pdf` contains the CREW mark. All pages were exported as WebP plates:

- `public/images/drops/drop-21.webp` … `drop-31.webp`
- `public/images/brand/logo-01.webp` … `logo-10.webp`

`src/data/drops.ts` is the single mapping between a concept, its lore, colourways, and plate.
The five drops are:

| Drop | Name | Plate | Line |
| --- | --- | --- | --- |
| 01 | Out of Focus | drop-22 | Physically here. Mentally somewhere else. |
| 02 | Life in Scroll | drop-24 | A never-ending feed. A life on repeat. |
| 03 | The Gift Theory | drop-26 | The more gifts, the merrier. |
| 04 | Lost in the Frequency | drop-28 | Reality is loud. Music takes you somewhere else. |
| 05 | Outsourced Mind | drop-30 | Keep your mind yours. |

The artwork plate is mapped to the garment's back print and the CREW mark to the chest in
`src/scenes/lib/garment.ts`. The fit is an illustrative study, not a production pattern.

## Controls

### Focus chamber

- Drag to orbit, wheel to zoom, or use the `+`, `−`, and auto-spin controls.
- Hovering the chamber pauses auto-spin so the HUD pins stay easy to hit.
- HUD pins reveal print, fabric, and fit notes.
- Colourways re-materialise the garment in White, Deep Red, Black, Chocolate Brown, or Petrol Blue.
- `ADD TO LOADOUT` commits the selected colourway to the existing cart store.

### Walk-in gallery

- `ENTER THE GALLERY` moves the camera to a first-person view of all five plinths.
- `W A S D` / arrow keys walk, drag looks around, `E` or a click on a plinth inspects that drop.
- Proximity is announced in the walk hint and through the on-screen prompt.

### Audio

`src/lib/sound.ts` synthesises short percussive blips, a portal sweep, and a low room hum with
the Web Audio API. Audio is opt-in: the header's `Sound toggle` adds blips to site interactions,
and the chamber's `SOUND OFF` / `SOUND ON` adds the portal sweep and room hum. The preference is
shared between them; nothing autoplays, and no audio files are shipped.

## Object study / dossier

`DropObjectStage` is a sticky scroll chapter after the main drop room. Scrolling turns the hoodie on the page, moves the HUD signal, and cycles the dossier from CONCEPT → ARTWORK → GARMENT → WORLD. Above the object are the previously available loadout and equip controls, so the page remains a working store.

## Shareable state

The URL is the source of truth for the experience. `/drops/psychedelic-minds` reads `piece`,
`mood`, `view`, `colour`, `size`, and `entered`, so a selected world, artwork view, garment
colour and size can be shared or reopened exactly as left. The classic `/drops/:slug` chamber
reads `colour`, `size`, and `view`. The home-page world switcher reads `world` (or `piece`),
and the editorial matrix reads `piece` and `colour`.

Canonical commerce records in `src/data/psychedelicProducts.ts` map each of the five concepts
to its product page, approved photography or concept garment study, artwork gallery and
variant-level SKU/stock. Stock urgency is only shown when a variant supplies a real quantity.

## Performance and accessibility

- The 3D route, the world, and the standard product viewer are separate lazy chunks, so the
  initial storefront does not download Three.js twice.
- `DropObjectStage` is lazy, and its `HoodieViewer` is lazy again, so the object study does not
  block the initial drop page.
- `createStage()` caps pixel ratio and frame rate, pauses offscreen, respects reduced motion,
  and recovers from WebGL context loss.
- Without WebGL the object stage shows the supplied artwork plate as a fallback image.
- The canvas is focusable and labelled; every dossier tab, swatch and control has an accessible
  name and state.
- HUD pins are fixed HUD elements rather than tracked 3D projections, keeping them stable for
  pointer, keyboard, and assistive-tech users while the object spins.
