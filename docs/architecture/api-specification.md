# API Specification (Implementation Target)

Base path: `/api/v1`; root health endpoints are `/api/health`, `/api/ready`. JSON requests/responses use explicit Pydantic schemas.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`; `GET/PATCH /auth/me` |
| Catalog | `GET /products`, `/products/{slug}`, `/categories`, `/collections`, `/search` |
| Cart | `GET /cart`, `POST /cart/items`, `PATCH /cart/items/{id}`, `DELETE /cart/items/{id}` |
| Wishlist | `GET /wishlist`, `PUT /wishlist/{product_id}`, `DELETE /wishlist/{product_id}` |
| Checkout/orders | `POST /checkout` (Idempotency-Key), `GET /orders`, `GET /orders/{id}` |
| Admin | CRUD catalog/category/collection, inventory adjustments, order status, `GET /admin/system/status` |

Catalog queries allow category, collection, size, color, min/max price, availability, type, featured/new, search, sort, limit and cursor/page. Unknown sort keys and invalid bounds return 422. List responses include items and pagination metadata. Admin routes require active authenticated admin role; customer order reads are owner-scoped. Error shape: `{"error":{"code":"...","message":"...","fields":{},"request_id":"..."}}`.

This specification records intended contracts; each implemented route must be reflected in generated OpenAPI and endpoint tests.
