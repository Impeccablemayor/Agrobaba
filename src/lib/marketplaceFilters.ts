import type { Product } from '../types';
import { stateKey } from './locations.ts';

/** Shop-page refinements applied in the browser on top of the server's category/search results
 *  (the shop loads the backend's bounded listing window, so these never hide server-side pages).
 *  Restored from the partner's marketplace-listing-flows branch, re-based on main's stateKey(). */
export interface MarketplaceFilters {
  listingType: 'all' | 'product' | 'service';
  sellerRole: 'all' | 'farmer' | 'agro-dealer' | 'service-provider';
  /** A state name from /api/states ("Oyo", "Federal Capital Territory"), or '' for anywhere. */
  state: string;
  verifiedOnly: boolean;
  minPrice: number | null;
  maxPrice: number | null;
}

export const DEFAULT_MARKETPLACE_FILTERS: MarketplaceFilters = {
  listingType: 'all',
  sellerRole: 'all',
  state: '',
  verifiedOnly: false,
  minPrice: null,
  maxPrice: null,
};

export function hasActiveMarketplaceFilters(filters: MarketplaceFilters): boolean {
  return filters.listingType !== 'all' || filters.sellerRole !== 'all' || Boolean(filters.state)
    || filters.verifiedOnly || filters.minPrice != null || filters.maxPrice != null;
}

/** Locations are free text from several eras: "Ibadan, Oyo", "Ibadan, Oyo State",
 *  "Abeokuta, Ogun State, Nigeria", "Abuja". Any comma-separated part (or a service search tag)
 *  that normalises to the requested state matches. */
export function matchesState(product: Pick<Product, 'location' | 'tags'>, state: string): boolean {
  if (!state) return true;
  const wanted = stateKey(state);
  const parts = [...(product.location || '').split(','), ...(product.tags || [])];
  return parts.some((part) => part.trim() !== '' && stateKey(part.trim()) === wanted);
}

export function filterMarketplaceProducts(products: Product[], filters: MarketplaceFilters): Product[] {
  return products.filter((product) => {
    if (filters.listingType === 'service' && product.type !== 'service') return false;
    if (filters.listingType === 'product' && product.type === 'service') return false;
    if (filters.sellerRole !== 'all' && product.sellerRole !== filters.sellerRole) return false;
    if (filters.verifiedOnly && !product.verified) return false;
    if (!matchesState(product, filters.state)) return false;
    // A negotiated listing has no public price, so it can't satisfy a price bound.
    if (filters.minPrice != null && (product.price == null || product.price < filters.minPrice)) return false;
    if (filters.maxPrice != null && (product.price == null || product.price > filters.maxPrice)) return false;
    return true;
  });
}
