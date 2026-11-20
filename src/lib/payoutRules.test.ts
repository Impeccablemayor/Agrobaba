import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canCancelPayout, canSendNow, gateLines, needsOwnApproval, skippedLines, type PayoutGates } from './payoutRules.ts';

const open: PayoutGates = {
  transfersEnabled: true, providerConfigured: true, liveKey: false, liveApproved: false, paused: false, pauseReason: null,
  mode: 'APPROVAL', approvalThreshold: 500000, minimum: 0,
};

test('money moves only when every gate is open', () => {
  assert.equal(canSendNow(open), true, 'test keys need no live approval');
  assert.equal(canSendNow({ ...open, transfersEnabled: false }), false);
  assert.equal(canSendNow({ ...open, liveKey: true }), false, 'live keys need PAYOUT_LIVE_APPROVED');
  assert.equal(canSendNow({ ...open, liveKey: true, liveApproved: true }), true);
  assert.equal(canSendNow({ ...open, paused: true }), false);
  assert.match(gateLines({ ...open, paused: true, pauseReason: 'bank holiday' })[3].detail, /bank holiday/);
  assert.match(gateLines({ ...open, liveKey: true })[2].detail, /written confirmation/);
});

test('only an unsent payout can be cancelled; large ones are approved one by one', () => {
  assert.equal(canCancelPayout('PENDING_APPROVAL'), true);
  assert.equal(canCancelPayout('QUEUED'), true);
  assert.equal(canCancelPayout('PROCESSING'), false, 'once sent, Flutterwave decides');
  assert.equal(canCancelPayout('UNKNOWN'), false);
  assert.equal(needsOwnApproval({ status: 'PENDING_APPROVAL', approvalReason: 'LARGE_AMOUNT' }), true);
  assert.equal(needsOwnApproval({ status: 'PENDING_APPROVAL', approvalReason: 'APPROVAL_MODE' }), false);
});

test('skipped reasons are listed one per line', () => {
  assert.deepEqual(skippedLines('AGR-1 / seller #5: no bank account\n\nAGR-2 / seller #6: on hold'), ['AGR-1 / seller #5: no bank account', 'AGR-2 / seller #6: on hold']);
  assert.deepEqual(skippedLines(null), []);
});
