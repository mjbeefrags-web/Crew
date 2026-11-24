import { describe, expect, it } from 'vitest';
import type { AdminData, AdminOrder } from '../domain/admin';
import { computeAdminMetrics } from './adminAnalytics';

const NOW = new Date('2026-11-24T12:00:00Z');
const iso = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString();

const order = (overrides: Partial<AdminOrder> & { id: string; createdAt: string }): AdminOrder => ({
  email: 'ada@crewww.test',
  currency: 'USD',
  status: 'delivered',
  paymentStatus: 'succeeded',
  subtotalMinor: 9000,
  deliveryMinor: 0,
  totalMinor: 9000,
  items: [{ productName: 'Focus Hoodie', sku: 'FOCUS-M', size: 'M', color: 'Black', quantity: 1, unitPriceMinor: 9000 }],
  ...overrides,
});

const baseData: AdminData = {
  source: 'demo',
  generatedAt: NOW.toISOString(),
  orders: [
    order({ id: 'paid-1', createdAt: iso(1) }),
    order({
      id: 'paid-2', createdAt: iso(3), totalMinor: 20_000, subtotalMinor: 19_000, deliveryMinor: 1000,
      items: [
        { productName: 'Focus Hoodie', sku: 'FOCUS-M', size: 'M', color: 'Black', quantity: 1, unitPriceMinor: 9000 },
        { productName: 'Scroll Hoodie', sku: 'SCROLL-L', size: 'L', color: 'Rose', quantity: 1, unitPriceMinor: 10_000 },
      ],
    }),
    order({ id: 'cancelled', createdAt: iso(5), status: 'cancelled', paymentStatus: 'refunded_mock', totalMinor: 15_000 }),
    order({ id: 'pending', createdAt: iso(2), status: 'processing', paymentStatus: 'pending', totalMinor: 8000 }),
    order({ id: 'old', createdAt: iso(60), totalMinor: 30_000 }),
  ],
  products: [{
    id: 'p1', slug: 'focus-hoodie', name: 'Focus Hoodie', category: 'hoodies', collection: 'CREWWW / GRAPHIC HOODIES',
    currency: 'USD', priceMinor: 9000, status: 'sample', isNew: true, bestSeller: false, imageUrl: '',
    variants: [
      { id: 'v1', productId: 'p1', sku: 'FOCUS-M', productName: 'Focus Hoodie', category: 'hoodies', collection: 'CREWWW / GRAPHIC HOODIES', size: 'M', color: 'Black', priceMinor: 9000, salePriceMinor: 8000, stockQuantity: 3 },
      { id: 'v2', productId: 'p1', sku: 'FOCUS-L', productName: 'Focus Hoodie', category: 'hoodies', collection: 'CREWWW / GRAPHIC HOODIES', size: 'L', color: 'Black', priceMinor: 9000, stockQuantity: 0 },
    ],
  }],
  customers: [],
  events: [
    { id: 'e1', type: 'drop_view', createdAt: iso(1), dropSlug: 'out-of-focus' },
    { id: 'e2', type: 'drop_add', createdAt: iso(2), dropSlug: 'life-in-scroll' },
    { id: 'e3', type: 'drop_view', createdAt: iso(60), dropSlug: 'outsourced-mind' },
    { id: 'e4', type: 'product_view', createdAt: iso(1), productId: 'p1', productSlug: 'focus-hoodie' },
    { id: 'e5', type: 'add_to_bag', createdAt: iso(2), productId: 'p1', productSlug: 'focus-hoodie' },
    { id: 'e6', type: 'search', createdAt: iso(1), query: 'Boxy hoodie' },
    { id: 'e7', type: 'fit_check', createdAt: iso(1), productSlug: 'focus-hoodie', query: 'true' },
  ],
  carts: [
    { id: 'c1', createdAt: iso(1), itemCount: 1, valueMinor: 9000 },
    { id: 'c2', createdAt: iso(2), itemCount: 2, valueMinor: 19_000 },
    { id: 'c3', createdAt: iso(2), itemCount: 0, valueMinor: 0 },
  ],
  wishlistCount: 2,
  newsletterCount: 3,
  contactCount: 1,
  limitations: [],
};

describe('computeAdminMetrics', () => {
  it('uses paid orders only and keeps money in minor units', () => {
    const metrics = computeAdminMetrics(baseData, 7, NOW);
    expect(metrics.kpis.paidOrders).toBe(2);
    expect(metrics.kpis.revenueMinor).toBe(29_000);
    expect(metrics.kpis.netRevenueMinor).toBe(29_000);
    expect(metrics.kpis.aovMinor).toBe(14_500);
    expect(metrics.kpis.units).toBe(3);
    expect(metrics.kpis.customers).toBe(1);
    expect(metrics.kpis.repeatCustomers).toBe(1);
    expect(metrics.trend).toHaveLength(7);
  });

  it('ranks products, sizes and collections from paid order items', () => {
    const metrics = computeAdminMetrics(baseData, 7, NOW);
    expect(metrics.products[0]).toMatchObject({ key: 'FOCUS-M', revenueMinor: 18_000, units: 2 });
    expect(metrics.sizes.map((row) => row.key)).toEqual(['M', 'L']);
    expect(metrics.collections[0]).toMatchObject({ key: 'CREWWW / GRAPHIC HOODIES', revenueMinor: 18_000 });
    expect(metrics.collections.find((row) => row.key === 'UNMAPPED')?.revenueMinor).toBe(10_000);
    expect(metrics.statuses.find((row) => row.key === 'cancelled')?.count).toBe(1);
  });

  it('values inventory at effective price and flags stock risk', () => {
    const metrics = computeAdminMetrics(baseData, 7, NOW);
    expect(metrics.kpis.inventoryValueMinor).toBe(24_000);
    expect(metrics.kpis.stockOnHand).toBe(3);
    expect(metrics.kpis.lowStockSkus).toBe(1);
    expect(metrics.kpis.outOfStockSkus).toBe(1);
    expect(metrics.lowStock[0].sku).toBe('FOCUS-M');
  });

  it('labels conversion as a proxy and excludes old drop events', () => {
    const metrics = computeAdminMetrics(baseData, 7, NOW);
    expect(metrics.kpis.conversionProxy).toBe(0.5);
    expect(metrics.kpis.fitChecks).toBe(1);
    expect(metrics.drops.map((row) => row.key)).toContain('out-of-focus');
    expect(metrics.drops.find((row) => row.key === 'outsourced-mind')?.count).toBe(0);
  });

  it('handles no orders without dividing by zero', () => {
    const metrics = computeAdminMetrics({ ...baseData, orders: [], carts: [] }, 30, NOW);
    expect(metrics.kpis.aovMinor).toBe(0);
    expect(metrics.kpis.conversionProxy).toBe(0);
    expect(metrics.trend).toHaveLength(30);
    expect(metrics.products).toEqual([]);
  });

  it('turns storefront interactions into product interest and demand rows', () => {
    const metrics = computeAdminMetrics(baseData, 7, NOW);
    expect(metrics.productInterest[0]).toMatchObject({ key: 'focus-hoodie', label: 'Focus Hoodie', count: 2, units: 4 });
    expect(metrics.searches[0]).toMatchObject({ key: 'boxy hoodie', label: 'Boxy hoodie', count: 1 });
  });

  it('generates owner insights from the computed signals', () => {
    const metrics = computeAdminMetrics(baseData, 7, NOW);
    expect(metrics.insights.some((insight) => insight.title.includes('close to sold out'))).toBe(true);
    expect(metrics.insights.some((insight) => insight.title.includes('leads drop interest'))).toBe(true);
  });
});
