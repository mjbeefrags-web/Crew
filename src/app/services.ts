import { mockCatalogService } from '../services/mockCatalogService';
import type { CatalogService } from '../domain/service';
import { mockCommerceService } from '../services/mockCommerceService';
import type { CommerceService } from '../domain/commerce';
import { mockContentService } from '../services/mockContentService';
import type { ContentService } from '../domain/content';

export const catalogService: CatalogService = mockCatalogService;
export const commerceService: CommerceService = mockCommerceService;
export const contentService: ContentService = mockContentService;
