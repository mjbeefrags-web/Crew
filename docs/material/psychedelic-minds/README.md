# Psychedelic Minds — asset set

Source assets for **Concept 02 / Psychedelic Minds**, extracted at full resolution
from `CREW_Hoodie_Collection.pdf` (slides 19–31) in this folder.

Generated copies of the same files are served by the site from
`public/images/drops/psychedelic-minds/` with identical names; use this folder as
the master reference set.

## Folder map

| Folder | Files | Size | What it is |
|---|---|---|---|
| `print-plates/` | 5 | 674 × 902 | True DTG back-print artwork, cropped from the bare design slides 21 / 23 / 25 / 27 / 29. Texture-mapped onto the 3D hoodie back. |
| `hoodie-product-photos/` | 5 | 830 × 830 | Main garment mockup per design, cropped from slides 22 / 24 / 26 / 28 / 30. |
| `alternate-colorway-views/` | 20 | 405 × 405 | Four supplementary hoodie views per design (`-view-a` … `-view-d`). |
| `front-and-chest-mark/` | 2 | 850 × 830 | Shared front design with the CREW chest logo (slide 20). |

## Design order

| # | Design | Signal | Slogan |
|---|---|---|---|
| 01 | Out of Focus | DRIFT | Physically here. Mentally somewhere else. |
| 02 | Life in Scroll | LOOP | A never-ending feed. A life on repeat. |
| 03 | The Gift Theory | GIVE | The more gifts, the merrier. |
| 04 | Lost in the Frequency | TUNE | Reality is loud. Music takes you somewhere else. |
| 05 | Outsourced Mind | KEEP | Keep your mind yours. |

## Colorways

White `#eae5d8`, Deep Red `#7d2026`, Black `#171719`,
Chocolate Brown `#4b332b`, Petrol Blue `#1d4b56`.

## Owner-approved photography in the parent folder

These files already sit directly in `docs/material/` and are wired into
`src/data/psychedelic.ts` as `photoApproved` entries:

- `Out of Focus hoodie.jpg` → `/images/drops/hoodie-01-out-of-focus-approved.jpg`
- `Life in Scroll (deep red) hoodie.jpg` → `/images/drops/hoodie-02-life-in-scroll-approved.jpg`
- `Lost in the Frequency choclate brown hoodie.jpg` → `/images/drops/hoodie-04-lost-in-frequency-approved.jpg`

Gift Theory and Outsourced Mind still use the extracted mockup crops above until
approved photos arrive.

## Where the site reads them

- `src/data/drops.ts` → `drop.plate` = `print-plates/*-dtg-back-print.webp`
- `src/data/psychedelic.ts` → `piece.photo` = `hoodie-product-photos/*-hoodie.webp`
- Cover and lineup still use the full-slide exports
  `public/images/drops/drop-21.webp` and `drop-31.webp`.

## Note on the slides

Slide 19 is the typographic title slide (`CONCEPT 02 / PSYCHEDELIC MINDS`) and
contains no garments. Odd slides 21–29 carry the standalone artwork; even slides
20 / 22–30 carry the garment mockups and colorway labels; slide 31 is the 5 × 5
lineup grid.
