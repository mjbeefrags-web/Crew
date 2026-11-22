import type { CommerceService, DemoOrder } from '../domain/commerce';

const ORDERS_KEY = 'crewww-demo-orders';

function readOrders(): DemoOrder[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(ORDERS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed as DemoOrder[] : [];
  } catch { return []; }
}

export const mockCommerceService: CommerceService = {
  async createDemoOrder(order) {
    const record: DemoOrder = {
      ...order,
      id: `DEMO-${Date.now().toString(36).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: 'demo-confirmed',
    };
    try { window.localStorage.setItem(ORDERS_KEY, JSON.stringify([record, ...readOrders()])); } catch { /* the confirmation remains in memory for this route */ }
    return record;
  },
  async listDemoOrders() { return readOrders(); },
  async getDemoOrder(id) { return readOrders().find((order) => order.id === id) ?? null; },
  calculateCartTotals(lines, products, promotionCode = '') {
    const currency = products[0]?.currency ?? 'USD';
    const subtotal = lines.reduce((sum, line) => {
      const product = products.find((item) => item.id === line.productId);
      return sum + (product ? (product.salePrice ?? product.price) * line.quantity : 0);
    }, 0);
    const promotionAccepted = promotionCode.trim().toUpperCase() === 'CREWWW10' && subtotal > 0;
    const discount = promotionAccepted ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
    const delivery = subtotal === 0 || subtotal >= 100 ? 0 : 8;
    return { subtotal, delivery, discount, total: subtotal + delivery - discount, currency, promotionAccepted };
  },
  async submitNewsletter(email) {
    const addresses = (() => { try { return JSON.parse(window.localStorage.getItem('crewww-demo-newsletter') ?? '[]') as string[]; } catch { return []; } })();
    if (!addresses.includes(email.toLowerCase())) addresses.push(email.toLowerCase());
    try { window.localStorage.setItem('crewww-demo-newsletter', JSON.stringify(addresses)); } catch { /* local-only preview */ }
    return { accepted: true, previewOnly: true };
  },
  async submitContact(message) {
    try {
      const messages = JSON.parse(window.localStorage.getItem('crewww-demo-contact') ?? '[]') as unknown[];
      window.localStorage.setItem('crewww-demo-contact', JSON.stringify([message, ...messages]));
    } catch { /* local-only preview */ }
    return { accepted: true, previewOnly: true };
  },
};
