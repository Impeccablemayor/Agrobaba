/**
 * Pure helpers for the six-digit email OTP UI. No network, no React, no storage - everything
 * here is deterministic and unit-testable under `node --test` (this module deliberately has
 * NO relative imports, because Node's type stripping cannot resolve extensionless paths).
 */

export const OTP_LENGTH = 6;

/** Strips every non-digit and keeps at most OTP_LENGTH characters (paste and typing share this). */
export function normalizeOtpInput(value: string): string {
  return value.replace(/\D+/g, '').slice(0, OTP_LENGTH);
}

/** True when the input is a complete code (exactly OTP_LENGTH digits). */
export function isCompleteOtp(value: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(value);
}

/** The value each box should display: one digit per box, empty past the end. */
export function otpDigits(value: string): string[] {
  const normalized = normalizeOtpInput(value);
  return Array.from({ length: OTP_LENGTH }, (_, i) => normalized[i] ?? '');
}

/**
 * Distributes a pasted string over the boxes starting at `startIndex`, consuming only digits.
 * Returns the joined code the field should hold after the paste.
 */
export function applyOtpPaste(paste: string, startIndex: number, previous: string): string {
  const digits = normalizeOtpInput(paste);
  const prefix = normalizeOtpInput(previous).slice(0, startIndex);
  return normalizeOtpInput(prefix + digits);
}

/** Seconds remaining until `epochMs`, floored at 0. Used for the resend cooldown countdown. */
export function secondsUntil(epochMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((epochMs - nowMs) / 1000));
}

/** "0:59" style countdown label for the resend button. */
export function formatCooldown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
