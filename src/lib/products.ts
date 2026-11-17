import { showToast } from './toastBus';
import { api } from './api';
import type { Product, ProductType } from '../types';

export interface ProductFilters {
  type?: ProductType | 'all';
  category?: string;
  categoryId?: string;
  search?: string;
  sellerId?: string;
}

export interface AddProductInput {
  name: string;
  description?: string;
  /** Optional when `negotiated` is true - a negotiated listing has no public price. */
  price?: number | string;
  category?: string;
  categoryId?: string | null;
  listingKind?: string;
  type?: ProductType;
  size?: string;
  quantity?: number | string;
  unit?: string;
  location?: string;
  image?: string | null;
  /** Up to MAX_LISTING_IMAGES photos (data URLs for new uploads); the first is the cover. */
  images?: string[];
  discount?: number | string;
  tags?: string[];
  /** Phase 1 of the Flexible Commerce Architecture roadmap - all optional. */
  unitType?: string | null;
  minOrderQuantity?: number | string | null;
  maxOrderQuantity?: number | string | null;
  incrementQuantity?: number | string | null;
  /** Phase 2 of the Flexible Commerce Architecture roadmap - all optional. */
  priceTiers?: { minQuantity: number | string; pricePerUnit: number | string }[];
  /** Negotiated Commerce roadmap - when true, `price` may be omitted entirely. */
  negotiated?: boolean;
}

export async function addProduct(data: AddProductInput): Promise<Product | false> {
  try {
    const product = await api.post<Product>('/api/products', {
      name: data.name,
      description: data.description || '',
      price: data.price !== undefined && data.price !== '' ? Number(data.price) : null,
      category: data.category || 'Other',
      categoryId: data.categoryId ? Number(data.categoryId) : null,
      listingKind: data.listingKind || null,
      type: data.type || 'product',
      size: data.size || 'Standard',
      quantity: Number(data.quantity) || 1,
      unit: data.unit || 'unit',
      location: data.location || '',
      image: data.images?.[0] || data.image || null,
      images: data.images?.length ? data.images : data.image ? [data.image] : [],
      discount: Number(data.discount) || 0,
      tags: data.tags || [],
      unitType: data.unitType || null,
      minOrderQuantity: data.minOrderQuantity ? Number(data.minOrderQuantity) : null,
      maxOrderQuantity: data.maxOrderQuantity ? Number(data.maxOrderQuantity) : null,
      incrementQuantity: data.incrementQuantity ? Number(data.incrementQuantity) : null,
      priceTiers: data.priceTiers
        ? data.priceTiers.map((t) => ({ minQuantity: Number(t.minQuantity), pricePerUnit: Number(t.pricePerUnit) }))
        : null,
      negotiated: data.negotiated || false,
    });
    showToast('Listing posted successfully!', 'success');
    return product;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create listing';
    showToast(message, 'error');
    return false;
  }
}

/** Matches the backend limit (ProductService.MAX_PRODUCT_IMAGES / ProductRequest @Size). */
export const MAX_LISTING_IMAGES = 3;

/** Owner edit contract (PUT /api/products/{id}). Category and negotiated-vs-fixed pricing are
 *  deliberately not editable - the backend locks them to protect discovery, quotes and checkout. */
export interface UpdateProductInput {
  name: string;
  description: string;
  price: number | null;
  quantity: number;
  unit: string;
  location: string;
  size: string;
  discount: number;
  /** Final gallery in display order: existing image URLs are kept, new data URLs are uploaded,
   *  and anything left out is removed. */
  images: string[];
}

export async function updateProduct(id: string, data: UpdateProductInput): Promise<Product | false> {
  try {
    const product = await api.put<Product>(`/api/products/${id}`, data);
    showToast('Listing updated.', 'success');
    return product;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update listing';
    showToast(message, 'error');
    return false;
  }
}

// ---------------------------------------------------------------------------------------------
// Service listings - service providers publish through the dedicated /api/services flow
// (POST /api/products rejects them by design), so services keep their own pricing/engagement data.
// ---------------------------------------------------------------------------------------------

export interface ServiceListingMedia {
  url: string;
  caption?: string | null;
  type: 'image' | 'video';
}

