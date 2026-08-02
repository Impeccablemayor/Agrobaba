import { api } from './api';

export interface Suggestion {
  label: string;
  value: string;
}

export type SuggestGroupType = 'category' | 'product' | 'demand' | 'location' | 'popular';

export interface SuggestGroup {
  type: SuggestGroupType;
  label: string;
  items: Suggestion[];
}

interface SuggestResponse {
  categories: Suggestion[];
  items: Suggestion[];
  locations: Suggestion[];
  popular: Suggestion[];
}

export async function getSearchSuggestions(query: string, scope: 'products' | 'demands' = 'products', signal?: AbortSignal): Promise<SuggestGroup[]> {
  try {
    const params = new URLSearchParams({ q: query, scope });
    const data = await api.get<SuggestResponse>(`/api/search/suggest?${params.toString()}`, signal);
    return [
      { type: 'category', label: 'Categories', items: data.categories || [] },
      { type: scope === 'demands' ? 'demand' : 'product', label: scope === 'demands' ? 'Demands' : 'Listings', items: data.items || [] },
      { type: 'location', label: 'Locations', items: data.locations || [] },
      { type: 'popular', label: 'Popular Searches', items: data.popular || [] },
    ];
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return [];
    // Autocomplete is a nicety, not core functionality - fail silently rather than toasting typing interruptions.
    return [];
  }
}
