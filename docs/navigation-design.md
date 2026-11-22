# Navigation Design Concept — Not Implemented

## Information architecture

The full hierarchy and stable route proposals are in [page-inventory.md](./page-inventory.md). Primary nav is Shop, New Arrivals, Kids, Denim, Clothes, Drops, Best Sellers, Accessories, Shoes; editorial/About and Find Stores may sit in a secondary utility or campaign strip. Search, account, wishlist and bag remain persistent utilities. Avoid fitting all taxonomy links into the narrow header itself.

## Desktop: editorial mega-menu

- Hover/focus on a primary item reveals a two-dimensional panel; a click/tap on an adjacent disclosure button also opens it. The category name itself remains a normal destination link.
- Shop panel is grouped: New/Popular; Kids; Denim + fit education; Clothes (tops/bottoms and subcategories); Accessories/Shoes; Drops/Best Sellers. Group labels and item names stay explicit and scan-friendly.
- Use a restrained editorial image panel only when it links to a current Drop, category or story. Do not rely on imagery to name a destination.
- The open panel changes header/background surface and uses a subtle staggered opacity/short vertical reveal. It must not reflow the page unpredictably or cover critical utility controls.
- Pointer movement across the header-to-panel gap must not close the menu prematurely. Also support keyboard focus, click/tap, outside click, Escape and route selection.
- Close on Escape, explicit close, outside click or successful navigation; return focus to the trigger on Escape. Keep the menu nonmodal unless the selected presentation truly blocks the page.
- Show active/current page context; do not make a whole menu operate only on hover.

## Mobile: separate full-screen navigation

- Provide a dedicated menu button and a full-viewport overlay rather than compressing the desktop mega-menu.
- Keep search and cart available at the top. Primary destinations are large touch targets; secondary taxonomy expands as nested accordions with clear current level and back/close controls.
- Kids and Denim remain first-class destinations; denim fits are a visible secondary path, not a deep hidden label.
- Lock background scrolling while the modal nav is open; move focus inside, keep it contained, close on Escape/close/route change, and restore focus to the opener.
- Accordion disclosures report `aria-expanded`/`aria-controls`; links remain links. Reduced-motion mode opens/closes without spatial sliding.
- Do not request geolocation from the menu. Store search works by user-entered place/postcode with an optional, explicitly requested location shortcut.

## Timing and states

Provisional desktop reveal: 160–240ms opacity/short transform; mobile overlay: 200–320ms; accordion: 150–220ms. These are starting ranges for visual testing, not mandatory effects. Loading, unavailable campaign image, empty search, and keyboard focus states must still be legible.

## Evidence

Nielsen Norman Group’s [mega-menu research](https://www.nngroup.com/articles/mega-menus-work-well/) discusses grouped two-dimensional choice sets and scanability. Its [mobile navigation primer](https://www.nngroup.com/articles/mobile-navigation-patterns/) notes the screen-space tension between navigation/search and content. These inform this proposal; they are not observations about any inaccessible fashion house.