/** A chip choice ({code}) or a provider-typed value ({customValue}) - backend FlexibleValue. */
export interface FlexibleServiceValue {
  code: string | null;
  customValue: string | null;
}

export type ServiceRequirementType =
  'short_text' | 'long_text' | 'number' | 'multiple_choice' | 'date' | 'location' | 'file';

/** A question the customer answers when booking (required ones are enforced by the backend). */
export interface ServiceRequirement {
  id?: number | null;
  question: string;
  answerType: ServiceRequirementType;
  required: boolean;
  options: string[];
  allowOther: boolean;
}

export type ServiceEngagementMethod = 'standard_booking' | 'request_before_booking' | 'request_quote';

/** Full service record: request body for POST/PUT /api/services and (plus ids/status) the response. */
export interface ServiceListingInput {
  title: string;
  categoryId: number | null;
  customCategoryName: string;
  serviceType: string;
  customServiceType: string;
  specialization: string;
  customSpecialization: string;
  price: number | null;
  pricingModel: string;
  customPricingModel: string;
  pricingUnit: string;
  customPricingUnit: string;
  engagementMethod: ServiceEngagementMethod;
  description: string;
  country: string;
  state: string;
  city: string;
  coverageType: string;
  customCoverage: string;
  radiusKm: number | null;
  onSite: boolean;
  remote: boolean;
  canTravel: boolean;
  availability: string[];
  capacityValue: number | null;
  capacityUnit: string;
  customCapacityUnit: string;
  experienceYears: number | null;
  inclusions: FlexibleServiceValue[];
  equipment: FlexibleServiceValue[];
  extras: FlexibleServiceValue[];
  metadata: Record<string, unknown>;
  requirements: ServiceRequirement[];
  gallery: ServiceListingMedia[];
  draftStep: number;
  /** false = save as draft (not visible to customers). */
  publish: boolean;
}

export type ServiceListing = Omit<ServiceListingInput, 'publish' | 'categoryId'> & {
  id: number;
  productId: number;
  categoryId: number;
  categoryCode: string | null;
  categoryName: string | null;
  status: string;
  createdAt: string;
  updatedAt: string | null;
  publishedAt: string | null;
};

/** Public read - silent on failure (a legacy service without a details record is a 404 and must
 *  not pop an error toast at a shopper); callers treat null as "no extra details". */
export async function getServiceListing(productId: string): Promise<ServiceListing | null> {
  try {
    return await api.get<ServiceListing>(`/api/services/${productId}`);
  } catch {
    return null;
  }
}

export async function saveServiceListing(input: ServiceListingInput, productId?: string): Promise<ServiceListing | false> {
  try {
    const listing = productId
      ? await api.put<ServiceListing>(`/api/services/${productId}`, input)
      : await api.post<ServiceListing>('/api/services', input);
    showToast(input.publish ? 'Your service is live.' : 'Draft saved. You can finish it any time from My Listings.', 'success');
    return listing;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save this service';
    showToast(message, 'error');
    return false;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    await api.delete(`/api/products/${id}`);
    showToast('Listing removed from the marketplace.', 'success');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete listing';
    showToast(message, 'error');
    return false;
  }
}

export async function getProducts(filters: ProductFilters = {}, signal?: AbortSignal): Promise<Product[]> {
  try {
    const params = new URLSearchParams();
    if (filters.type && filters.type !== 'all') params.set('type', filters.type);
    if (filters.category && filters.category !== 'all') params.set('category', filters.category);
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.search) params.set('search', filters.search);
    if (filters.sellerId) params.set('sellerId', filters.sellerId);

    const query = params.toString();
    const products = await api.get<Product[]>(`/api/products${query ? `?${query}` : ''}`, signal);
    const list = products || [];
    // A search query is already relevance-ordered by the backend - only impose newest-first when browsing unfiltered.
    if (filters.search && filters.search.trim()) return list;
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return [];
    const message = error instanceof Error ? error.message : 'Unable to load products';
    showToast(message, 'error');
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    return await api.get<Product>(`/api/products/${id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load product';
    showToast(message, 'error');
    return null;
  }
}

export async function getMyProducts(): Promise<Product[]> {
  try {
    return await api.get<Product[]>('/api/products/me');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load your listings';
    showToast(message, 'error');
    return [];
  }
}

