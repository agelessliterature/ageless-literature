/**
 * Phone number formatting utilities
 * Uses phoneCountries data for proper formatting
 */

import { parsePhoneNumber, formatPhoneByCountry, getCountryByDialCode } from './phoneCountries';

/**
 * Format phone number for display
 * Converts stored format to readable format based on country code
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';

  const parsed = parsePhoneNumber(phone);
  if (!parsed) return phone;

  const country = getCountryByDialCode(parsed.dialCode);
  if (!country) return phone;

  const formatted = formatPhoneByCountry(parsed.number, country);
  return `${country.dialCode} ${formatted}`;
}

/**
 * Strip phone number to just digits with +
 * Converts formatted phone to storage format
 */
export function stripPhoneFormat(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Validate phone number format
 * Checks if phone has valid country code and sufficient digits
 */
export function isValidPhone(phone: string): boolean {
  const parsed = parsePhoneNumber(phone);
  if (!parsed) return false;

  const country = getCountryByDialCode(parsed.dialCode);
  if (!country) return false;

  // Check if number length matches country's expected length
  const digits = parsed.number.replace(/\D/g, '');
  return digits.length >= Math.min(country.maxLength - 2, 7) && digits.length <= country.maxLength;
}
