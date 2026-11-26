import type {
  AdminData,
  AdminEvent,
  AdminOrder,
  AdminProduct,
  AdminVariant,
  AiAdvice,
} from "../domain/admin";
import type { AdminService } from "./adminService";
import { featuredProducts } from "../data/mock/catalog";
import { previewProducts } from "../data/mock/previewProducts";
import { drops } from "../data/drops";
import { mockCommerceService } from "./mockCommerceService";
import { readInsightEvents } from "../lib/insights";

const DAY_MS = 86_400_000;
const EMAILS = [
  "ada@crewww.test",
  "noor@crewww.test",
  "milo@crewww.test",
  "safia@crewww.test",
  "ren@crewww.test",
  "jules@crewww.test",
  "kai@crewww.test",
  "amara@crewww.test",
];
const NAMES = [
  ["Ada", "Mensah"],
  ["Noor", "Haddad"],
  ["Milo", "Vance"],
  ["Safia", "Rahman"],
  ["Ren", "Okafor"],
  ["Jules", "Marsh"],
  ["Kai", "Bello"],
  ["Amara", "Diallo"],
];

const random = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

function readArray<T>(key: string, guard: (value: unknown) => value is T): T[] {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(key) ?? "[]",
    );
    return Array.isArray(parsed) ? parsed.filter(guard) : [];
  } catch {
    return [];
  }
}

function sampleProducts(): AdminProduct[] {
  return [...featuredProducts, ...previewProducts].map((product, index) => {
    const priceMinor = Math.round((product.salePrice ?? product.price) * 100);
    const variants: AdminVariant[] = product.sizes.map((size, sizeIndex) => ({
      id: `v-${product.id}-${sizeIndex}`,
      productId: product.id,
      sku: `${product.slug.toUpperCase()}-${size.toUpperCase()}`,
      productName: product.name,
      category: product.category,
      collection: product.collection,
      size,
      color: product.color,
      priceMinor,
      ...(product.salePrice
        ? { salePriceMinor: Math.round(product.salePrice * 100) }
        : {}),
      stockQuantity: [18, 4, 0, 21, 7, 2, 14][(index + sizeIndex) % 7],
      imageUrl: product.imageUrl,
    }));
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      collection: product.collection,
      currency: product.currency,
      priceMinor,
      ...(product.salePrice
        ? { salePriceMinor: Math.round(product.salePrice * 100) }
        : {}),
      status: product.isPreviewData ? "preview" : "sample",
      isNew: product.isNew,
      bestSeller: product.bestSeller,
      imageUrl: product.imageUrl,
      variants,
    };
  });
}

function sampleOrders(now: Date, products: AdminProduct[]): AdminOrder[] {
  const sellable = products.filter((product) => product.status === "sample");
  const orders: AdminOrder[] = [];
  for (let day = 44; day >= 0; day -= 1) {
    const count = Math.floor(random(day + 11) * 3) + (day % 7 === 0 ? 0 : 1);
    for (let index = 0; index < count; index += 1) {
      const seed = day * 17 + index * 41;
      const product = sellable[Math.floor(random(seed + 3) * sellable.length)];
      const variant =
        product.variants[
          Math.floor(random(seed + 5) * product.variants.length)
        ];
      const quantity = random(seed + 7) > 0.76 ? 2 : 1;
      const unitPriceMinor = variant.salePriceMinor ?? variant.priceMinor;
      const subtotalMinor = unitPriceMinor * quantity;
      const deliveryMinor = subtotalMinor >= 10_000 ? 0 : 800;
      const cancelled = random(seed + 9) > 0.94;
      const pending = !cancelled && random(seed + 13) > 0.9;
      const date = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - day,
          9 + Math.floor(random(seed + 17) * 11),
          Math.floor(random(seed + 19) * 60),
        ),
      );
      if (date.getTime() > now.getTime()) date.setTime(now.getTime() - 60_000);
      const email = EMAILS[Math.floor(random(seed + 23) * EMAILS.length)];
      orders.push({
        id: `SAMPLE-${day}-${index}`,
        createdAt: date.toISOString(),
        email,
        currency: "USD",
        status: cancelled ? "cancelled" : pending ? "processing" : "delivered",
        paymentStatus: cancelled
          ? "refunded_mock"
          : pending
            ? "pending"
            : "succeeded",
        subtotalMinor,
        deliveryMinor,
        totalMinor: subtotalMinor + deliveryMinor,
        items: [
          {
            productId: product.id,
            productName: product.name,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            quantity,
            unitPriceMinor,
          },
        ],
      });
    }
  }
  return orders;
}

