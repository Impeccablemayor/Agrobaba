import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canAccept, canReportProblem, describeStage } from './fulfilmentRules.ts';

const ends = '2026-11-22T12:00:00Z';

test('buyers are told what to do and by when', () => {
  const d = describeStage({ fulfilmentStage: 'INSPECTION', inspectionEndsAt: ends, receiptMethod: 'BUYER_CONFIRMATION' }, 'buyer');
  assert.equal(d.label, 'Check your goods');
  assert.match(d.detail!, /report a problem/);
  const claim = describeStage({ fulfilmentStage: 'AWAITING_RECEIPT', autoConfirmAt: ends }, 'buyer');
  assert.match(claim.detail!, /automatically/);
});

test('sellers are told when their money is released, never the buyer complaint', () => {
  assert.match(describeStage({ fulfilmentStage: 'INSPECTION', inspectionEndsAt: ends, receiptMethod: 'AUTO_CONFIRMED' }, 'seller').detail!, /released after/);
  const held = describeStage({ fulfilmentStage: 'ON_HOLD', onHold: true }, 'seller');
  assert.equal(held.tone, 'danger');
  assert.match(held.detail!, /paused/);
  assert.match(describeStage({ fulfilmentStage: 'COMPLETED' }, 'seller').detail!, /release your money/);
});

test('early acceptance and problem reports only when allowed', () => {
  assert.equal(canAccept({ fulfilmentStage: 'INSPECTION' }), true);
  assert.equal(canAccept({ fulfilmentStage: 'AWAITING_RECEIPT' }), false);
  assert.equal(canAccept({ fulfilmentStage: 'ON_HOLD', onHold: true }), false);
  assert.equal(canReportProblem({ fulfilmentStage: 'AWAITING_DISPATCH' }), false);
  assert.equal(canReportProblem({ fulfilmentStage: 'IN_TRANSIT' }), true);
  assert.equal(canReportProblem({ fulfilmentStage: 'COMPLETED' }), false);
});
