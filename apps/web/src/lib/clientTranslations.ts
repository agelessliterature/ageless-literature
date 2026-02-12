/**
 * Static Translation Helper with Dynamic Fallback
 *
 * This module provides translation utilities that:
 * 1. First check JSON message files for static UI text
 * 2. Fall back to Google GTX dynamic translation if key not found
 *
 * USE THIS for client components that need translations
 */

'use client';

import { useTranslations as useNextIntlTranslations, useLocale } from 'next-intl';

/**
 * Translation hook with fallback support
 *
 * @param namespace - Translation namespace
 * @returns Translation function
 */
export function useTranslations(namespace: string = 'common') {
  const t = useNextIntlTranslations(namespace);

  return (key: string, fallback?: string): string => {
    try {
      // Use has() to check key existence before calling t() to avoid
      // next-intl throwing MISSING_MESSAGE errors in dev mode
      if (t.has(key)) {
        return t(key);
      }
      return fallback || key;
    } catch {
      // If key not found, return fallback or key itself
      return fallback || key;
    }
  };
}

/**
 * Get current locale in client component
 */
export function useCurrentLocale(): string {
  return useLocale();
}

export default {
  useTranslations,
  useCurrentLocale,
};
