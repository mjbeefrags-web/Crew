import type { AdminCustomer, AdminData, AdminOrder, AdminProduct } from '../domain/admin';
import type { AdminService } from './adminService';
import { apiRequest } from './apiClient';

type RawOrderItem = {
  product_name?: string; sku?: string; size?: string; color?: string;
  unit_price_minor?: number; quantity?: number;
};
type RawOrder = {
  id?: string; created_at?: string; status?: string; email?: string; currency?: string;
  subtotal_minor?: number; delivery_minor?: number; total_minor?: number;
  payment_status?: string; items?: RawOrderItem[];
};
type RawVariant = {
  id?: string; sku?: string; size?: string; color?: string;
  price_minor?: number; stock_quantity?: number;
};
type RawProduct = {
  id?: string; slug?: string; name?: string; category?: string; collection?: string;
  currency?: string; price?: number; salePrice?: number | null; imageUrl?: string;
  isNew?: boolean; bestSeller?: boolean; isPreviewData?: boolean; variants?: RawVariant[];
  status?: string;
};
type RawCustomer = {
  id?: string; email?: string; first_name?: string; last_name?: string;
  role?: string; is_active?: boolean; created_at?: string;
};

const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const number = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

function normalizeOrder(raw: RawOrder): AdminOrder {
  return {
    id: text(raw.id),
    createdAt: text(raw.created_at, new Date(0).toISOString()),
    email: text(raw.email),
    currency: text(raw.currency, 'USD'),
    status: text(raw.status),
    paymentStatus: text(raw.payment_status),
    subtotalMinor: number(raw.subtotal_minor),
    deliveryMinor: number(raw.delivery_minor),
    totalMinor: number(raw.total_minor),
    items: (raw.items ?? []).map((item) => ({
      productName: text(item.product_name, 'Product'),
      sku: text(item.sku),
      size: text(item.size),
      color: text(item.color),
      quantity: number(item.quantity, 1),
      unitPriceMinor: number(item.unit_price_minor),
    })),
  };
}

function normalizeProduct(raw: RawProduct): AdminProduct {
  const priceMinor = Math.round(number(raw.price) * 100);
  const variants = (raw.variants ?? []).map((variant, index) => ({
    id: text(variant.id, `variant-${index}`),
    productId: text(raw.id),
    sku: text(variant.sku),
    productName: text(raw.name, 'Product'),
    category: text(raw.category),
    collection: text(raw.collection),
    size: text(variant.size),
    color: text(variant.color),
    priceMinor: number(variant.price_minor, priceMinor),
    stockQuantity: number(variant.stock_quantity),
  }));
  return {
    id: text(raw.id),
    slug: text(raw.slug),
    name: text(raw.name, 'Product'),
    category: text(raw.category),
    collection: text(raw.collection),
    currency: text(raw.currency, 'USD'),
    priceMinor,
    ...(typeof raw.salePrice === 'number' ? { salePriceMinor: Math.round(raw.salePrice * 100) } : {}),
    status: text(raw.status, raw.isPreviewData ? 'preview' : 'active'),
    isNew: raw.isNew === true,
    bestSeller: raw.bestSeller === true,
    imageUrl: text(raw.imageUrl),
    variants,
  };
}

function normalizeCustomer(raw: RawCustomer): AdminCustomer {
  return {
    id: text(raw.id),
    email: text(raw.email),
    firstName: text(raw.first_name),
    lastName: text(raw.last_name),
    role: text(raw.role, 'customer'),
    isActive: raw.is_active !== false,
    ...(raw.created_at ? { createdAt: raw.created_at } : {}),
  };
}

export const apiAdminService: AdminService = {
  async load(): Promise<AdminData> {
    const [orders, products, customers] = await Promise.all([
      apiRequest<RawOrder[]>('/api/v1/admin/orders'),
      apiRequest<RawProduct[]>('/api/v1/admin/products'),
      apiRequest<RawCustomer[]>('/api/v1/admin/customers'),
    ]);
    return {
      source: 'api',
      generatedAt: new Date().toISOString(),
      orders: orders.map(normalizeOrder),
      products: products.map(normalizeProduct),
      customers: customers.map(normalizeCustomer),
      events: [],
      carts: [],
      wishlistCount: 0,
      newsletterCount: 0,
      contactCount: 0,
      limitations: [
        'The API currently returns the newest 200 orders and customers; historic metrics are limited to that window.',
        'Cart, wishlist, drop and on-site behaviour events are not exposed by the API yet, so those panels stay empty.',
      ],
    };
  },
};
