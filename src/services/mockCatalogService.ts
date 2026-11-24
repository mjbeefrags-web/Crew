import { featuredCollections, featuredProducts } from "../data/mock/catalog";
import { previewProducts } from "../data/mock/previewProducts";
import { psychedelicProducts } from "../data/psychedelicProducts";
import type { CatalogService, ProductQuery } from "../domain/service";

const demoCatalog = [
  ...featuredProducts,
  ...previewProducts,
  ...psychedelicProducts,
];

function matchesQuery(
  product: (typeof demoCatalog)[number],
  query: ProductQuery,
) {
  const term = query.term?.trim().toLocaleLowerCase();
  const searchable =
    `${product.name} ${product.category} ${product.collection} ${product.description} ${product.fit ?? ""} ${product.wash ?? ""}`.toLocaleLowerCase();
  if (term && !searchable.includes(term)) return false;
  if (query.category && product.category !== query.category) return false;
  if (query.categories?.length && !query.categories.includes(product.category))
    return false;
  if (
    query.audience &&
    product.audience !== query.audience &&
    product.audience !== "unisex"
  )
    return false;
  if (query.collection && product.collection !== query.collection) return false;
  if (query.size && !product.sizes.includes(query.size)) return false;
  if (
    query.color &&
    !product.colors.some(
      (color) =>
        color.name.toLocaleLowerCase() === query.color?.toLocaleLowerCase(),
    )
  )
    return false;
  if (query.fit && product.fit !== query.fit) return false;
  if (query.wash && product.wash !== query.wash) return false;
  if (query.minPrice !== undefined && product.price < query.minPrice)
    return false;
  if (query.maxPrice !== undefined && product.price > query.maxPrice)
    return false;
  if (query.inStock && !product.available) return false;
  if (query.newOnly && !product.isNew) return false;
  if (query.bestSeller && !product.bestSeller) return false;
  return true;
}

function sortProducts<T extends (typeof demoCatalog)[number]>(
  products: T[],
  sort: ProductQuery["sort"] = "featured",
) {
  const sorters = {
    featured: (a: T, b: T) =>
      Number(b.bestSeller) - Number(a.bestSeller) ||
      Number(b.isNew) - Number(a.isNew),
    newest: (a: T, b: T) => Number(b.isNew) - Number(a.isNew),
    popular: (a: T, b: T) => Number(b.bestSeller) - Number(a.bestSeller),
    "price-asc": (a: T, b: T) => a.price - b.price,
    "price-desc": (a: T, b: T) => b.price - a.price,
    name: (a: T, b: T) => a.name.localeCompare(b.name),
  };
  return products.sort(sorters[sort]);
}

export const mockCatalogService: CatalogService = {
  async listFeaturedProducts() {
    return featuredProducts;
  },
  async listCollections() {
    return featuredCollections;
  },
  async getProduct(slug) {
    return demoCatalog.find((product) => product.slug === slug) ?? null;
  },
  async listProducts(query = {}) {
    const products = sortProducts(
      demoCatalog.filter((product) => matchesQuery(product, query)),
      query.sort,
    );
    const pageSize = Math.max(
      1,
      Math.min(query.pageSize ?? (products.length || 1), 48),
    );
    const page = Math.max(1, query.page ?? 1);
    const start = (page - 1) * pageSize;
    return {
      items: products.slice(start, start + pageSize),
      total: products.length,
      page,
      pageSize,
    };
  },
  async getRelatedProducts(productId, limit = 4) {
    const product = demoCatalog.find((item) => item.id === productId);
    if (!product) return [];
    return demoCatalog
      .filter(
        (item) => item.id !== product.id && item.category === product.category,
      )
      .slice(0, limit);
  },
  async suggestProducts(term, limit = 5) {
    const normalized = term.trim().toLocaleLowerCase();
    if (normalized.length < 2) return [];
    return demoCatalog
      .filter((product) =>
        `${product.name} ${product.category} ${product.collection}`
          .toLocaleLowerCase()
          .includes(normalized),
      )
      .slice(0, limit);
  },
};
