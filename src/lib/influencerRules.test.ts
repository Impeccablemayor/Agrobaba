import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMinPayout, payoutState } from './influencerRules.ts';

test('commission is paid once it reaches the minimum', () => {
  const s = payoutState({ payable: 20000, overpaid: 0, minPayout: 15000 });
  assert.equal(s.amount, 20000);
  assert.equal(s.canPay, true);
  assert.equal(s.reasonNeeded, false);
});

test('below the minimum it waits, or is paid now with a reason', () => {
  const s = payoutState({ payable: 900, overpaid: 0, minPayout: 15000 });
  assert.equal(s.canPay, true);
  assert.equal(s.reasonNeeded, true);
  assert.match(s.message, /below the ₦15,000 minimum/);
});

test('an earlier overpayment comes off the next payout', () => {
  const s = payoutState({ payable: 20000, overpaid: 450, minPayout: 15000 });
  assert.equal(s.amount, 19550);
  assert.match(s.message, /₦20,000 commission less ₦450 overpaid/);
  const under = payoutState({ payable: 15200, overpaid: 450, minPayout: 15000 });
  assert.equal(under.reasonNeeded, true, '14,750 after the deduction is below 15,000');
});

test('nothing is sent while the overpayment is larger than what is payable', () => {
  const s = payoutState({ payable: 300, overpaid: 450, minPayout: 15000 });
  assert.equal(s.canPay, false);
  assert.match(s.message, /overpaid earlier/);
  assert.equal(payoutState({ payable: 0, overpaid: 0, minPayout: 15000 }).canPay, false);
});

test('a blank minimum uses the default; amounts are checked', () => {
  assert.deepEqual(parseMinPayout(''), { value: null, error: null });
  assert.deepEqual(parseMinPayout('50,000'), { value: 50000, error: null });
  assert.match(parseMinPayout('-1').error!, /0 or more/);
  assert.match(parseMinPayout('abc').error!, /0 or more/);
});
