import type { Product } from '../types';

/**
 * What a listing *is* (Fresh Produce, Livestock, Fish & Aquaculture, ...) comes from the category
 * the seller picked, never from `product.type`.
 *
 * `type` is the listing FLOW derived from the seller's role ("produce" for every farmer listing,
 * "product" for every agro-dealer listing, "service" for providers). It decides routing (cart vs
 * booking) and must not be shown as a category: doing so labelled a farmer's chicks, goats and
 * catfish as "Fresh Produce".
 *
 * Category codes are hierarchical ("livestock.fish.catfish"), so the section is the first segment
 * and the group the second.
 */

const SECTION_LABELS: Record<string, string> = {
  produce: 'Fresh Produce',
  value_added: 'Processed & Value-Added',
  livestock: 'Livestock',
  inputs: 'Farm Inputs',
  equipment: 'Equipment & Machinery',
  services: 'Agro Service',
  land: 'Land & Facilities',
  waste: 'Waste & By-products',
  uncategorized: 'Other',
};

/** Groups that deserve a more specific label than their section. */
const GROUP_LABELS: Record<string, string> = {
  'livestock.fish': 'Fish & Aquaculture',
  'livestock.poultry': 'Poultry',
};

type LabelSource = Pick<Product, 'categoryCode' | 'listingKind' | 'type'> & {
  customSectionName?: string | null;
};

export function listingSection(product: Pick<Product, 'categoryCode'>): string | null {
  const code = product.categoryCode?.trim();
  return code ? code.split('.')[0] : null;
}

export function listingTypeLabel(product: LabelSource): string {
  const code = product.categoryCode?.trim();
  if (code) {
    const [section, group] = code.split('.');
    if (group && GROUP_LABELS[`${section}.${group}`]) return GROUP_LABELS[`${section}.${group}`];
    if (section === 'uncategorized' && product.customSectionName?.trim()) return product.customSectionName.trim();
    if (SECTION_LABELS[section]) return SECTION_LABELS[section];
  }
  // Legacy rows without a structured category: fall back to the listing kind, and only then to a
  // neutral flow label - never "Fresh Produce", which can't be known without a category.
  switch (product.listingKind) {
    case 'service_booking':
    case 'equipment_hire':
      return SECTION_LABELS.services;
    case 'equipment_sale':
      return SECTION_LABELS.equipment;
    case 'land_lease':
      return SECTION_LABELS.land;
    default:
      break;
  }
  if (product.type === 'service') return SECTION_LABELS.services;
  if (product.type === 'produce') return 'Farm Product';
  return 'Agro Product';
}

/** True only for listings whose category really is farm produce. */
export function isFreshProduce(product: Pick<Product, 'categoryCode'>): boolean {
  return listingSection(product) === 'produce';
}
