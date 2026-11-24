export type ProductVariant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  colorValue: string;
  price: number;
  salePrice?: number;
  stockQuantity: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category:
    | "tops"
    | "t-shirts"
    | "hoodies"
    | "sweatshirts"
    | "shirts"
    | "jackets"
    | "trousers"
    | "shorts"
    | "denim"
    | "kids"
    | "accessories"
    | "shoes";
  price: number;
  currency: string;
  audience: "adult" | "kids" | "unisex";
  color: string;
  sizes: readonly string[];
  imageUrl: string;
  isNew: boolean;
  collection: string;
  description: string;
  available: boolean;
  bestSeller: boolean;
  colors: readonly { name: string; value: string }[];
  specifications: {
    material: string;
    fit: string;
    care: string;
    details: string;
  };
  modelUrl?: string;
  salePrice?: number;
  fit?: string;
  wash?: string;
  ageBand?: string;
  galleryUrls?: readonly string[];
  isPreviewData?: boolean;
  variants?: readonly ProductVariant[];
};

export type ProductCollection = {
  id: string;
  slug: string;
  title: string;
  description: string;
  productIds: readonly string[];
};