async function localOrders(products: AdminProduct[]): Promise<AdminOrder[]> {
  const records = await mockCommerceService.listDemoOrders();
  const index = new Map(products.map((product) => [product.id, product]));
  return records.map((order, orderIndex) => {
    const product = index.get(order.lines[0]?.productId ?? "");
    const quantity =
      order.lines.reduce((sum, line) => sum + line.quantity, 0) || 1;
    return {
      id: order.id,
      createdAt: order.createdAt,
      email: order.email,
      currency: order.currency,
      status: "demo-confirmed",
      paymentStatus: "succeeded",
      subtotalMinor: Math.round(order.subtotal * 100),
      deliveryMinor: Math.round(order.delivery * 100),
      totalMinor: Math.round(order.total * 100),
      items: order.lines.map((line, lineIndex) => ({
        productId: line.productId,
        productName: product?.name ?? `Product ${lineIndex + 1}`,
        sku: product
          ? `${product.slug.toUpperCase()}-${line.size.toUpperCase()}`
          : `DEMO-${orderIndex}-${lineIndex}`,
        size: line.size,
        color: line.color,
        quantity: line.quantity,
        unitPriceMinor: product
          ? (product.salePriceMinor ?? product.priceMinor)
          : Math.round((order.subtotal / quantity) * 100),
      })),
    };
  });
}

function sampleEvents(now: Date): AdminEvent[] {
  const events: AdminEvent[] = [];
  for (const [dropIndex, drop] of drops.entries()) {
    const views = 16 - dropIndex * 2;
    for (let index = 0; index < views; index += 1) {
      const daysAgo = Math.floor(random(dropIndex * 100 + index) * 28);
      const date = new Date(now.getTime() - daysAgo * DAY_MS - index * 60_000);
      const type =
        index % 7 === 0
          ? "drop_add"
          : index % 3 === 0
            ? "drop_colorway"
            : "drop_view";
      events.push({
        id: `sample-${drop.slug}-${index}`,
        type,
        createdAt: date.toISOString(),
        dropSlug: drop.slug,
        ...(type === "drop_add"
          ? { productSlug: dropProductSlugsFor(drop.slug)[0] }
          : {}),
      });
    }
  }
  return events;
}

function dropProductSlugsFor(slug: string): string[] {
  const mapping: Record<string, string[]> = {
    "out-of-focus": ["vivre-la-vie-hoodie", "passion-racing-hoodie"],
    "life-in-scroll": ["cherry-blossom-hoodie", "new-york-hoodie"],
    "the-gift-theory": ["crew-script-hoodie", "joy-of-outdoors-hoodie"],
    "lost-in-the-frequency": ["tokyo-graphic-hoodie", "crane-garden-hoodie"],
    "outsourced-mind": ["vivre-la-vie-hoodie", "crew-script-hoodie"],
  };
  return mapping[slug] ?? [];
}

function sampleCarts(now: Date, products: AdminProduct[]) {
  return Array.from({ length: 160 }, (_, index) => {
    const product = products[index % 8];
    const itemCount = 1 + Math.floor(random(index + 71) * 3);
    const daysAgo = Math.floor(random(index + 29) * 30);
    return {
      id: `sample-cart-${index}`,
      createdAt: new Date(now.getTime() - daysAgo * DAY_MS).toISOString(),
      itemCount: random(index + 31) > 0.22 ? itemCount : 0,
      valueMinor: product.priceMinor * itemCount,
    };
  });
}

