/**
 * International Phone Country Codes and Formats
 * Comprehensive list of countries with their phone formats
 */

export interface PhoneCountry {
  code: string; // Country code (e.g., "US", "GB")
  name: string; // Country name
  dialCode: string; // Phone dial code (e.g., "+1", "+44")
  format: string; // Phone format pattern
  placeholder: string; // Example phone number
  maxLength: number; // Maximum digits after country code
  flag: string; // Flag emoji
}

export const phoneCountries: PhoneCountry[] = [
  // North America
  {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    format: '(###) ###-####',
    placeholder: '(555) 123-4567',
    maxLength: 10,
    flag: '🇺🇸',
  },
  {
    code: 'CA',
    name: 'Canada',
    dialCode: '+1',
    format: '(###) ###-####',
    placeholder: '(555) 123-4567',
    maxLength: 10,
    flag: '🇨🇦',
  },

  // Europe
  {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    format: '#### ######',
    placeholder: '7400 123456',
    maxLength: 10,
    flag: '🇬🇧',
  },
  {
    code: 'DE',
    name: 'Germany',
    dialCode: '+49',
    format: '### ########',
    placeholder: '151 12345678',
    maxLength: 11,
    flag: '🇩🇪',
  },
  {
    code: 'FR',
    name: 'France',
    dialCode: '+33',
    format: '# ## ## ## ##',
    placeholder: '6 12 34 56 78',
    maxLength: 9,
    flag: '🇫🇷',
  },
  {
    code: 'ES',
    name: 'Spain',
    dialCode: '+34',
    format: '### ### ###',
    placeholder: '612 345 678',
    maxLength: 9,
    flag: '🇪🇸',
  },
  {
    code: 'IT',
    name: 'Italy',
    dialCode: '+39',
    format: '### ### ####',
    placeholder: '312 345 6789',
    maxLength: 10,
    flag: '🇮🇹',
  },
  {
    code: 'NL',
    name: 'Netherlands',
    dialCode: '+31',
    format: '# ########',
    placeholder: '6 12345678',
    maxLength: 9,
    flag: '🇳🇱',
  },
  {
    code: 'BE',
    name: 'Belgium',
    dialCode: '+32',
    format: '### ## ## ##',
    placeholder: '470 12 34 56',
    maxLength: 9,
    flag: '🇧🇪',
  },
  {
    code: 'CH',
    name: 'Switzerland',
    dialCode: '+41',
    format: '## ### ## ##',
    placeholder: '78 123 45 67',
    maxLength: 9,
    flag: '🇨🇭',
  },
  {
    code: 'AT',
    name: 'Austria',
    dialCode: '+43',
    format: '### #######',
    placeholder: '664 1234567',
    maxLength: 10,
    flag: '🇦🇹',
  },
  {
    code: 'SE',
    name: 'Sweden',
    dialCode: '+46',
    format: '## ### ## ##',
    placeholder: '70 123 45 67',
    maxLength: 9,
    flag: '🇸🇪',
  },
  {
    code: 'NO',
    name: 'Norway',
    dialCode: '+47',
    format: '### ## ###',
    placeholder: '412 34 567',
    maxLength: 8,
    flag: '🇳🇴',
  },
  {
    code: 'DK',
    name: 'Denmark',
    dialCode: '+45',
    format: '## ## ## ##',
    placeholder: '32 12 34 56',
    maxLength: 8,
    flag: '🇩🇰',
  },
  {
    code: 'FI',
    name: 'Finland',
    dialCode: '+358',
    format: '## ### ####',
    placeholder: '50 123 4567',
    maxLength: 9,
    flag: '🇫🇮',
  },
  {
    code: 'PL',
    name: 'Poland',
    dialCode: '+48',
    format: '### ### ###',
    placeholder: '512 345 678',
    maxLength: 9,
    flag: '🇵🇱',
  },
  {
    code: 'IE',
    name: 'Ireland',
    dialCode: '+353',
    format: '## ### ####',
    placeholder: '85 123 4567',
    maxLength: 9,
    flag: '🇮🇪',
  },
  {
    code: 'PT',
    name: 'Portugal',
    dialCode: '+351',
    format: '### ### ###',
    placeholder: '912 345 678',
    maxLength: 9,
    flag: '🇵🇹',
  },
  {
    code: 'GR',
    name: 'Greece',
    dialCode: '+30',
    format: '### ### ####',
    placeholder: '691 234 5678',
    maxLength: 10,
    flag: '🇬🇷',
  },

  // Asia-Pacific
  {
    code: 'AU',
    name: 'Australia',
    dialCode: '+61',
    format: '### ### ###',
    placeholder: '412 345 678',
    maxLength: 9,
    flag: '🇦🇺',
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    dialCode: '+64',
    format: '## ### ####',
    placeholder: '21 123 4567',
    maxLength: 9,
    flag: '🇳🇿',
  },
  {
    code: 'JP',
    name: 'Japan',
    dialCode: '+81',
    format: '## #### ####',
    placeholder: '90 1234 5678',
    maxLength: 10,
    flag: '🇯🇵',
  },
  {
    code: 'CN',
    name: 'China',
    dialCode: '+86',
    format: '### #### ####',
    placeholder: '138 0013 8000',
    maxLength: 11,
    flag: '🇨🇳',
  },
  {
    code: 'KR',
    name: 'South Korea',
    dialCode: '+82',
    format: '## #### ####',
    placeholder: '10 1234 5678',
    maxLength: 10,
    flag: '🇰🇷',
  },
  {
    code: 'IN',
    name: 'India',
    dialCode: '+91',
    format: '##### #####',
    placeholder: '81234 56789',
    maxLength: 10,
    flag: '🇮🇳',
  },
  {
    code: 'SG',
    name: 'Singapore',
    dialCode: '+65',
    format: '#### ####',
    placeholder: '8123 4567',
    maxLength: 8,
    flag: '🇸🇬',
  },
  {
    code: 'MY',
    name: 'Malaysia',
    dialCode: '+60',
    format: '## ### ####',
    placeholder: '12 345 6789',
    maxLength: 10,
    flag: '🇲🇾',
  },
  {
    code: 'TH',
    name: 'Thailand',
    dialCode: '+66',
    format: '## ### ####',
    placeholder: '81 234 5678',
    maxLength: 9,
    flag: '🇹🇭',
  },
  {
    code: 'PH',
    name: 'Philippines',
    dialCode: '+63',
    format: '### ### ####',
    placeholder: '912 345 6789',
    maxLength: 10,
    flag: '🇵🇭',
  },
  {
    code: 'ID',
    name: 'Indonesia',
    dialCode: '+62',
    format: '### #### ####',
    placeholder: '812 3456 7890',
    maxLength: 11,
    flag: '🇮🇩',
  },
  {
    code: 'VN',
    name: 'Vietnam',
    dialCode: '+84',
    format: '## #### ####',
    placeholder: '91 2345 6789',
    maxLength: 10,
    flag: '🇻🇳',
  },

  // Middle East
  {
    code: 'AE',
    name: 'United Arab Emirates',
    dialCode: '+971',
    format: '## ### ####',
    placeholder: '50 123 4567',
    maxLength: 9,
    flag: '🇦🇪',
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    dialCode: '+966',
    format: '## ### ####',
    placeholder: '50 123 4567',
    maxLength: 9,
    flag: '🇸🇦',
  },
  {
    code: 'IL',
    name: 'Israel',
    dialCode: '+972',
    format: '## ### ####',
    placeholder: '50 123 4567',
    maxLength: 9,
    flag: '🇮🇱',
  },
  {
    code: 'TR',
    name: 'Turkey',
    dialCode: '+90',
    format: '### ### ####',
    placeholder: '501 234 5678',
    maxLength: 10,
    flag: '🇹🇷',
  },

  // Latin America
  {
    code: 'MX',
    name: 'Mexico',
    dialCode: '+52',
    format: '## #### ####',
    placeholder: '55 1234 5678',
    maxLength: 10,
    flag: '🇲🇽',
  },
  {
    code: 'BR',
    name: 'Brazil',
    dialCode: '+55',
    format: '## #####-####',
    placeholder: '11 91234-5678',
    maxLength: 11,
    flag: '🇧🇷',
  },
  {
    code: 'AR',
    name: 'Argentina',
    dialCode: '+54',
    format: '## #### ####',
    placeholder: '11 2345 6789',
    maxLength: 10,
    flag: '🇦🇷',
  },
  {
    code: 'CL',
    name: 'Chile',
    dialCode: '+56',
    format: '# #### ####',
    placeholder: '9 1234 5678',
    maxLength: 9,
    flag: '🇨🇱',
  },
  {
    code: 'CO',
    name: 'Colombia',
    dialCode: '+57',
    format: '### ### ####',
    placeholder: '301 234 5678',
    maxLength: 10,
    flag: '🇨🇴',
  },

  // Africa
  {
    code: 'ZA',
    name: 'South Africa',
    dialCode: '+27',
    format: '## ### ####',
    placeholder: '71 123 4567',
    maxLength: 9,
    flag: '🇿🇦',
  },
  {
    code: 'EG',
    name: 'Egypt',
    dialCode: '+20',
    format: '### ### ####',
    placeholder: '100 123 4567',
    maxLength: 10,
    flag: '🇪🇬',
  },
  {
    code: 'NG',
    name: 'Nigeria',
    dialCode: '+234',
    format: '### ### ####',
    placeholder: '802 123 4567',
    maxLength: 10,
    flag: '🇳🇬',
  },
  {
    code: 'KE',
    name: 'Kenya',
    dialCode: '+254',
    format: '### ######',
    placeholder: '712 123456',
    maxLength: 9,
    flag: '🇰🇪',
  },

  // Other regions
  {
    code: 'RU',
    name: 'Russia',
    dialCode: '+7',
    format: '### ###-##-##',
    placeholder: '912 345-67-89',
    maxLength: 10,
    flag: '🇷🇺',
  },
  {
    code: 'UA',
    name: 'Ukraine',
    dialCode: '+380',
    format: '## ### ####',
    placeholder: '50 123 4567',
    maxLength: 9,
    flag: '🇺🇦',
  },
];

