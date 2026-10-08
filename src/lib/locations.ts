/** Pure helpers + shared types for the State -> City catalogue. Deliberately free of any API
 *  import so the module loads under plain `node --test` (Vite's `import.meta.env` would not). */

export interface LocationOption {
  id: number;
  name: string;
}

/** The full State -> City selection a form carries; ids only ever travel as a matched pair. */
export interface LocationSelection {
  stateId: number | null;
  stateName: string | null;
  cityId: number | null;
  cityName: string | null;
}

export const EMPTY_LOCATION: LocationSelection = {
  stateId: null,
  stateName: null,
  cityId: null,
  cityName: null,
};

/** Case/punctuation-insensitive match key, deliberately mirroring the backend seeder's key so
 *  stored profile text ("fct", "Oyo State", "akwa ibom", "Ibeju/Lekki") matches the catalogue
 *  the same way the server-side backfill matches it. */
export function locationKey(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** FCT spellings that legacy profile text uses; all mean one catalogue state. */
const FCT_ALIASES = new Set([
  'fct',
  'abuja',
  'abuja-fct',
  'fct-abuja',
  'federal-capital-territory-abuja',
]);

/** Canonical state key: collapses FCT aliases and a trailing " State" suffix, so
 *  "Oyo State" -> "oyo" and "fct" -> "federal-capital-territory". */
export function stateKey(value: string | null | undefined): string {
  const key = locationKey(value);
  if (FCT_ALIASES.has(key)) return 'federal-capital-territory';
  if (key.endsWith('-state')) return key.slice(0, -'-state'.length);
  return key;
}

/** Display label for composing addresses: "Oyo" -> "Oyo State"; the FCT keeps its full
 *  official name instead of gaining a " State" suffix. */
export function stateLabel(name: string | null | undefined): string {
  if (!name) return '';
  if (stateKey(name) === 'federal-capital-territory') return 'Federal Capital Territory';
  return name.endsWith(' State') ? name : `${name} State`;
}

/** "City, Oyo State" line used for product locations and checkout addresses. */
export function locationLine(cityName: string | null | undefined, stateName: string | null | undefined): string {
  return [cityName, stateLabel(stateName)].filter(Boolean).join(', ');
}

/** The ids a payload must carry, or null until BOTH dropdowns are chosen - never half a pair. */
export function buildLocationPayload(
  selection: LocationSelection | null | undefined,
): { stateId: number; cityId: number } | null {
  if (!selection || selection.stateId === null || selection.cityId === null) return null;
  return { stateId: selection.stateId, cityId: selection.cityId };
}
