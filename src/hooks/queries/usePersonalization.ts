import { useQuery } from '@tanstack/react-query';
import { getMyPersonalizationProfile, getPersonalizationTaxonomy } from '../../lib/personalization';
import type { PersonalizationProfile, PersonalizationTaxonomy } from '../../types';

export function useMyProfileStatus(enabled = true) {
  return useQuery<PersonalizationProfile | null>({
    queryKey: ['personalization', 'me'],
    queryFn: () => getMyPersonalizationProfile(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function usePersonalizationTaxonomy() {
  return useQuery<PersonalizationTaxonomy | null>({
    queryKey: ['personalization', 'taxonomy'],
    queryFn: () => getPersonalizationTaxonomy(),
    // Reference taxonomy rarely changes - served with a 10m Cache-Control header upstream
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });
}