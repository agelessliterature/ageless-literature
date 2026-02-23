/**
 * Format a number as money with currency symbol
 */
export function formatMoney(
  value: number | string | null | undefined,
  options?: {
    fromCents?: boolean;
    currency?: string;
    showCurrency?: boolean;
    decimals?: number;
  },
): string {
  if (value === null || value === undefined || value === '') return '$0';

  const { fromCents = false, currency = 'USD', showCurrency = true, decimals = 0 } = options || {};

  let numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) return '$0';

  // Convert from cents to dollars if needed
  if (fromCents) {
    numValue = numValue / 100;
  }

  const formatted = numValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (!showCurrency) return formatted;

  // Currency symbols
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  return `${symbols[currency] || '$'}${formatted}`;
}

/**
 * Format a date with various options
 */
export function formatDate(
  date: string | Date | null | undefined,
  options?: {
    format?: 'short' | 'medium' | 'long' | 'relative';
    includeTime?: boolean;
  },
): string {
  if (!date) return '';

  const { format = 'medium', includeTime = false } = options || {};

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '';

  if (format === 'relative') {
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
  }

  const dateFormatOptions: Intl.DateTimeFormatOptions =
    format === 'short'
      ? { month: 'numeric', day: 'numeric', year: '2-digit' }
      : format === 'long'
        ? { month: 'long', day: 'numeric', year: 'numeric' }
        : { month: 'short', day: 'numeric', year: 'numeric' };

  if (includeTime) {
    dateFormatOptions.hour = '2-digit';
    dateFormatOptions.minute = '2-digit';
  }

  return dateObj.toLocaleDateString('en-US', dateFormatOptions);
}

/**
 * Format a number with commas and optional decimals
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimals: number = 0,
): string {
  if (value === null || value === undefined || value === '') return '0';

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) return '0';

  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a percentage value
 */
export function formatPercentage(
  value: number | string | null | undefined,
  options?: {
    fromDecimal?: boolean;
    decimals?: number;
  },
): string {
  if (value === null || value === undefined || value === '') return '0%';

  const { fromDecimal = false, decimals = 1 } = options || {};

  let numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) return '0%';

  // Convert from decimal (0.15 -> 15%)
  if (fromDecimal) {
    numValue = numValue * 100;
  }

  return `${numValue.toFixed(decimals)}%`;
}
