import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanAccountNumber, inCoolingOff, sellerPayoutHint, type BankAccountView } from './bankAccountRules.ts';

const acct = (over: Partial<BankAccountView>): BankAccountView => ({
  id: 1, bankCode: '044', bankName: 'Access Bank', maskedNumber: '******6789', accountName: 'OKAFOR CHINEDU', nameMatch: 'MATCH',
  status: 'VERIFIED', source: 'SELLER', verificationMethod: 'FLUTTERWAVE', verifiedAt: null, coolingOffUntil: null,
  reviewReason: null, reviewNote: null, createdAt: '2026-11-19T00:00:00Z', replacedAt: null, ...over,
});

test('account numbers keep digits only, at most 10', () => {
  assert.equal(cleanAccountNumber('012-345 6789 99'), '0123456789');
});

test('cooling-off is active until its end time', () => {
  const now = Date.parse('2026-11-19T12:00:00Z');
  assert.equal(inCoolingOff(acct({ coolingOffUntil: '2026-11-20T12:00:00Z' }), now), true);
  assert.equal(inCoolingOff(acct({ coolingOffUntil: '2026-11-19T11:00:00Z' }), now), false);
  assert.equal(inCoolingOff(null, now), false);
});

test('sellers are told the next step in plain words', () => {
  const now = Date.parse('2026-11-19T12:00:00Z');
  assert.equal(sellerPayoutHint({ ready: true, identityVerified: true, account: acct({}) }), null);
  assert.equal(sellerPayoutHint({ ready: false, identityVerified: false, account: null }), 'Verify your ID first.');
  assert.match(sellerPayoutHint({ ready: false, identityVerified: true, account: null })!, /Add the bank account/);
  assert.match(sellerPayoutHint({ ready: false, identityVerified: true, account: acct({ status: 'PENDING_REVIEW' }) })!, /checking/);
  assert.match(sellerPayoutHint({ ready: false, identityVerified: true, account: acct({ coolingOffUntil: '2026-11-21T00:00:00Z' }) }, now)!, /safety period/);
});
