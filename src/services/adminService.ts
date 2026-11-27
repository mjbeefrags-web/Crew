import type { AdminData, AiAdvice, ServerMetrics } from "../domain/admin";

export type NewProduct = {
  slug: string;
  name: string;
  category: string;
  collection: string;
  description?: string;
  priceMinor: number;
  stockQuantity: number;
  imageUrl?: string;
  sizes: string[];
  colors: Array<{ name: string; value: string }>;
};

/** One adapter shape for demo and API modes; no silent fallback between them. */
export interface AdminService {
  load(): Promise<AdminData>;
  metrics(days: number): Promise<ServerMetrics>;
  advise(
    signals: Record<string, unknown>,
    question?: string,
  ): Promise<AiAdvice>;
  createProduct(input: NewProduct): Promise<void>;
  archiveProduct(id: string): Promise<void>;
  uploadImage(filename: string, dataUrl: string): Promise<string>;
}
