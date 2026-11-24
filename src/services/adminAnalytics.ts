import type {
  AdminData,
  AdminMetrics,
  AdminOrder,
  AdminProduct,
  AdminVariant,
  BreakdownRow,
  MetricRange,
  TimePoint,
} from "../domain/admin";
import { drops } from "../data/drops";
import { formatMoneyMinor, formatPercent } from "../utils/formatMoneyMinor";

type Accumulator = {
  key: string;
  label: string;
  revenueMinor: number;
  units: number;
  count: number;
  color?: string;
};
const DAY_MS = 86_400_000;
const LOW_STOCK = 5;
const FREE_DELIVERY_MINOR = 10_000;
const CHART_COLORS = [
  "#c9ef68",
  "#edc69d",
  "#9bb7ff",
  "#d7a4ae",
  "#8bd3c1",
  "#e0c56a",
  "#b9a7e8",
];

/** Editorial attribution used until drops are modeled as purchasable SKUs. */
const dropProductSlugs: Record<string, string[]> = {
  "out-of-focus": ["vivre-la-vie-hoodie", "passion-racing-hoodie"],
  "life-in-scroll": ["cherry-blossom-hoodie", "new-york-hoodie"],
  "the-gift-theory": ["crew-script-hoodie", "joy-of-outdoors-hoodie"],
  "lost-in-the-frequency": ["tokyo-graphic-hoodie", "crane-garden-hoodie"],
  "outsourced-mind": ["vivre-la-vie-hoodie", "crew-script-hoodie"],
};

const isPaid = (order: AdminOrder) =>
  order.status !== "cancelled" && order.paymentStatus === "succeeded";
const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);
const titleCase = (value: string) =>
  value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function addRow(
  map: Map<string, Accumulator>,
  key: string,
  label: string,
  revenueMinor: number,
  units: number,
  color?: string,
) {
  const current = map.get(key) ?? {
    key,
    label,
    revenueMinor: 0,
    units: 0,
    count: 0,
    color,
  };
  current.revenueMinor += revenueMinor;
  current.units += units;
  current.count += 1;
  map.set(key, current);
}

function toRows(
  map: Map<string, Accumulator>,
  by = "revenue" as "revenue" | "count",
): BreakdownRow[] {
  return [...map.values()]
    .sort((a, b) =>
      by === "revenue"
        ? b.revenueMinor - a.revenueMinor || b.count - a.count
        : b.count - a.count || b.units - a.units,
    )
    .map(({ key, label, revenueMinor, units, count, color }) => ({
      key,
      label,
      revenueMinor,
      units,
      count,
      color,
    }));
}

function buildProductIndex(products: AdminProduct[]) {
  const index = new Map<string, AdminProduct>();
  for (const product of products) {
    index.set(product.id, product);
    index.set(product.slug, product);
    index.set(product.name.toLowerCase(), product);
    for (const variant of product.variants) index.set(variant.sku, product);
  }
  return index;
}

function findProduct(
  index: Map<string, AdminProduct>,
  item: AdminOrder["items"][number],
) {
  return (
    index.get(item.productId ?? "") ??
    index.get(item.sku) ??
    index.get(item.productName.toLowerCase())
  );
}

function isoDayOffset(days: number, now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days),
  );
}

