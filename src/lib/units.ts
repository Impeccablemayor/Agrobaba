// Phase 1 of the Flexible Commerce Architecture roadmap - one shared place for unit-type labels
// and quantity formatting, matching every other listing that has this rule (§15: keep commerce
// rules out of individual UI components).

export const UNIT_TYPES = [
  'piece', 'weight', 'volume', 'bag', 'crate', 'bundle', 'batch',
  'head', 'area', 'hour', 'day', 'trip', 'load', 'project', 'negotiated',
] as const;

export type UnitType = (typeof UNIT_TYPES)[number];

const UNIT_LABELS: Record<UnitType, string> = {
  piece: 'piece(s)',
  weight: 'kg',
  volume: 'litre(s)',
  bag: 'bag(s)',
  crate: 'crate(s)',
  bundle: 'bundle(s)/pack(s)',
  batch: 'batch(es)/lot(s)',
  head: 'head',
  area: 'acre(s)/hectare(s)',
  hour: 'hour(s)',
  day: 'day(s)',
  trip: 'trip(s)',
  load: 'load(s)',
  project: 'project',
  negotiated: 'negotiated',
};

export function unitLabel(unitType?: string | null): string {
  if (!unitType) return '';
  return UNIT_LABELS[unitType as UnitType] || unitType;
}

/** "20,000 pieces" style display (Flexible Commerce Architecture §17). Falls back to a bare
 *  formatted number when there's no structured unitType (every listing created before this
 *  phase). */
export function formatUnitQuantity(quantity: number, unitType?: string | null): string {
  const formatted = quantity.toLocaleString();
  const label = unitLabel(unitType);
  return label ? `${formatted} ${label}` : formatted;
}

/** Phase 2 of the Flexible Commerce Architecture roadmap - mirrors the backend's
 *  ProductService.resolveUnitPrice exactly, for live client-side display only. Not authoritative
 *  - the server always recomputes independently at order time (same defense-in-depth pattern as
 *  Phase 1's min/max/increment checks). */
export function resolveUnitPrice(
  product: { price: number | null; priceTiers?: { minQuantity: number; pricePerUnit: number }[] },
  quantity: number,
): number {
  // A negotiated listing (Negotiated Commerce roadmap) has no public price at all - this is only
  // ever reached for a normal fixed-price/tiered listing in practice, since negotiated listings
  // never go through the ordinary Add to Cart path. 0 is a safe, inert fallback, never displayed.
  const basePrice = product.price ?? 0;
  if (!product.priceTiers || product.priceTiers.length === 0) return basePrice;
  let price = basePrice;
  for (const tier of product.priceTiers) {
    if (tier.minQuantity <= quantity) price = tier.pricePerUnit;
    else break;
  }
  return price;
}
