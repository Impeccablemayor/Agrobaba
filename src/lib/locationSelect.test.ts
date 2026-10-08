import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocationSelect, prefillFromUser, type LocationSelect } from './locationSelect.ts';
import {
  buildLocationPayload,
  EMPTY_LOCATION,
  locationKey,
  locationLine,
  stateKey,
  stateLabel,
  type LocationOption,
} from './locations.ts';

const STATES: LocationOption[] = [
  { id: 1, name: 'Lagos' },
  { id: 2, name: 'Oyo' },
  { id: 3, name: 'Federal Capital Territory' },
];

const CITIES: Record<number, LocationOption[]> = {
  1: [{ id: 11, name: 'Ikeja' }, { id: 12, name: 'Lekki' }],
  2: [{ id: 21, name: 'Ibadan' }],
  3: [{ id: 31, name: 'Abuja' }],
};

function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function controllerWith(overrides?: {
  fetchStates?: () => Promise<LocationOption[]>;
  fetchCities?: (stateId: number) => Promise<LocationOption[]>;
  prefill?: Parameters<typeof createLocationSelect>[0]['prefill'];
}): LocationSelect {
  return createLocationSelect({
    fetchStates: overrides?.fetchStates ?? (async () => STATES),
    fetchCities: overrides?.fetchCities ?? (async (stateId) => CITIES[stateId]),
    prefill: overrides?.prefill,
  });
}

test('locationKey normalizes spelling the way the server backfill does', () => {
  assert.equal(locationKey('  Akwa Ibom '), 'akwa-ibom');
  assert.equal(locationKey('ADO EKITI'), 'ado-ekiti');
  assert.equal(locationKey('Ibeju/Lekki'), 'ibeju-lekki');
  assert.equal(locationKey('Port-Harcourt'), 'port-harcourt');
  assert.equal(locationKey(null), '');
  assert.equal(locationKey(undefined), '');
});

test('stateKey collapses FCT aliases and a trailing "State" suffix', () => {
  assert.equal(stateKey('fct'), 'federal-capital-territory');
  assert.equal(stateKey('Abuja FCT'), 'federal-capital-territory');
  assert.equal(stateKey('Federal Capital Territory'), 'federal-capital-territory');
  assert.equal(stateKey('Oyo State'), 'oyo');
  assert.equal(stateKey('Lagos'), 'lagos');
});

test('stateLabel and locationLine compose address strings without doubling suffixes', () => {
  assert.equal(stateLabel('Oyo'), 'Oyo State');
  assert.equal(stateLabel('Oyo State'), 'Oyo State');
  assert.equal(stateLabel('Federal Capital Territory'), 'Federal Capital Territory');
  assert.equal(stateLabel(null), '');
  assert.equal(locationLine('Ibadan', 'Oyo'), 'Ibadan, Oyo State');
  assert.equal(locationLine('Abuja', 'Federal Capital Territory'), 'Abuja, Federal Capital Territory');
  assert.equal(locationLine(null, null), '');
});

test('buildLocationPayload emits ids only as a matched pair', () => {
  assert.deepEqual(
    buildLocationPayload({ stateId: 2, stateName: 'Oyo', cityId: 21, cityName: 'Ibadan' }),
    { stateId: 2, cityId: 21 },
  );
  assert.equal(buildLocationPayload({ ...EMPTY_LOCATION, stateId: 2 }), null);
  assert.equal(buildLocationPayload({ ...EMPTY_LOCATION, cityId: 21 }), null);
  assert.equal(buildLocationPayload(EMPTY_LOCATION), null);
});