export const mockAdminService: AdminService = {
  async advise(signals, question = ""): Promise<AiAdvice> {
    const kpis =
      signals.kpis && typeof signals.kpis === "object"
        ? (signals.kpis as Record<string, unknown>)
        : {};
    const value = (key: string) => {
      const raw = kpis[key];
      return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
    };
    const low = value("lowStockSkus");
    const out = value("outOfStockSkus");
    const conversion = value("conversionProxy");
    const recommendations = [
      low || out
        ? {
            title: "Replenish before the next drop lands",
            detail: `${low} low-stock and ${out} sold-out SKUs. Reorder the fastest size/colour pairs first.`,
            priority: "high" as const,
            horizon: "This week",
            evidence: "Local preview stock snapshot",
          }
        : null,
      conversion && conversion < 0.35
        ? {
            title: "Tighten the product page before buying traffic",
            detail:
              "Conversion is under 35%. Lead with approved photography, make size choice explicit and move delivery terms next to the CTA.",
            priority: "high" as const,
            horizon: "Next sprint",
            evidence: `conversionProxy=${conversion.toFixed(2)}`,
          }
        : null,
      {
        title: question
          ? `Review the full edit for “${question}”`
          : "Instrument the next drop",
        detail:
          "Connect real stock and drop events so this advisor can separate views, add-to-bag and purchases for every drop.",
        priority: "medium" as const,
        horizon: "Before launch",
        evidence: "Demo mode uses sample data",
      },
    ].filter(Boolean) as AiAdvice["recommendations"];
    return {
      provider: "local-rag (demo)",
      summary: `Next best move: ${recommendations[0]?.title ?? "review your signals"}.`,
      recommendations,
      sources: [
        {
          title: "Scaling drops",
          excerpt:
            "Ship each drop as a collection with stable slugs, its own SKU set and real stock links.",
        },
        {
          title: "Conversion and product presentation",
          excerpt:
            "Lead with product photography; keep size selection explicit and trust signals near the CTA.",
        },
      ],
    };
  },
  async load(): Promise<AdminData> {
    const now = new Date();
    const products = sampleProducts();
    const [placedOrders] = await Promise.all([localOrders(products)]);
    const session = readArray<{ email?: string }>(
      "crewww-demo-session",
      (value): value is { email?: string } =>
        Boolean(value && typeof value === "object"),
    );
    const bag = readArray<{ productId: string; quantity: number }>(
      "arcfield-bag",
      (value): value is { productId: string; quantity: number } =>
        Boolean(
          value &&
          typeof value === "object" &&
          typeof (value as { productId?: unknown }).productId === "string",
        ),
    );
    const wishlist = readArray<string>(
      "arcfield-wishlist",
      (value): value is string => typeof value === "string",
    );
    const newsletter = readArray<string>(
      "crewww-demo-newsletter",
      (value): value is string => typeof value === "string",
    );
    const contacts = readArray<unknown>(
      "crewww-demo-contact",
      (_value): _value is unknown => true,
    );

    const customers = [
      ...new Set([...EMAILS, session[0]?.email ?? ""].filter(Boolean)),
    ].map((email, index) => {
      const [firstName, lastName] = NAMES[index % NAMES.length];
      return {
        id: `demo-customer-${index}`,
        email,
        firstName,
        lastName,
        role: "customer",
        isActive: true,
        createdAt: new Date(
          now.getTime() - (60 - index * 4) * DAY_MS,
        ).toISOString(),
      };
    });

    const currentBagValue = bag.reduce((sum, line) => {
      const product = products.find((item) => item.id === line.productId);
      return sum + (product?.priceMinor ?? 0) * line.quantity;
    }, 0);

    return {
      source: "demo",
      generatedAt: now.toISOString(),
      orders: [...placedOrders, ...sampleOrders(now, products)],
      products,
      customers,
      events: [...readInsightEvents(), ...sampleEvents(now)],
      carts: [
        ...sampleCarts(now, products),
        {
          id: "current-bag",
          createdAt: now.toISOString(),
          itemCount: bag.reduce((sum, line) => sum + line.quantity, 0),
          valueMinor: currentBagValue,
        },
      ],
      wishlistCount: wishlist.length,
      newsletterCount: newsletter.length,
      contactCount: contacts.length,
      limitations: [
        "Synthetic local preview: sample orders are generated for dashboard demonstration, not real sales.",
        "Orders you place in this browser are added to the sample history.",
        "Drop attribution is editorial and approximate until drops are linked to SKUs in the backend.",
      ],
    };
  },
};
