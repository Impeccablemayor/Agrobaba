import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupCartBySeller,
  LEGACY_SHARED_CART_KEY,
  mapBackendCart,
  mapBackendCartItem,
  purgeLegacySharedCart,
  type BackendCartItem,
  type BackendCart,
} from './cartModel.ts';
import type { CartItem } from '../types.ts';

function backendItem(overrides: Partial<BackendCartItem> = {}): BackendCartItem {
  return {
    id: 41,
    productId: 100,
    name: 'Rice',
    price: 5000,
    quantity: 2,
    size: 'Standard',
    image: '/img/rice.jpg',
    sellerId: 7,
    sellerName: 'Mary Farms',
    type: 'product',
    unit: 'kg',
    acceptedQuoteId: null,
    addedAt: '2026-10-18T12:00:00Z',
    ...overrides,
  };
}

function backendCart(items: BackendCartItem[], id: number | null = 3): BackendCart {
  return {
    id,
    items,
    total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    itemCount: items.length,
  };
}

function cartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: '1',
    productId: '100',
    name: 'Rice',
    price: 5000,
    quantity: 1,
    size: 'Standard',
    image: null,
    sellerId: '7',
    sellerName: 'Mary Farms',
    type: 'product',
    addedAt: '2026-10-18T12:00:00Z',
    unit: 'kg',
    acceptedQuoteId: null,
    ...overrides,
  };
}

/** Minimal localStorage stand-in for Node so purge logic can be exercised outside a browser. */
function installFakeStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };
  return store;
}

test('mapBackendCartItem converts server ids and prices into the UI CartItem shape', () => {
  const item = mapBackendCartItem(backendItem());
  assert.equal(item.id, '41');
  assert.equal(item.productId, '100');
  assert.equal(item.price, 5000);
  assert.equal(item.quantity, 2);
  assert.equal(item.sellerId, '7');
  assert.equal(item.acceptedQuoteId, null);
});

test('mapBackendCartItem nulls out optional server fields', () => {
  const item = mapBackendCartItem(
    backendItem({ image: null, sellerId: null, sellerName: null, type: null, unit: null, acceptedQuoteId: 99 }),
  );
  assert.equal(item.image, null);
  assert.equal(item.sellerId, '');
  assert.equal(item.sellerName, '');
  assert.equal(item.type, 'product'); // defaults to 'product' rather than a blank type
  assert.equal(item.unit, null);
  assert.equal(item.acceptedQuoteId, '99');
});

test('mapBackendCart returns [] for a null/empty/malformed cart payload', () => {
  assert.deepEqual(mapBackendCart(backendCart([])), []);
  assert.deepEqual(mapBackendCart({ id: null, items: [], total: 0, itemCount: 0 }), []);
  // Defensive: a backend hiccup must never surface a mixed or partial list.
  assert.deepEqual(mapBackendCart({ id: null, items: undefined as unknown as BackendCartItem[], total: 0, itemCount: 0 }), []);
});

test('mapBackendCart keeps every line of the response - a user sees exactly what the server returned for THEIR cart', () => {
  const peterItems = [backendItem({ id: 41, productId: 100, name: 'Rice' }), backendItem({ id: 42, productId: 101, name: 'Maize' })];
  const mapped = mapBackendCart(backendCart(peterItems));
  assert.equal(mapped.length, 2);
  assert.deepEqual(
    mapped.map((i) => i.name),
    ['Rice', 'Maize'],
  );
});

test('groupCartBySeller groups lines by seller id and preserves first-seen seller order', () => {
  const cart: CartItem[] = [
    cartItem({ id: '1', sellerId: '7', sellerName: 'Mary Farms', name: 'Rice' }),
    cartItem({ id: '2', sellerId: '9', sellerName: 'John Equipment', name: 'Tractor', type: 'equipment' }),
    cartItem({ id: '3', sellerId: '7', sellerName: 'Mary Farms', name: 'Maize' }),
  ];
  const groups = groupCartBySeller(cart);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].sellerId, '7');
  assert.deepEqual(
    groups[0].items.map((i) => i.id),
    ['1', '3'],
  );
  assert.equal(groups[1].sellerId, '9');
  assert.equal(groups[1].sellerName, 'John Equipment');
});

test('groupCartBySeller on an empty cart returns no groups', () => {
  assert.deepEqual(groupCartBySeller([]), []);
});

test('purgeLegacySharedCart deletes the pre-fix browser-wide cart key', () => {
  const store = installFakeStorage({
    [LEGACY_SHARED_CART_KEY]: JSON.stringify([{ productId: 100, quantity: 2 }]),
    agrobaba_user: JSON.stringify({ id: '5' }),
  });
  purgeLegacySharedCart();
  assert.equal(store.has(LEGACY_SHARED_CART_KEY), false);
  // The user session is untouched - only the anonymous shared cart blob is dropped.
  assert.equal(store.has('agrobaba_user'), true);
});

test('purgeLegacySharedCart is safe when storage is unavailable or already empty', () => {
  installFakeStorage({});
  purgeLegacySharedCart(); // no throw on empty store
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {},
    removeItem: () => {
      throw new Error('denied');
    },
  };
  purgeLegacySharedCart(); // swallow and continue
});
