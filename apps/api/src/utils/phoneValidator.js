/**
 * Phone Number Validation Utilities
 * Validates international phone numbers with any country code
 */

/**
 * Strip phone number to just digits with +
 * Converts formatted phone to storage format
 */
function stripPhoneFormat(phone) {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Validate phone number format
 * Must start with + followed by country code (1-3 digits) and phone number (8-15 digits)
 */
function isValidPhone(phone) {
  if (!phone) return false;
  const cleaned = stripPhoneFormat(phone);

  // International format: + followed by 1-3 digit country code and 8-15 digits
  return /^\+\d{1,3}\d{8,15}$/.test(cleaned);
}

/**
 * Format phone number for storage
 * Strips all formatting and stores as +[country code][number]
 */
function normalizePhone(phone) {
  return stripPhoneFormat(phone);
}

/**
 * Format phone number for display
 * Formats based on detected country code
 */
function formatPhoneDisplay(phone) {
  if (!phone) return '';

  const cleaned = stripPhoneFormat(phone);

  // Check if it starts with +
  if (!cleaned.startsWith('+')) {
    return phone; // Return as-is if not in international format
  }

  // Extract country code and number
  const match = cleaned.match(/^\+(\d{1,3})(.*)$/);
  if (!match) return phone;

  const countryCode = match[1];
  const number = match[2];

  // Format based on country code
  if (countryCode === '1' && number.length === 10) {
    // US/Canada: +1 (123) 456-7890
    return `+1 (${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
  } else if (countryCode === '44' && number.length === 10) {
    // UK: +44 1234 567 890
    return `+44 ${number.substring(0, 4)} ${number.substring(4, 7)} ${number.substring(7)}`;
  } else if (['33', '34', '39', '49'].includes(countryCode) && number.length === 9) {
    // France, Spain, Italy, Germany: +XX XXX XXX XXX
    return `+${countryCode} ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
  } else if (number.length >= 8) {
    // Generic international: +XXX XXXX XXXX
    return `+${countryCode} ${number.substring(0, 4)} ${number.substring(4)}`;
  }

  // Return as-is if no format matches
  return phone;
}

module.exports = {
  stripPhoneFormat,
  isValidPhone,
  normalizePhone,
  formatPhoneDisplay,
};
