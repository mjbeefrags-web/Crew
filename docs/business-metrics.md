# Business metrics and catalogue control

The owner dashboard now receives server-computed commercial metrics from
`GET /api/v1/admin/metrics?days=7|30|90`. The browser no longer derives the
financial model; it renders the API's numbers, formulas and assumptions.

## Formulas implemented

| Metric | Formula |
|---|---|
| Net revenue | Sum of `total_minor` for paid, non-cancelled orders in the window |
| AOV | Net revenue ÷ paid orders |
| Units per order | Units sold ÷ paid orders |
| Conversion proxy | Paid orders ÷ (active carts + paid orders). Sessions are not instrumented yet, so this is a proxy. |
| Repeat rate | Customers with 2+ paid orders ÷ customers with 1+ paid order |
| Purchase frequency | Paid orders ÷ unique customers |
| CLV | AOV × purchase frequency × estimated lifespan periods |
| Sell-through | Units sold ÷ (units sold + ending stock units) |
| Inventory turnover | (Net revenue × COGS ratio) ÷ inventory value |
| Gross margin proxy | (Net revenue − COGS) ÷ net revenue |
| Days of cover | Ending stock units ÷ (units sold ÷ days) |
| Revenue growth | (Current revenue − previous period revenue) ÷ previous revenue |
| 7-day moving average | Trailing arithmetic mean of daily revenue |

Definitions follow standard ecommerce practice (Shopify, Daasity, Putler).

**Assumption:** costs are not stored per variant yet. `cogs_ratio` defaults to
0.45 and every derived margin/turnover figure is labelled a proxy in the API
response and the dashboard. Replace it with real landed cost when stock arrives.

## Catalogue control

Admin-only endpoints:

- `POST /api/v1/admin/products` — add a new arrival (name, slug, collection, price, stock, sizes, colours, image URL).
- `PATCH /api/v1/admin/products/{id}` — edit story, status, price, stock, collection, image and merchandising flags.
- `DELETE /api/v1/admin/products/{id}` — archive a product; order history is preserved.
- `POST /api/v1/admin/uploads` — store a JPG/PNG/WebP image (base64 JSON body) and return `/api/uploads/{name}`; files persist in the `uploads_data` Docker volume.

The dashboard renders a catalogue panel with a new-arrival form, photo upload,
live preview and a removable product list. Publishing invalidates the catalog
cache so the shop reflects the change immediately.

## Real graphs

The commercial panel renders daily revenue plus a 7-day moving average with
hover inspection, axis labels and audited formulas. Ranking panels show top
SKUs, size/colour mix and live stock risk from the server snapshot.
