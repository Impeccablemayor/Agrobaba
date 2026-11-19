import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectionFeeFor } from './fees.ts';

const none = { buyerCollectionPercent: 0, buyerCollectionFixed: 0, buyerCollectionCap: 0 };

test('no collection fee unless configured', () => {
  assert.equal(collectionFeeFor(90000, none), 0);
  assert.equal(collectionFeeFor(90000, null), 0);
});

test('percent plus fixed, rounded to the kobo', () => {
  assert.equal(collectionFeeFor(10000, { buyerCollectionPercent: 1.4, buyerCollectionFixed: 0, buyerCollectionCap: 0 }), 140);
  assert.equal(collectionFeeFor(333.33, { buyerCollectionPercent: 1.5, buyerCollectionFixed: 100, buyerCollectionCap: 0 }), 105);
});

test('the cap limits the fee', () => {
  assert.equal(collectionFeeFor(500000, { buyerCollectionPercent: 1.4, buyerCollectionFixed: 0, buyerCollectionCap: 2000 }), 2000);
});
