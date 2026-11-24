# Visual checks

Screenshots are browser captures in `docs/visual-checks/` and are used by developers for quick visual QA and regression diffs. They are current as of the CREW storefront experience; any intentional visual change should be reflected here.

## Current captures

| Capture | Notes |
| --- | --- |
| `home-00.jpeg` | Root showroom, full-page capture. |
| `drops-00.jpeg` | Drops index. |
| `drop-minds-00.jpeg` | Psychedelic Minds room, entered state. |
| `shop-00.jpeg` | Shop listing. |
| `psychedelic-room-1440.png`, `psychedelic-room-390.png` | Wide and mobile enter gate captures. |
| `psychedelic-room-1440-entered.png`, `psychedelic-room-390-entered.png` | Wide and mobile entered-room captures. |
| `transmission-rail-1440.png`, `transmission-rail-390.png` | Editorial drop cards. |
| `drops-index-1440.png`, `drops-chamber-1440.png`, `drops-gallery-1440.png` | Drops index/chamber/gallery captures. |
| `colorway-matrix-1440.png`, `colorway-matrix-390.png` | Editorial colorway matrix. |

## Viewport coverage

Use 360, 390, 768, 1024 and 1440 CSS pixels for layout regressions; legacy files include `crewww-home-360.png` through `crewww-home-1440.png`.

## Refresh commands

The captures below can be regenerated with a local dev server on `http://127.0.0.1:5174` and a Chromium browser; capture files are desktop exports, so they are kept as screenshots for humans rather than as automated test baselines.
