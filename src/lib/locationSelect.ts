import {
  EMPTY_LOCATION,
  locationKey,
  stateKey,
  type LocationOption,
  type LocationSelection,
} from './locations.ts';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LocationSelectSnapshot {
  states: LocationOption[];
  statesStatus: LoadStatus;
  statesError: string | null;
  cities: LocationOption[];
  citiesStatus: LoadStatus;
  citiesError: string | null;
  selection: LocationSelection;
}

/** How a form prefills the dropdowns from the user's existing profile: by catalogue id when the
 *  account is already linked, otherwise by name with the same tolerant matching the server-side
 *  backfill uses (so "fct" or "Oyo State" still selects the right rows). */
export interface LocationPrefill {
  stateId?: number | null;
  stateName?: string | null;
  cityId?: number | null;
  cityName?: string | null;
}

export interface LocationSelectOptions {
  fetchStates: () => Promise<LocationOption[]>;
  fetchCities: (stateId: number) => Promise<LocationOption[]>;
  prefill?: LocationPrefill;
}

export interface LocationSelect {
  getSnapshot(): LocationSelectSnapshot;
  subscribe(listener: () => void): () => void;
  /** Loads the state catalogue once; applies any prefill, including the dependent city load. */
  loadStates(): void;
  /** User changed the state dropdown: the previous city selection is ALWAYS cleared first so a
   *  stale city from the old state can never remain selected or be submitted. */
  selectState(stateId: number | null): void;
  selectCity(cityId: number | null): void;
}

/** Builds the prefill for a form from the signed-in user's stored profile: ids when the account
 *  is already linked, name fallbacks (matched with the server's tolerant keys) otherwise. */
export function prefillFromUser(
  user: { stateId?: number | null; cityId?: number | null; state?: string | null; city?: string | null } | null | undefined,
): LocationPrefill {
  return {
    stateId: user?.stateId ?? null,
    stateName: user?.state ?? null,
    cityId: user?.cityId ?? null,
    cityName: user?.city ?? null,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function matchOption(options: LocationOption[], id: number | null | undefined, key: string): LocationOption | null {
  if (id !== null && id !== undefined) {
    const byId = options.find((option) => option.id === id);
    if (byId) return byId;
  }
  if (!key) return null;
  return options.find((option) => locationKey(option.name) === key) ?? null;
}

function matchState(options: LocationOption[], id: number | null | undefined, name: string | null | undefined): LocationOption | null {
  if (id !== null && id !== undefined) {
    const byId = options.find((option) => option.id === id);
    if (byId) return byId;
  }
  const key = stateKey(name);
  if (!key) return null;
  return options.find((option) => stateKey(option.name) === key) ?? null;
}

export function createLocationSelect(options: LocationSelectOptions): LocationSelect {
  const prefill = options.prefill;
  let snapshot: LocationSelectSnapshot = {
    states: [],
    statesStatus: 'idle',
    statesError: null,
    cities: [],
    citiesStatus: 'idle',
    citiesError: null,
    selection: EMPTY_LOCATION,
  };
  const listeners = new Set<() => void>();
  // Request tokens: a city response only applies if it is still the newest request for the
  // currently selected state - a slow response for the previous state is discarded.
  let citiesRequest = 0;
  let statesLoaded = false;
  let cityPrefillPending = false;

  function publish(next: Partial<LocationSelectSnapshot>): void {
    snapshot = { ...snapshot, ...next };
    for (const listener of [...listeners]) listener();
  }

  function loadCities(stateId: number, keepCityPrefill: boolean): void {
    const request = ++citiesRequest;
    cityPrefillPending = keepCityPrefill;
    publish({ citiesStatus: 'loading', citiesError: null, cities: [] });
    options
      .fetchCities(stateId)
      .then((cities) => {
        if (request !== citiesRequest) return; // superseded by a newer state selection
        let selection = snapshot.selection;
        if (cityPrefillPending) {
          const city = matchOption(cities, prefill?.cityId, locationKey(prefill?.cityName));
          if (city) selection = { ...selection, cityId: city.id, cityName: city.name };
          cityPrefillPending = false;
        }
        publish({ cities, citiesStatus: 'ready', citiesError: null, selection });
      })
      .catch((error: unknown) => {
        if (request !== citiesRequest) return;
        cityPrefillPending = false;
        publish({ cities: [], citiesStatus: 'error', citiesError: errorMessage(error, 'Unable to load cities') });
      });
  }

  function applyState(stateId: number | null, keepCityPrefill: boolean): void {
    citiesRequest++; // invalidate any in-flight city response for the previous state
    if (stateId === null) {
      cityPrefillPending = false;
      publish({
        cities: [],
        citiesStatus: 'idle',
        citiesError: null,
        selection: { ...EMPTY_LOCATION, stateName: null },
      });
      return;
    }
    const state = snapshot.states.find((option) => option.id === stateId) ?? null;
    publish({
      cities: [],
      citiesStatus: 'loading',
      citiesError: null,
      selection: {
        stateId,
        stateName: state ? state.name : null,
        cityId: null,
        cityName: null,
      },
    });
    loadCities(stateId, keepCityPrefill);
  }

  return {
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    loadStates() {
      if (statesLoaded || snapshot.statesStatus === 'loading') return;
      statesLoaded = true;
      publish({ statesStatus: 'loading', statesError: null });
      options
        .fetchStates()
        .then((states) => {
          publish({ states, statesStatus: 'ready', statesError: null });
          if (prefill && (prefill.stateId != null || prefill.stateName)) {
            const state = matchState(states, prefill.stateId, prefill.stateName);
            if (state) applyState(state.id, true);
          }
        })
        .catch((error: unknown) => {
          statesLoaded = false; // allow a retry
          publish({ states: [], statesStatus: 'error', statesError: errorMessage(error, 'Unable to load states') });
        });
    },
    selectState(stateId: number | null) {
      applyState(stateId, false);
    },
    selectCity(cityId: number | null) {
      if (cityId === null) {
        publish({ selection: { ...snapshot.selection, cityId: null, cityName: null } });
        return;
      }
      const city = snapshot.cities.find((option) => option.id === cityId) ?? null;
      publish({
        selection: {
          ...snapshot.selection,
          cityId: city ? city.id : null,
          cityName: city ? city.name : null,
        },
      });
    },
  };
}
