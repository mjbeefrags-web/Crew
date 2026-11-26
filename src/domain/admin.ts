/** Shared admin domain model. All money values are integer minor units. */

export type AdminDataSource = "api" | "demo";
export type MetricRange = 7 | 30 | 90;

export type AdminOrderItem = {
  productId?: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unitPriceMinor: number;
};

export type AdminOrder = {
  id: string;
  createdAt: string;
  email: string;
  currency: string;
  status: string;
  paymentStatus: string;
  subtotalMinor: number;
  deliveryMinor: number;
  totalMinor: number;
  items: AdminOrderItem[];
  userId?: string;
};

export type AdminVariant = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  category: string;
  collection: string;
  size: string;
  color: string;
  priceMinor: number;
  salePriceMinor?: number;
  stockQuantity: number;
  imageUrl?: string;
};

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  collection: string;
  currency: string;
  priceMinor: number;
  salePriceMinor?: number;
  status: string;
  isNew: boolean;
  bestSeller: boolean;
  imageUrl: string;
  variants: AdminVariant[];
};

export type AdminCustomer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
};

export type AdminEventType =
  | "product_view"
  | "add_to_bag"
  | "drop_view"
  | "drop_colorway"
  | "drop_add"
  | "world_destination"
  | "search"
  | "fit_check"
  | "sound_opt_in";

export type AdminEvent = {
  id: string;
  type: AdminEventType;
  createdAt: string;
  productId?: string;
  productSlug?: string;
  sku?: string;
  dropSlug?: string;
  destination?: string;
  query?: string;
};

export type AdminCart = {
  id: string;
  createdAt: string;
  itemCount: number;
  valueMinor: number;
};

export type AdminData = {
  source: AdminDataSource;
  generatedAt: string;
  orders: AdminOrder[];
  products: AdminProduct[];
  customers: AdminCustomer[];
  events: AdminEvent[];
  carts: AdminCart[];
  wishlistCount: number;
  newsletterCount: number;
  contactCount: number;
  limitations: string[];
};

export type TimePoint = {
  date: string;
  label: string;
  revenueMinor: number;
  orders: number;
  units: number;
};

export type BreakdownRow = {
  key: string;
  label: string;
  revenueMinor: number;
  units: number;
  count: number;
  color?: string;
};

export type AdminInsight = {
  tone: "good" | "watch" | "action";
  title: string;
  body: string;
};

export type AiRecommendation = {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  horizon: string;
  evidence: string;
};

export type AiSource = {
  title: string;
  excerpt: string;
};

export type AiAdvice = {
  provider: string;
  summary: string;
  recommendations: AiRecommendation[];
  sources: AiSource[];
};

export type AdminMetrics = {
  source: AdminDataSource;
  generatedAt: string;
  rangeDays: MetricRange;
  kpis: {
    revenueMinor: number;
    netRevenueMinor: number;
    orders: number;
    paidOrders: number;
    aovMinor: number;
    units: number;
    customers: number;
    repeatCustomers: number;
    conversionProxy: number;
    fitChecks: number;
    inventoryValueMinor: number;
    stockOnHand: number;
    lowStockSkus: number;
    outOfStockSkus: number;
  };
  trend: TimePoint[];
  products: BreakdownRow[];
  collections: BreakdownRow[];
  sizes: BreakdownRow[];
  colors: BreakdownRow[];
  statuses: BreakdownRow[];
  drops: BreakdownRow[];
  productInterest: BreakdownRow[];
  searches: BreakdownRow[];
  inventoryByCollection: BreakdownRow[];
  recentOrders: AdminOrder[];
  lowStock: AdminVariant[];
  topCustomers: {
    email: string;
    orders: number;
    revenueMinor: number;
    lastOrderAt: string;
  }[];
  insights: AdminInsight[];
};
