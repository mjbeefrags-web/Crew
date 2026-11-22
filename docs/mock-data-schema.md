# Mock Data & Domain Schema

## M1.1 current contracts

`src/domain/product.ts` types products and collections. `src/domain/service.ts` defines the catalog service. `src/data/mock/catalog.ts` holds fixtures and `src/services/mockCatalogService.ts` provides the adapter. The product category type now covers tops, t-shirts, hoodies, sweatshirts, shirts, jackets, trousers, shorts, denim, kids, accessories and shoes. Currency is not hardcoded to USD in the type; existing seed prices remain USD demo values and must not be treated as approved local pricing.

## Planned domain models

```ts
type Money = { amountMinor: number; currency: string }; // ISO 4217
type Category = {
  id: string; slug: string; labelKey: string;
  parentId?: string; audience?: 'adult' | 'kids' | 'unisex';
  childIds: string[]; sortOrder: number;
};
type Product = {
  id: string; slug: string; name: string; description: string;
  categoryIds: string[]; audience: 'adult' | 'kids' | 'unisex';
  collectionIds: string[]; price: Money;
  variants: ProductVariant[]; denimFit?: DenimFit;
  materials: string[]; attributes: string[]; isNew: boolean;
};
type ProductVariant = {
  id: string; colorId: string; size: string; available: boolean;
  sku: string; imageIds: string[];
};
type DenimFit = {
  fitId: string; rise: string; leg: string;
  waistGuideId: string; inseamOptions: string[];
};
type Customer = {
  id: string; email: string; firstName: string; lastName: string;
  addressIds: string[];
};
type CartLine = { variantId: string; quantity: number; unitPrice: Money };
type Cart = { id: string; lines: CartLine[]; updatedAt: string };
type Order = {
  id: string; customerId?: string; lines: CartLine[];
  subtotal: Money; delivery: Money; total: Money;
  status: string; createdAt: string;
};
type Store = {
  id: string; slug: string; name: string; address: Address;
  phone?: string; openingHours: OpeningHours[];
  coordinates?: { latitude: number; longitude: number };
  directionsUrl?: string;
};
```

These are planned contracts, not implemented types except the current product/collection subset. Confirm the market, locale/currency, age ranges, fit terminology, taxes/delivery rules and real inventory before seeding production-like data.

## Service boundaries

- `CatalogService`: categories/collections/new arrivals/best sellers/products, search/facets/sort and denim-fit products.
- `CartService`: read/update/remove/clear, totals and local persistence adapter.
- `WishlistService`: list/add/remove variant or product.
- `AuthService`: simulated register/login/forgot-password/session.
- `OrderService`: simulated create/list/get, no real payment processing.
- `StoreService`: search by place and get store detail; geolocation is optional.

Mock services should support deterministic latency, empty data, unavailable variants and injected errors. Map data by stable IDs; never calculate availability from display strings. Store monetary amounts in minor currency units with an ISO currency code; calculate totals through a shared tested money helper, not UI arithmetic.

## API integration seam

Feature hooks call a domain service interface; a mock adapter and future FastAPI adapter satisfy the same interface. Normalize API validation/errors at the adapter and preserve field-level errors for forms. Never expose backend DTOs or mock records directly as presentation state.
