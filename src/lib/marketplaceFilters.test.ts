import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MARKETPLACE_FILTERS, filterMarketplaceProducts, hasActiveMarketplaceFilters, matchesState } from './marketplaceFilters.ts';
import type { Product } from '../types';

const product = (overrides: Partial<Product>): Product => ({
  id: '1', name: 'x', description: '', price: 1000, category: 'Maize', categoryId: '3', categoryCode: 'produce.grains.maize',
  listingKind: 'product_sale', type: 'produce', size: 'Standard', quantity: 10, unit: 'bag', location: 'Ibadan, Oyo',
  image: null, negotiated: false, sellerId: '2', sellerName: 'Farmer 1', sellerRole: 'farmer', verified: false,
  sellerBusinessVerified: false, rating: 0, reviews: 0, sold: 0, discount: 0, tags: [], createdAt: '', status: 'active',
  ...overrides,
});

test('state matching tolerates legacy spellings and the FCT', () => {
  assert.equal(matchesState({ location: 'Ibadan, Oyo', tags: [] }, 'Oyo'), true);
  assert.equal(matchesState({ location: 'Ibadan, Oyo State', tags: [] }, 'Oyo'), true);
  assert.equal(matchesState({ location: 'Abeokuta, Ogun State, Nigeria', tags: [] }, 'Ogun'), true);
  assert.equal(matchesState({ location: 'Abuja Municipal, Federal Capital Territory', tags: [] }, 'Federal Capital Territory'), true);
  assert.equal(matchesState({ location: 'Ibadan, Oyo', tags: [] }, 'Ogun'), false);
  assert.equal(matchesState({ location: '', tags: ['kaduna'] }, 'Kaduna'), true);
  assert.equal(matchesState({ location: 'Ibadan, Oyo', tags: [] }, ''), true);
});

test('filters compose: type, role, verified, state and price', () => {
  const list = [
    product({ id: 'maize', price: 38000, verified: true }),
    product({ id: 'npk', type: 'product', sellerRole: 'agro-dealer', location: 'Kaduna, Kaduna', price: 32000 }),
    product({ id: 'vet', type: 'service', sellerRole: 'service-provider', location: 'Abuja Municipal, Federal Capital Territory', price: 15000 }),
    product({ id: 'goats', negotiated: true, price: null }),
  ];
  const ids = (f: Partial<typeof DEFAULT_MARKETPLACE_FILTERS>) =>
    filterMarketplaceProducts(list, { ...DEFAULT_MARKETPLACE_FILTERS, ...f }).map((p) => p.id);

  assert.deepEqual(ids({}), ['maize', 'npk', 'vet', 'goats']);
  assert.deepEqual(ids({ listingType: 'service' }), ['vet']);
  assert.deepEqual(ids({ listingType: 'product' }), ['maize', 'npk', 'goats']);
  assert.deepEqual(ids({ sellerRole: 'agro-dealer' }), ['npk']);
  assert.deepEqual(ids({ verifiedOnly: true }), ['maize']);
  assert.deepEqual(ids({ state: 'Kaduna' }), ['npk']);
  assert.deepEqual(ids({ minPrice: 20000, maxPrice: 35000 }), ['npk']);
  assert.deepEqual(ids({ minPrice: 1 }), ['maize', 'npk', 'vet'], 'negotiated listings have no price to compare');
});

test('hasActiveMarketplaceFilters', () => {
  assert.equal(hasActiveMarketplaceFilters(DEFAULT_MARKETPLACE_FILTERS), false);
  assert.equal(hasActiveMarketplaceFilters({ ...DEFAULT_MARKETPLACE_FILTERS, maxPrice: 0 }), true);
});
