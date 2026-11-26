# CREWWW operating playbook

This curated corpus is the retrieval source for the owner advisor. It is bundled
with the API so RAG works without external services. Keep entries short,
actionable and dated by decision, not by speculative trend.

## Scaling drops

Each drop should ship as a collection with its own SKU set, artwork plates,
lookbook story and inventory window. Keep slugs stable so analytics, search and
world destinations continue to point at the same drop after launch. Preview
records are labelled `sample`; switch them to `active` only after the owner
confirms price, sizes, colours and stock. The frontend already maps drop slugs
to product slugs for editorial attribution; replace that map with real
drop-product links when stock arrives.

## Stock and replenishment

Track stock at variant level (size + colour). A SKU with five units or fewer is
low stock; zero units is out of stock. Reorder decisions should weigh revenue
per unit, sell-through in the last 7/30 days and the number of colours that
share the same size curve. Release reservations when an order is cancelled;
never delete inventory adjustments. Free delivery starts at 100 minor-currency
units in the preview store, so baskets slightly under that threshold are a
cheap conversion win.

## Conversion and product presentation

The PDP leads with approved product photography; the 3D study is optional and
loads only on request. Keep the size selector explicit — quick-add must never
silently choose XS. Every product image has intrinsic dimensions to prevent
layout shift. Below-the-fold sections use `content-visibility: auto` so long
catalog pages stay smooth on phones. A low conversion proxy usually means the
gallery, size confidence or delivery trust is unclear, not that traffic is bad.

## Retention and next move

Repeat customers are the strongest signal that a drop found its people. When
repeat rate is low, prioritise post-purchase storytelling, restock alerts and
lookbook follow-ups before buying new traffic. Search queries with no matching
products are merchandising requests: promote the closest collection or add the
missing colour/size. A drop with high views but low units usually needs a
clearer price/availability message rather than more impressions.

## Performance budget

The storefront ships local WOFF2 fonts and WebP imagery. The home bundle is
lazy-loaded; WebGL loads only after the browser is idle. Public catalog GETs are
read-through cached (Redis in deployed environments, process-local otherwise)
and invalidated on admin mutations. Keep first paint under 300 ms on a warm
connection and keep zero horizontal overflow at 320/390/768/1024/1440.

## Operations

Postgres is the source of truth for orders, stock and customers. Redis is a
cache, never an authority. Migrations run before the API starts. nginx terminates
public traffic, gzips JSON/CSS/JS and serves hashed assets as immutable. CI runs
typecheck, lint, unit tests, build, API lint/tests, migration round-trip and a
compose smoke test. AI advice is advisory only; the owner approves every action.
