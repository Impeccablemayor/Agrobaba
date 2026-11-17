import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFreshProduce, listingTypeLabel } from './listingLabels.ts';

// Every farmer listing has type "produce" (the seller's flow) - the label must come from the
// category, otherwise chicks/goats/fish are shown as "Fresh Produce" (the reported bug).
const farmer = (categoryCode: string | null) => ({ type: 'produce' as const, listingKind: 'product_sale' as const, categoryCode });

test('farmer livestock, poultry and fish are never labelled Fresh Produce', () => {
  assert.equal(listingTypeLabel(farmer('livestock.poultry.chicken')), 'Poultry');
  assert.equal(listingTypeLabel(farmer('livestock.animals.goat')), 'Livestock');
  assert.equal(listingTypeLabel(farmer('livestock.fish.catfish')), 'Fish & Aquaculture');
  assert.equal(listingTypeLabel(farmer('value_added.processed_foods.garri')), 'Processed & Value-Added');
});

test('genuine produce keeps the Fresh Produce label', () => {
  assert.equal(listingTypeLabel(farmer('produce.grains.maize')), 'Fresh Produce');
  assert.equal(listingTypeLabel(farmer('produce.vegetables.tomatoes')), 'Fresh Produce');
});

test('agro-dealer inputs and equipment get their own labels', () => {
  const dealer = (categoryCode: string, listingKind: 'product_sale' | 'equipment_sale' = 'product_sale') =>
    ({ type: 'product' as const, listingKind, categoryCode });
  assert.equal(listingTypeLabel(dealer('inputs.fertilizers.npk')), 'Farm Inputs');
  assert.equal(listingTypeLabel(dealer('inputs.animal_feed.poultry_feed')), 'Farm Inputs');
  assert.equal(listingTypeLabel(dealer('equipment.tractors_implements.tractors', 'equipment_sale')), 'Equipment & Machinery');
});

test('services are labelled as services, not products', () => {
  assert.equal(
    listingTypeLabel({ type: 'service', listingKind: 'service_booking', categoryCode: 'services.veterinary.poultry_vet' }),
    'Agro Service',
  );
});

test('custom "Other" listings show the seller-supplied section name when present', () => {
  assert.equal(
    listingTypeLabel({ type: 'produce', listingKind: 'product_sale', categoryCode: 'uncategorized.other', customSectionName: 'Snail Farming' }),
    'Snail Farming',
  );
  assert.equal(listingTypeLabel({ type: 'produce', listingKind: 'product_sale', categoryCode: 'uncategorized.other' }), 'Other');
});

test('legacy rows without a category never fall back to Fresh Produce', () => {
  assert.equal(listingTypeLabel(farmer(null)), 'Farm Product');
  assert.equal(listingTypeLabel({ type: 'product', listingKind: 'equipment_sale', categoryCode: null }), 'Equipment & Machinery');
  assert.equal(listingTypeLabel({ type: 'product', listingKind: null, categoryCode: '' }), 'Agro Product');
});

test('isFreshProduce (home "Fresh Produce" rail) is category-based', () => {
  assert.equal(isFreshProduce({ categoryCode: 'produce.tubers.yam' }), true);
  assert.equal(isFreshProduce({ categoryCode: 'livestock.poultry.chicken' }), false);
  assert.equal(isFreshProduce({ categoryCode: null }), false);
});