test('loadStates fetches the catalogue once and exposes it', async () => {
  let calls = 0;
  const controller = controllerWith({
    fetchStates: async () => {
      calls++;
      return STATES;
    },
  });
  assert.equal(controller.getSnapshot().statesStatus, 'idle');

  controller.loadStates();
  assert.equal(controller.getSnapshot().statesStatus, 'loading');
  await tick();

  const snap = controller.getSnapshot();
  assert.equal(snap.statesStatus, 'ready');
  assert.equal(snap.statesError, null);
  assert.deepEqual(snap.states, STATES);

  controller.loadStates();
  await tick();
  assert.equal(calls, 1, 'the state catalogue must only be fetched once');
});

test('cities stay empty until a state is selected (the city dropdown starts disabled)', async () => {
  const controller = controllerWith();
  controller.loadStates();
  await tick();

  const snap = controller.getSnapshot();
  assert.equal(snap.citiesStatus, 'idle');
  assert.deepEqual(snap.cities, []);
  assert.equal(snap.selection.stateId, null);
  assert.equal(snap.selection.cityId, null);
});

test('selectState loads that state cities and reports the selection', async () => {
  const controller = controllerWith();
  controller.loadStates();
  await tick();

  controller.selectState(1);
  let snap = controller.getSnapshot();
  assert.equal(snap.citiesStatus, 'loading');
  assert.equal(snap.selection.stateId, 1);
  assert.equal(snap.selection.stateName, 'Lagos');
  assert.equal(snap.selection.cityId, null);

  await tick();
  snap = controller.getSnapshot();
  assert.equal(snap.citiesStatus, 'ready');
  assert.deepEqual(snap.cities.map((c) => c.name), ['Ikeja', 'Lekki']);
  assert.equal(snap.selection.cityId, null, 'a fresh state never keeps a city');
});

test('selectCity records the matched names, and changing state always clears the city', async () => {
  const controller = controllerWith();
  controller.loadStates();
  await tick();
  controller.selectState(2);
  await tick();
  controller.selectCity(21);

  let snap = controller.getSnapshot();
  assert.equal(snap.selection.cityId, 21);
  assert.equal(snap.selection.cityName, 'Ibadan');
  assert.equal(snap.selection.stateName, 'Oyo');

  controller.selectState(1);
  snap = controller.getSnapshot();
  assert.equal(snap.selection.cityId, null, 'city must be cleared when the state changes');
  assert.equal(snap.selection.cityName, null);
  assert.equal(snap.selection.stateId, 1);
  assert.deepEqual(snap.cities, [], 'the previous state cities must not stay listed');

  await tick();
  assert.deepEqual(
    controller.getSnapshot().cities.map((c) => c.name),
    ['Ikeja', 'Lekki'],
  );
});

test('a slow city response for a previous state never overwrites the new one', async () => {
  const lagging = deferred<LocationOption[]>();
  let cityCalls = 0;
  const controller = controllerWith({
    fetchCities: (stateId) => {
      cityCalls++;
      if (cityCalls === 1) return lagging.promise; // Lagos hangs
      return Promise.resolve(CITIES[stateId]);
    },
  });
  controller.loadStates();
  await tick();

  controller.selectState(1); // starts the lagging Lagos request
  controller.selectState(2); // user immediately switches to Oyo
  await tick();

  let snap = controller.getSnapshot();
  assert.equal(snap.selection.stateId, 2);
  assert.deepEqual(snap.cities.map((c) => c.name), ['Ibadan']);

  lagging.resolve(CITIES[1]); // the stale Lagos response finally arrives
  await tick();

  snap = controller.getSnapshot();
  assert.deepEqual(snap.cities.map((c) => c.name), ['Ibadan'], 'stale response must be discarded');
  assert.equal(snap.selection.stateId, 2);
  assert.equal(snap.selection.cityName, null);
});

test('a failed states load surfaces the error and a retry recovers', async () => {
  let fail = true;
  const controller = controllerWith({
    fetchStates: async () => {
      if (fail) throw new Error('network down');
      return STATES;
    },
  });

  controller.loadStates();
  await tick();
  let snap = controller.getSnapshot();
  assert.equal(snap.statesStatus, 'error');
  assert.equal(snap.statesError, 'network down');

  fail = false;
  controller.loadStates(); // the Retry button path
  await tick();
  snap = controller.getSnapshot();
  assert.equal(snap.statesStatus, 'ready');
  assert.deepEqual(snap.states, STATES);
});

