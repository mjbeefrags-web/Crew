import type { CartLine, DemoOrder } from "../domain/commerce";
import { apiRequest } from "./apiClient";

type ApiCart = {
  id: string;
  items: {
    id: string;
    product_id: string;
    sku: string;
    product_name: string;
    image_url: string;
    size: string;
    color: string;
    quantity: number;
    unit_price_minor: number;
    currency: string;
  }[];
  subtotal_minor: number;
  currency: string;
};
type Shipping = {
  first_name: string;
  last_name: string;
  email: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  region?: string;
  postal_code?: string;
  country_code: string;
};
type ApiOrder = {
  id: string;
  created_at: string;
  status: string;
  email: string;
  currency: string;
  subtotal_minor: number;
  delivery_minor: number;
  total_minor: number;
  payment_status: string;
  items: {
    product_name: string;
    sku: string;
    size: string;
    color: string;
    unit_price_minor: number;
    quantity: number;
  }[];
};

export function mapApiCart(cart: ApiCart): CartLine[] {
  return cart.items.map((item) => ({
    productId: item.product_id,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    sku: item.sku,
    serverLineId: item.id,
  }));
}

function mapOrder(order: ApiOrder): DemoOrder {
  return {
    id: order.id,
    createdAt: order.created_at,
    email: order.email,
    lines: order.items.map((item) => ({
      productId: item.sku.split("-").slice(0, -2).join("-"),
      size: item.size,
      color: item.color,
      quantity: item.quantity,
    })),
    subtotal: order.subtotal_minor / 100,
    delivery: order.delivery_minor / 100,
    discount: 0,
    total: order.total_minor / 100,
    currency: order.currency,
    paymentMethod: "mock-card",
    status: "demo-confirmed",
  };
}

export const apiCommerceService = {
  async getCart(): Promise<CartLine[]> {
    return mapApiCart(await apiRequest<ApiCart>("/api/v1/cart"));
  },
  async clearCart(): Promise<CartLine[]> {
    return mapApiCart(
      await apiRequest<ApiCart>("/api/v1/cart", { method: "DELETE" }),
    );
  },
  async addCartLine(line: CartLine): Promise<CartLine[]> {
    const cart = await apiRequest<ApiCart>("/api/v1/cart/items", {
      method: "POST",
      body: JSON.stringify({
        product_id: line.productId,
        size: line.size,
        color: line.color,
        quantity: line.quantity,
      }),
    });
    return mapApiCart(cart);
  },
  async setCartLineQuantity(
    line: CartLine,
    quantity: number,
  ): Promise<CartLine[]> {
    if (!line.serverLineId)
      throw new Error(
        "This bag line is no longer available. Refresh the bag and try again.",
      );
    const cart = await apiRequest<ApiCart>(
      `/api/v1/cart/items/${line.serverLineId}`,
      { method: "PATCH", body: JSON.stringify({ quantity }) },
    );
    return mapApiCart(cart);
  },
  async removeCartLine(line: CartLine): Promise<CartLine[]> {
    if (!line.serverLineId)
      throw new Error(
        "This bag line is no longer available. Refresh the bag and try again.",
      );
    const cart = await apiRequest<ApiCart>(
      `/api/v1/cart/items/${line.serverLineId}`,
      { method: "DELETE" },
    );
    return mapApiCart(cart);
  },
  async getWishlist(): Promise<string[]> {
    return apiRequest<string[]>("/api/v1/wishlist");
  },
  async setWishlist(productId: string, saved: boolean): Promise<string[]> {
    await apiRequest<void>(`/api/v1/wishlist/${productId}`, {
      method: saved ? "PUT" : "DELETE",
    });
    return this.getWishlist();
  },
  async checkout(
    lines: readonly CartLine[],
    shipping: Shipping,
    deliveryMethod: "standard" | "express",
    paymentMethod: "mock-card" | "pay-on-delivery",
  ): Promise<DemoOrder> {
    const key = crypto.randomUUID();
    const order = await apiRequest<ApiOrder>(
      "/api/v1/checkout",
      {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({
          lines: lines.map(({ productId, size, color, quantity }) => ({
            product_id: productId,
            size,
            color,
            quantity,
          })),
          shipping,
          delivery_method: deliveryMethod,
          payment_method: paymentMethod,
        }),
      },
      false,
    );
    return mapOrder(order);
  },
  async getOrder(id: string): Promise<DemoOrder | null> {
    try {
      return mapOrder(await apiRequest<ApiOrder>(`/api/v1/orders/${id}`));
    } catch (error) {
      if (error instanceof Error && "status" in error && error.status === 404)
        return null;
      throw error;
    }
  },
  async listOrders(): Promise<DemoOrder[]> {
    return (await apiRequest<ApiOrder[]>("/api/v1/orders")).map(mapOrder);
  },
  async submitNewsletter(email: string): Promise<void> {
    await apiRequest("/api/v1/newsletter", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
  async submitContact(message: {
    name: string;
    email: string;
    topic: string;
    message: string;
  }): Promise<void> {
    await apiRequest("/api/v1/contact", {
      method: "POST",
      body: JSON.stringify(message),
    });
  },
};
