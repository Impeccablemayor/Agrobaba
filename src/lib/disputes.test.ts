import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allowedOutcomes, canChangeBeforeDispatch, canOpenDispute, evidenceFileError, resolveError, shortfallLines, statusLabel,
} from './disputeRules.ts';

test('a dispute opens after the part is sent and before it is completed, never twice', () => {
  assert.equal(canOpenDispute({ fulfilmentStage: 'AWAITING_DISPATCH' }), false, 'before sending the buyer cancels instead');
  assert.equal(canOpenDispute({ fulfilmentStage: 'IN_TRANSIT' }), true);
  assert.equal(canOpenDispute({ fulfilmentStage: 'INSPECTION' }), true);
  assert.equal(canOpenDispute({ fulfilmentStage: 'ON_HOLD', onHold: true }), false);
  assert.equal(canOpenDispute({ fulfilmentStage: 'COMPLETED' }), false);
});

test('cancelling or reporting a shortfall is only possible while the part is being prepared', () => {
  assert.equal(canChangeBeforeDispatch({ fulfilmentStage: 'AWAITING_DISPATCH' }), true);
  assert.equal(canChangeBeforeDispatch({ fulfilmentStage: 'AWAITING_DISPATCH', onHold: true }), false);
  assert.equal(canChangeBeforeDispatch({ fulfilmentStage: 'UNPAID' }), false, 'unpaid orders use the ordinary cancel');
  assert.equal(canChangeBeforeDispatch({ fulfilmentStage: 'IN_TRANSIT' }), false);
});

test('evidence must be a photo or a PDF of 5 MB or less', () => {
  assert.equal(evidenceFileError('image/jpeg', 9_000_000), null, 'photos are resized before upload');
  assert.equal(evidenceFileError('application/pdf', 1_000_000), null);
  assert.match(evidenceFileError('application/pdf', 6 * 1024 * 1024)!, /5 MB/);
  assert.match(evidenceFileError('application/zip', 10)!, /photos/);
});

test('once the seller is paid out, AgroBaba cannot refund from the platform', () => {
  assert.deepEqual(allowedOutcomes(true), ['SELLER_REFUNDED_DIRECTLY', 'OTHER']);
  assert.ok(!allowedOutcomes(false).includes('SELLER_REFUNDED_DIRECTLY'));
  const base = { refundable: 30000, refundableDelivery: 1500, sellerPaidOut: true };
  assert.match(resolveError({ ...base, outcome: 'FULL_REFUND' })!, /already been paid/);
  assert.match(resolveError({ ...base, outcome: 'SELLER_REFUNDED_DIRECTLY', note: '' })!, /how the seller refunded/);
  assert.equal(resolveError({ ...base, outcome: 'SELLER_REFUNDED_DIRECTLY', note: '₦5,000 by transfer, ref 123' }), null);
});

test('refunds never exceed what is left on the part', () => {
  const base = { refundable: 30000, refundableDelivery: 1500, sellerPaidOut: false };
  assert.equal(resolveError({ ...base, outcome: 'FULL_REFUND' }), null);
  assert.match(resolveError({ ...base, outcome: 'FULL_REFUND', refundable: 0 })!, /Nothing is left/);
  assert.match(resolveError({ ...base, outcome: 'PARTIAL_REFUND', amount: 0 })!, /Enter the amount/);
  assert.match(resolveError({ ...base, outcome: 'PARTIAL_REFUND', amount: 30000.01 })!, /At most ₦30,000 can be refunded/);
  assert.match(resolveError({ ...base, outcome: 'PARTIAL_REFUND', amount: 1000, deliveryPortion: 2000 })!, /more than the refund/);
  assert.match(resolveError({ ...base, outcome: 'PARTIAL_REFUND', amount: 5000, deliveryPortion: 2000 })!, /delivery fee is left/);
  assert.equal(resolveError({ ...base, outcome: 'PARTIAL_REFUND', amount: 5000, deliveryPortion: 1500 }), null);
  assert.match(resolveError({ ...base, outcome: 'OTHER', note: '' })!, /Describe/);
  assert.equal(resolveError({ ...base, outcome: 'RELEASE_TO_SELLER' }), null);
});

test('a shortfall lists only the lines that went down, within what is still owed', () => {
  const items = [{ id: '1', quantity: 3 }, { id: '2', quantity: 5, shortfallQuantity: 1 }];
  assert.deepEqual(shortfallLines(items, { '1': '2', '2': '4' }), { lines: [{ orderItemId: 1, availableQuantity: 2 }], error: null });
  assert.match(shortfallLines(items, { '2': '5' }).error!, /at most 4/);
  assert.match(shortfallLines(items, { '1': '1.5' }).error!, /whole numbers/);
  assert.match(shortfallLines(items, { '1': '3' }).error!, /at least one/);
  assert.deepEqual(shortfallLines(items, { '1': '0' }).lines, [{ orderItemId: 1, availableQuantity: 0 }]);
});

test('each side sees a status in their own words', () => {
  assert.equal(statusLabel('AWAITING_SELLER', 'seller'), 'Your response needed');
  assert.equal(statusLabel('AWAITING_SELLER', 'buyer'), 'Waiting for the seller');
  assert.equal(statusLabel('RESOLVED', 'admin'), 'Decided');
});
