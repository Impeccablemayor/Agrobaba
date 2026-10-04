/**
 * Standard phone number validation and normalization utilities.
 */

/**
 * Standard Nigerian phone number regex.
 * Matches:
 *  - +234XXXXXXXXXX (13 digits starting with +234)
 *  - 234XXXXXXXXXX  (13 digits starting with 234)
 *  - 0XXXXXXXXXX    (11 digits starting with 0)
 * Valid carrier mobile prefixes in Nigeria start with 70, 71, 80, 81, 90, 91 followed by 8 digits.
 */
export const NIGERIAN_PHONE_REGEX = /^(?:\+?234|0)[789][01]\d{8}$/;

/**
 * HTML5 input pattern regex string allowing optional spaces and hyphens.
 */
export const PHONE_INPUT_PATTERN = '^(?:\\+?234|0)[\\s\\-]?[789][01](?:[\\s\\-]?\\d){8}$';

/**
 * Validates whether a phone number matches the standard Nigerian phone format.
 * Strips whitespace and hyphens prior to regex testing.
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s-]/g, '');
  return NIGERIAN_PHONE_REGEX.test(cleaned);
}

/**
 * Normalizes phone number into E.164 (+234...) format.
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, '');
  if (cleaned.startsWith('0')) {
    return '+234' + cleaned.slice(1);
  }
  if (cleaned.startsWith('234')) {
    return '+' + cleaned;
  }
  return cleaned;
}