test('a failed city load surfaces the error and re-selecting the state retries', async () => {
  let fail = true;
  const controller = controllerWith({
    fetchCities: async (stateId) => {
      if (fail) throw new Error('cities unavailable');
      return CITIES[stateId];
    },
  });
  controller.loadStates();
  await tick();

  controller.selectState(1);
  await tick();
  let snap = controller.getSnapshot();
  assert.equal(snap.citiesStatus, 'error');
  assert.equal(snap.citiesError, 'cities unavailable');

  fail = false;
  controller.selectState(1); // the Retry button path
  await tick();
  snap = controller.getSnapshot();
  assert.equal(snap.citiesStatus, 'ready');
  assert.deepEqual(snap.cities.map((c) => c.name), ['Ikeja', 'Lekki']);
});

test('prefill matches legacy profile text with the server keys (FCT alias, "State" suffix)', async () => {
  const controller = controllerWith({
    prefill: { stateName: 'fct', cityName: 'Abuja' },
  });
  controller.loadStates();
  await tick();

  const snap = controller.getSnapshot();
  assert.equal(snap.selection.stateId, 3);
  assert.equal(snap.selection.stateName, 'Federal Capital Territory');
  assert.equal(snap.selection.cityId, 31);
  assert.equal(snap.selection.cityName, 'Abuja');
});

test('prefill prefers catalogue ids when the account is already linked', async () => {
  const requested: number[] = [];
  const controller = controllerWith({
    fetchCities: async (stateId) => {
      requested.push(stateId);
      return CITIES[stateId];
    },
    prefill: { stateId: 2, stateName: null, cityId: 21, cityName: null },
  });
  controller.loadStates();
  await tick();

  const snap = controller.getSnapshot();
  assert.equal(snap.selection.stateId, 2);
  assert.equal(snap.selection.stateName, 'Oyo');
  assert.equal(snap.selection.cityId, 21);
  assert.equal(snap.selection.cityName, 'Ibadan');
  assert.deepEqual(requested, [2]);
});

test('prefill with an unmatched legacy city selects the state but leaves the city empty', async () => {
  const controller = controllerWith({
    prefill: { stateName: 'Oyo State', cityName: 'Some Deleted Town' },
  });
  controller.loadStates();
  await tick();

  const snap = controller.getSnapshot();
  assert.equal(snap.selection.stateId, 2);
  assert.equal(snap.selection.cityId, null, 'no catalogue match means no city selection');
  assert.equal(snap.citiesStatus, 'ready');
});

test('subscribe notifies on changes and unsubscribe stops the notifications', async () => {
  const controller = controllerWith();
  let notified = 0;
  const unsubscribe = controller.subscribe(() => notified++);

  controller.loadStates();
  await tick();
  assert.ok(notified > 0, 'subscribers must hear about the loaded catalogue');

  unsubscribe();
  const after = notified;
  controller.selectState(1);
  assert.equal(notified, after, 'an unsubscribed listener must stay silent');
});

test('prefillFromUser lifts ids and name fallbacks off the stored profile', () => {
  assert.deepEqual(
    prefillFromUser({ stateId: 5, cityId: 50, state: 'Lagos', city: 'Ikeja' }),
    { stateId: 5, stateName: 'Lagos', cityId: 50, cityName: 'Ikeja' },
  );
  assert.deepEqual(prefillFromUser(null), {
    stateId: null,
    stateName: null,
    cityId: null,
    cityName: null,
  });
  assert.deepEqual(prefillFromUser({ city: 'Ibadan', state: 'Oyo' }), {
    stateId: null,
    stateName: 'Oyo',
    cityId: null,
    cityName: 'Ibadan',
  });
});
