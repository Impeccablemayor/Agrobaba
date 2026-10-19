import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOtpPaste,
  formatCooldown,
  isCompleteOtp,
  normalizeOtpInput,
  otpDigits,
  OTP_LENGTH,
  secondsUntil,
} from './otp.ts';

test('normalizeOtpInput strips non-digits and caps at six characters', () => {
  assert.equal(normalizeOtpInput('123456'), '123456');
  assert.equal(normalizeOtpInput('  1 2-3 4.5 6!'), '123456');
  assert.equal(normalizeOtpInput('123456789'), '123456');
  assert.equal(normalizeOtpInput('abc'), '');
  assert.equal(normalizeOtpInput('00a007'), '00007');
});

test('isCompleteOtp accepts exactly six digits and rejects everything else', () => {
  assert.equal(isCompleteOtp('123456'), true);
  assert.equal(isCompleteOtp('000000'), true);
  assert.equal(isCompleteOtp('12345'), false);
  assert.equal(isCompleteOtp('1234567'), false);
  assert.equal(isCompleteOtp('12345a'), false);
  assert.equal(isCompleteOtp(''), false);
});

test('otpDigits spreads the code across the boxes with empty tails', () => {
  assert.deepEqual(otpDigits('12'), ['1', '2', '', '', '', '']);
  assert.deepEqual(otpDigits('123456'), ['1', '2', '3', '4', '5', '6']);
  assert.equal(otpDigits('123456').length, OTP_LENGTH);
  assert.deepEqual(otpDigits('12a3'), ['1', '2', '3', '', '', '']);
});

test('applyOtpPaste consumes only digits starting from the focused box', () => {
  // Paste over an empty field.
  assert.equal(applyOtpPaste('123456', 0, ''), '123456');
  // Paste into box 2 keeps the digits already committed in box 1.
  assert.equal(applyOtpPaste('3456', 2, '12'), '123456');
  // Pasting junk after existing digits keeps the committed prefix.
  assert.equal(applyOtpPaste('9x9', 2, '12'), '1299');
  // Overlong paste is truncated to the box count.
  assert.equal(applyOtpPaste('999999999', 0, ''), '999999');
  // Pasting at the last box still overflows correctly and gets capped.
  assert.equal(applyOtpPaste('56', 5, '1234'), '123456');
});

test('secondsUntil floors at zero and rounds up partial seconds', () => {
  const now = 1_000_000;
  assert.equal(secondsUntil(now + 60_000, now), 60);
  assert.equal(secondsUntil(now + 1_000, now), 1);
  assert.equal(secondsUntil(now + 500, now), 1); // partial second still shows 1
  assert.equal(secondsUntil(now, now), 0);
  assert.equal(secondsUntil(now - 5_000, now), 0); // never negative
});

test('formatCooldown renders m:ss and clamps negatives to zero', () => {
  assert.equal(formatCooldown(59), '0:59');
  assert.equal(formatCooldown(60), '1:00');
  assert.equal(formatCooldown(61), '1:01');
  assert.equal(formatCooldown(0), '0:00');
  assert.equal(formatCooldown(-3), '0:00');
});
