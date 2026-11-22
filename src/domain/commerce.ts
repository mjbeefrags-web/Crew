export type CartLine = {
  productId: string;
  size: string;
  color: string;
  quantity: number;
};

export type DemoOrder = {
  id: string;
  createdAt: string;
  email: string;
  lines: readonly CartLine[];
  subtotal: number;
  delivery: number;
  discount: number;
  total: number;
  currency: string;
  paymentMethod: 'mock-card' | 'pay-on-delivery';
  status: 'demo-confirmed';
};

export type ContactSubmission = { name: string; email: string; topic: string; message: string };
export type CartTotals = { subtotal: number; delivery: number; discount: number; total: number; currency: string; promotionAccepted: boolean };

export interface CommerceService {
  createDemoOrder(order: Omit<DemoOrder, 'id' | 'createdAt' | 'status'>): Promise<DemoOrder>;
  listDemoOrders(): Promise<readonly DemoOrder[]>;
  getDemoOrder(id: string): Promise<DemoOrder | null>;
  calculateCartTotals(lines: readonly CartLine[], products: readonly import('./product').Product[], promotionCode?: string): CartTotals;
  submitNewsletter(email: string): Promise<{ accepted: true; previewOnly: true }>;
  submitContact(message: ContactSubmission): Promise<{ accepted: true; previewOnly: true }>;
}
