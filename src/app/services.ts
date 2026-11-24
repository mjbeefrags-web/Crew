import { mockCatalogService } from '../services/mockCatalogService';
import type { CatalogService } from '../domain/service';
import { mockCommerceService } from '../services/mockCommerceService';
import type { CommerceService } from '../domain/commerce';
import { mockContentService } from '../services/mockContentService';
import type { ContentService } from '../domain/content';
import { API_MODE } from '../config/runtime';
import { apiCatalogService } from '../services/apiCatalogService';
import { apiCommerceService } from '../services/apiCommerceService';
import type { AdminService } from '../services/adminService';
import { apiAdminService } from '../services/apiAdminService';
import { mockAdminService } from '../services/mockAdminService';

export const catalogService: CatalogService = API_MODE ? apiCatalogService : mockCatalogService;
export const commerceService: CommerceService = API_MODE ? {
  ...mockCommerceService,
  async submitNewsletter(email) { await apiCommerceService.submitNewsletter(email); return { accepted: true, previewOnly: true }; },
  async submitContact(message) { await apiCommerceService.submitContact(message); return { accepted: true, previewOnly: true }; },
} : mockCommerceService;
export const contentService: ContentService = mockContentService;
export const adminService: AdminService = API_MODE ? apiAdminService : mockAdminService;
