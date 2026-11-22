import type { Product, ProductCollection } from './product';

export interface CatalogService {
  listFeaturedProducts(): Promise<readonly Product[]>;
  listCollections(): Promise<readonly ProductCollection[]>;
  getProduct(slug: string): Promise<Product | null>;
  listProducts(query?: ProductQuery): Promise<ProductPage>;
  getRelatedProducts(productId: string, limit?: number): Promise<readonly Product[]>;
  suggestProducts(term: string, limit?: number): Promise<readonly Product[]>;
}

export type ProductSort = 'featured' | 'newest' | 'popular' | 'price-asc' | 'price-desc' | 'name';

export type ProductQuery = {
  term?: string;
  category?: Product['category'];
  categories?: readonly Product['category'][];
  audience?: Product['audience'];
  collection?: string;
  size?: string;
  color?: string;
  fit?: string;
  wash?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  newOnly?: boolean;
  bestSeller?: boolean;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
};

export type ProductPage = {
  items: readonly Product[];
  total: number;
  page: number;
  pageSize: number;
};
