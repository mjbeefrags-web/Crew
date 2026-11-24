import type {
  CatalogService,
  ProductPage,
  ProductQuery,
} from "../domain/service";
import type { Product, ProductCollection } from "../domain/product";
import { apiRequest } from "./apiClient";

type ApiPage = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
};
type ApiCollection = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

function paramsFor(query: ProductQuery = {}): URLSearchParams {
  const params = new URLSearchParams();
  const values: Record<string, string | number | undefined> = {
    term: query.term,
    category: query.category,
    collection: query.collection,
    size: query.size,
    color: query.color,
    fit: query.fit,
    wash: query.wash,
    min_price: query.minPrice,
    max_price: query.maxPrice,
    available: query.inStock ? "true" : undefined,
    new_only: query.newOnly ? "true" : undefined,
    best_seller: query.bestSeller ? "true" : undefined,
    sort:
      query.sort === "price-asc"
        ? "price-asc"
        : query.sort === "price-desc"
          ? "price-desc"
          : query.sort,
    page: query.page ?? 1,
    page_size: query.pageSize ?? 24,
  };
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params;
}

export const apiCatalogService: CatalogService = {
  async listFeaturedProducts() {
    return apiRequest<Product[]>("/api/v1/products/featured");
  },
  async listCollections() {
    const rows = await apiRequest<ApiCollection[]>("/api/v1/collections");
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.name,
      description: row.description,
      productIds: [],
    })) satisfies ProductCollection[];
  },
  async getProduct(slug) {
    try {
      return await apiRequest<Product>(
        `/api/v1/products/${encodeURIComponent(slug)}`,
      );
    } catch (error) {
      if (error instanceof Error && "status" in error && error.status === 404)
        return null;
      throw error;
    }
  },
  async listProducts(query = {}) {
    const page = await apiRequest<ApiPage>(
      `/api/v1/products?${paramsFor(query)}`,
    );
    return {
      items: page.items,
      total: page.total,
      page: page.page,
      pageSize: page.pageSize,
    } satisfies ProductPage;
  },
  async getRelatedProducts(productId, limit = 4) {
    const page = await this.listProducts({ pageSize: 48 });
    return page.items
      .filter((product) => product.id !== productId)
      .slice(0, limit);
  },
  async suggestProducts(term, limit = 5) {
    const page = await this.listProducts({
      term,
      pageSize: Math.min(limit, 48),
    });
    return page.items;
  },
};