export function computeAdminMetrics(
  data: AdminData,
  rangeDays: MetricRange,
  now = new Date(),
): AdminMetrics {
  const start = isoDayOffset(rangeDays - 1, now);
  const startTime = start.getTime();
  const endTime = now.getTime();
  const inRange = (iso: string) => {
    const time = new Date(iso).getTime();
    return Number.isFinite(time) && time >= startTime && time <= endTime;
  };

  const orders = data.orders.filter((order) => inRange(order.createdAt));
  const paidOrders = orders.filter(isPaid);
  const revenueMinor = paidOrders.reduce(
    (sum, order) => sum + order.totalMinor,
    0,
  );
  const netRevenueMinor = revenueMinor;
  const units = paidOrders.reduce(
    (sum, order) =>
      sum + order.items.reduce((lineSum, item) => lineSum + item.quantity, 0),
    0,
  );
  const aovMinor = paidOrders.length
    ? Math.round(revenueMinor / paidOrders.length)
    : 0;

  const trendMap = new Map<string, TimePoint>();
  for (let day = 0; day < rangeDays; day += 1) {
    const key = new Date(start.getTime() + day * DAY_MS)
      .toISOString()
      .slice(0, 10);
    trendMap.set(key, {
      date: key,
      label: new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      revenueMinor: 0,
      orders: 0,
      units: 0,
    });
  }
  for (const order of paidOrders) {
    const point = trendMap.get(dayKey(order.createdAt));
    if (!point) continue;
    point.revenueMinor += order.totalMinor;
    point.orders += 1;
    point.units += order.items.reduce((sum, item) => sum + item.quantity, 0);
  }
  const trend = [...trendMap.values()];

  const productIndex = buildProductIndex(data.products);
  const productRows = new Map<string, Accumulator>();
  const collectionRows = new Map<string, Accumulator>();
  const sizeRows = new Map<string, Accumulator>();
  const colorRows = new Map<string, Accumulator>();
  const statusRows = new Map<string, Accumulator>();
  const customerRows = new Map<string, Accumulator>();

  for (const order of orders) {
    addRow(
      statusRows,
      order.status,
      titleCase(order.status),
      order.totalMinor,
      0,
    );
    if (!isPaid(order)) continue;
    addRow(
      customerRows,
      order.email.toLowerCase(),
      order.email,
      order.totalMinor,
      0,
    );
    for (const item of order.items) {
      const itemRevenue = item.unitPriceMinor * item.quantity;
      addRow(
        productRows,
        item.sku,
        item.productName,
        itemRevenue,
        item.quantity,
      );
      const product = findProduct(productIndex, item);
      addRow(
        collectionRows,
        product?.collection ?? "UNMAPPED",
        (product?.collection ?? "UNMAPPED").replace("CREWWW / ", ""),
        itemRevenue,
        item.quantity,
      );
      addRow(
        sizeRows,
        item.size.toUpperCase(),
        item.size.toUpperCase(),
        itemRevenue,
        item.quantity,
      );
      addRow(
        colorRows,
        item.color.toLowerCase(),
        item.color,
        itemRevenue,
        item.quantity,
      );
    }
  }

  const dropRows = new Map<string, Accumulator>();
  for (const event of data.events.filter(
    (item) => inRange(item.createdAt) && item.dropSlug,
  )) {
    const drop = drops.find((item) => item.slug === event.dropSlug);
    const weight =
      event.type === "drop_add" ? 4 : event.type === "drop_colorway" ? 2 : 1;
    let revenueMinor = 0;
    if (event.type === "drop_add") {
      revenueMinor = paidOrders.reduce(
        (sum, order) =>
          sum +
          order.items.reduce((lineSum, item) => {
            const product = findProduct(productIndex, item);
            return product &&
              (dropProductSlugs[event.dropSlug ?? ""] ?? []).includes(
                product.slug,
              )
              ? lineSum + item.unitPriceMinor * item.quantity
              : lineSum;
          }, 0),
        0,
      );
    }
    addRow(
      dropRows,
      event.dropSlug!,
      drop?.name ?? titleCase(event.dropSlug!),
      revenueMinor,
      weight,
    );
  }
  for (const drop of drops) {
    if (!dropRows.has(drop.slug))
      dropRows.set(drop.slug, {
        key: drop.slug,
        label: drop.name,
        revenueMinor: 0,
        units: 0,
        count: 0,
      });
  }
  const dropBreakdown = toRows(dropRows, "count").map((row, index) => ({
    ...row,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const interestRows = new Map<string, Accumulator>();
  const searchRows = new Map<string, Accumulator>();
  for (const event of data.events.filter((item) => inRange(item.createdAt))) {
    if (event.type === "product_view" || event.type === "add_to_bag") {
      const product =
        productIndex.get(event.productId ?? "") ??
        productIndex.get(event.productSlug ?? "");
      const key =
        product?.slug ?? event.productSlug ?? event.productId ?? "unknown";
      addRow(
        interestRows,
        key,
        product?.name ?? titleCase(key),
        0,
        event.type === "add_to_bag" ? 3 : 1,
      );
    }
    if (event.type === "search" && event.query?.trim()) {
      const term = event.query.trim().toLowerCase();
      addRow(searchRows, term, event.query.trim(), 0, 1);
    }
  }
  const productInterest = toRows(interestRows, "count").map((row, index) => ({
    ...row,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));
  const searches = toRows(searchRows, "count")
    .slice(0, 8)
    .map((row, index) => ({
      ...row,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

  const variants = data.products.flatMap((product) => product.variants);
  const effectivePrice = (variant: AdminVariant) =>
    variant.salePriceMinor ?? variant.priceMinor;
  const stockOnHand = variants.reduce(
    (sum, variant) => sum + Math.max(0, variant.stockQuantity),
    0,
  );
  const inventoryValueMinor = variants.reduce(
    (sum, variant) =>
      sum + Math.max(0, variant.stockQuantity) * effectivePrice(variant),
    0,
  );
  const lowStock = variants
    .filter(
      (variant) =>
        variant.stockQuantity > 0 && variant.stockQuantity <= LOW_STOCK,
    )
    .sort(
      (a, b) => a.stockQuantity - b.stockQuantity || a.sku.localeCompare(b.sku),
    );
  const outOfStockSkus = variants.filter(
    (variant) => variant.stockQuantity === 0,
  ).length;

  const inventoryRows = new Map<string, Accumulator>();
  for (const variant of variants) {
    const label = variant.collection.replace("CREWWW / ", "");
    addRow(
      inventoryRows,
      variant.collection,
      label,
      Math.max(0, variant.stockQuantity) * effectivePrice(variant),
      Math.max(0, variant.stockQuantity),
    );
  }

  const fitChecks = data.events.filter(
    (event) => inRange(event.createdAt) && event.type === "fit_check",
  ).length;
  const activeCarts = new Set(
    data.carts.filter((cart) => cart.itemCount > 0).map((cart) => cart.id),
  ).size;
  const conversionProxy =
    activeCarts + paidOrders.length > 0
      ? paidOrders.length / (activeCarts + paidOrders.length)
      : 0;
  const emails = paidOrders.map((order) => order.email.toLowerCase());
  const customers = new Set(emails).size;
  const repeatCustomers = new Set(
    emails.filter((email, index) => emails.indexOf(email) !== index),
  ).size;
  const cancelled = orders.filter(
    (order) => order.status === "cancelled",
  ).length;
  const cancelRate = orders.length ? cancelled / orders.length : 0;

  const topCustomers = [...customerRows.values()]
    .sort((a, b) => b.revenueMinor - a.revenueMinor)
    .slice(0, 6)
    .map((row) => {
      const customerOrders = paidOrders.filter(
        (order) => order.email.toLowerCase() === row.key,
      );
      return {
        email: row.label,
        orders: customerOrders.length,
        revenueMinor: row.revenueMinor,
        lastOrderAt:
          customerOrders
            .map((order) => order.createdAt)
            .sort()
            .at(-1) ?? "",
      };
    });

  const withColor = (map: Map<string, Accumulator>) =>
    toRows(map).map((row, index) => ({
      ...row,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  const insights: AdminMetrics["insights"] = [];
  if (lowStock.length)
    insights.push({
      tone: "action",
      title: `${lowStock.length} ${lowStock.length === 1 ? "variant is" : "variants are"} close to sold out`,
      body: `Restock ${lowStock
        .slice(0, 2)
        .map((variant) => variant.sku)
        .join(
          " and ",
        )} before the next drop. Low stock suppresses size-choice confidence.`,
    });
  if (outOfStockSkus)
    insights.push({
      tone: "watch",
      title: `${outOfStockSkus} variants have no stock`,
      body: "Hide or back-in-stock these sizes so shoppers never hit a dead add-to-bag.",
    });
  if (conversionProxy < 0.35 && activeCarts)
    insights.push({
      tone: "action",
      title: `Cart-to-order proxy is ${formatPercent(conversionProxy)}`,
      body: `Test the ${formatMoneyMinor(FREE_DELIVERY_MINOR)} free-delivery threshold and a cart reminder before checkout.`,
    });
  if (aovMinor > 0 && aovMinor < FREE_DELIVERY_MINOR)
    insights.push({
      tone: "watch",
      title: `Average order is ${formatMoneyMinor(aovMinor)}`,
      body: `Add a complete-the-look bundle to reach the ${formatMoneyMinor(FREE_DELIVERY_MINOR)} delivery threshold.`,
    });
  if (dropBreakdown[0]?.count)
    insights.push({
      tone: "good",
      title: `${dropBreakdown[0].label} leads drop interest`,
      body: "Pair this story with the strongest converting colourway in the next newsletter and home-page module.",
    });
  if (cancelRate > 0.08)
    insights.push({
      tone: "watch",
      title: `Cancellation rate is ${formatPercent(cancelRate)}`,
      body: "Review size guidance and product copy; repeated cancellation usually starts on the PDP.",
    });
  if (productInterest.length && units === 0)
    insights.push({
      tone: "action",
      title: `${productInterest[0].label} is getting attention, not orders`,
      body: "Add clearer fit guidance and a stronger add-to-bag path on the product page to turn views into sales.",
    });

  return {
    source: data.source,
    generatedAt: data.generatedAt,
    rangeDays,
    kpis: {
      revenueMinor,
      netRevenueMinor,
      orders: orders.length,
      paidOrders: paidOrders.length,
      aovMinor,
      units,
      customers,
      repeatCustomers,
      conversionProxy,
      fitChecks,
      inventoryValueMinor,
      stockOnHand,
      lowStockSkus: lowStock.length,
      outOfStockSkus,
    },
    trend,
    products: withColor(productRows),
    collections: withColor(collectionRows),
    sizes: withColor(sizeRows),
    colors: withColor(colorRows),
    statuses: withColor(statusRows),
    drops: dropBreakdown,
    productInterest,
    searches,
    inventoryByCollection: withColor(inventoryRows),
    recentOrders: [...data.orders]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8),
    lowStock,
    topCustomers,
    insights: insights.slice(0, 5),
  };
}