/**
 * Get country by dial code
 */
export function getCountryByDialCode(dialCode: string): PhoneCountry | undefined {
  return phoneCountries.find((c) => c.dialCode === dialCode);
}

/**
 * Get country by country code
 */
export function getCountryByCode(code: string): PhoneCountry | undefined {
  return phoneCountries.find((c) => c.code === code);
}

/**
 * Format phone number according to country format
 */
export function formatPhoneByCountry(phone: string, country: PhoneCountry): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  if (!digits) return '';

  // Apply format pattern
  let formatted = '';
  let digitIndex = 0;

  for (let i = 0; i < country.format.length && digitIndex < digits.length; i++) {
    if (country.format[i] === '#') {
      formatted += digits[digitIndex];
      digitIndex++;
    } else {
      formatted += country.format[i];
    }
  }

  return formatted;
}

/**
 * Parse phone number to extract dial code and number
 */
export function parsePhoneNumber(phone: string): { dialCode: string; number: string } | null {
  if (!phone || !phone.startsWith('+')) {
    return null;
  }

  // Try to match against known dial codes (longest first)
  const sortedCountries = [...phoneCountries].sort((a, b) => b.dialCode.length - a.dialCode.length);

  for (const country of sortedCountries) {
    if (phone.startsWith(country.dialCode)) {
      return {
        dialCode: country.dialCode,
        number: phone.substring(country.dialCode.length).replace(/\D/g, ''),
      };
    }
  }

  return null;
}
