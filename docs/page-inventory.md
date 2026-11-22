# Full Fashion Storefront Page & Route Architecture

This is the planned architecture, not a claim that the routes exist yet. M1.1 does not implement these pages.

## Global navigation hierarchy

1. **Shop** — `/shop`
   - New arrivals — `/new-arrivals`
   - Kids — `/kids`
   - Denim — `/denim`
     - Denim fits — `/denim/fits`
     - Fit detail — `/denim/fits/:fitSlug`
   - Clothes — `/clothes`
     - Tops — `/clothes/tops`
       - T-shirts — `/clothes/t-shirts`
       - Hoodies — `/clothes/hoodies`
       - Sweatshirts — `/clothes/sweatshirts`
       - Shirts — `/clothes/shirts`
       - Jackets — `/clothes/jackets`
     - Bottoms — `/clothes/bottoms`
       - Trousers — `/clothes/trousers`
       - Shorts — `/clothes/shorts`
   - Accessories — `/accessories`
   - Shoes — `/shoes`
   - Drops — `/drops`, detail `/drops/:slug`
   - Best sellers — `/best-sellers`
2. **Stories** — Lookbook `/lookbook`, story `/lookbook/:slug`, shoppable look `/looks/:slug`
3. **About** — `/about`
4. **Find stores** — `/find-stores`, detail `/find-stores/:storeSlug`
5. **Customer support** — `/support`, `/contact`, `/faq`, `/shipping`, `/returns`
6. **Persistent utility** — Search `/search`, Wishlist `/wishlist`, Account `/account`, Cart `/cart`.

“Clothes” subcategory hierarchy is deliberately explicit. Kids remains a separate audience destination and can share underlying category values without being buried in adult navigation. Denim is a product destination with a fit education route, not merely one generic filter.

## Route inventory and responsibilities

| Route | Responsibility | Primary next actions |
|---|---|---|
| `/` | Current campaign, key shopping destinations, drops, best sellers, editorial story, store/support entry | Browse collection/categories |
| `/shop` | All-product listing and broad facets | Filter, sort, search, PDP |
| `/new-arrivals` | Chronological discovery | PDP, collection |
| `/kids` | Separate kids audience listing and age/size guidance | Filter by age/size, PDP |
| `/denim` | Denim landing and fit education | Fit finder, denim PDP |
| `/denim/fits` | Fit comparison/chooser | Fit detail, relevant products |
| `/denim/fits/:fitSlug` | Fit explanation, rise/leg/measurement guidance, products of a fit | Select product/size |
| `/clothes` | Category overview, tops/bottoms branches | Subcategory |
| `/clothes/tops` | Tops listing | Filter/sort/PDP |
| `/clothes/t-shirts`, `/clothes/hoodies`, `/clothes/sweatshirts`, `/clothes/shirts`, `/clothes/jackets` | Distinct top-category listings | Filter/sort/PDP |
| `/clothes/bottoms` | Bottoms overview | Trousers/shorts |
| `/clothes/trousers`, `/clothes/shorts` | Distinct bottom-category listings | Filter/sort/PDP |
| `/accessories`, `/shoes` | Accessory and footwear listings | Filter/sort/PDP |
| `/drops` | Active and past campaigns with status | Drop detail |
| `/drops/:slug` | Campaign story, curated products, optional editorial media | Shop drop |
| `/best-sellers` | Real product ranking/popular discovery, not a static campaign | Product/quick shop |
| `/products/:slug` | Product media, options/size, fit/material/care, delivery/returns, related products | Wishlist, cart |
| `/search` | Query, suggestions, results, facets, no-results recovery | PDP/category |
| `/wishlist` | Saved products and useful empty state | PDP/cart |
| `/cart` | Editable lines, stock/size awareness, totals, delivery and recovery | Checkout/continue shopping |
| `/checkout` | Guest-first simulated checkout with validation and clear progress | Place mock order |
| `/order-confirmation/:orderId` | Mock receipt, order summary and next action | Orders/continue |
| `/lookbook` | Campaign/look index | Shoppable look |
| `/lookbook/:slug` | Editorial story/look detail | Shop the look |
| `/looks/:slug` | Product-set / shop-the-look experience | Add/select items |
| `/about` | Brand, local context and values with substantiated claims only | Shop/stores |
| `/contact` | Contact options and validated enquiry form | Support |
| `/support` | Support hub | FAQ/shipping/returns/contact |
| `/faq` | Topic-based support answers | Contact/policy |
| `/shipping` | Regions, costs, delivery timing, tracking | Support/checkout |
| `/returns` | Return/exchange eligibility and process | Contact/order |
| `/policies/privacy`, `/policies/terms` | Legal policy pages | Support |
| `/find-stores` | Search/filter/list/map or location permission fallback | Store detail/directions |
| `/find-stores/:storeSlug` | Address, hours, contacts, directions, current store notes | Directions/contact |
| `/login`, `/register`, `/forgot-password` | Simulated auth and recovery | Account |
| `/account` | Account overview, sign-in or guest/order entry | Profile/orders |
| `/account/profile`, `/account/addresses` | Profile and saved addresses | Orders/checkout |
| `/account/orders` | Order list | Order detail |
| `/account/orders/:orderId` | Order status/detail | Support/returns |
| `/404` and unmatched paths | Honest recovery state | Home/shop/search |

## Category and fit data notes

- Categories are structured, localized data with stable slugs, parent-child relationships, sort/facet configuration and route metadata.
- A proposed denim fit taxonomy is **straight, slim, relaxed, wide-leg, and baggy**; these are candidate terms only. Confirm actual fits, size runs, rises and measurements with the client’s inventory before launch.
- Adult and kids products need separate age/size semantics. Denim waist/inseam sizing must not be conflated with kids age or alpha apparel sizes.
- “Best sellers” needs an explicit ranking source (mock deterministic ranking in frontend; later API ranking) and an updated timestamp/definition. Do not label arbitrary products as best sellers.
- Localized routes/content, currency, sizing, delivery, policies and store locations require market confirmation.

## Priority customer journeys

1. **Campaign → drop:** Home campaign → Drop detail → product → select color/size → bag → checkout → confirmation.
2. **Intent-led browse:** Shop/clothes → category → filters/sort → product detail → bag.
3. **Denim fit discovery:** Denim → fit chooser → compare fit/size guidance → fit products → product/size.
4. **Kids shopping:** Kids → age/size filter → item → parent-friendly fit/delivery details → bag.
5. **Popular discovery:** Best sellers → product/quick shop → bag.
6. **Search:** Search input → suggestions → results → refine or no-results recovery → product.
7. **Lookbook:** Story/look → labeled product hotspots/list → product and/or add selected look.
8. **Store visit:** Find stores → search/list → store detail → maps/directions/contact.
9. **Service/recovery:** Order/account → FAQ/shipping/returns → support/contact.
10. **Returning shopper:** Account/login → orders/addresses or wishlist → product/cart.
