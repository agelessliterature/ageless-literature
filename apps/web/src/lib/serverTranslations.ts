/**
 * Server-Side Static Translation Helpers
 *
 * Utilities for translating static content in React Server Components (RSC)
 * Uses JSON message files from /messages/*.json
 */

import 'server-only';
import { getTranslations, getLocale } from 'next-intl/server';

/**
 * Get translator function for server components
 *
 * @param namespace - Translation namespace (e.g., 'home', 'account', 'common')
 * @returns Translator function
 *
 * @example
 * ```tsx
 * export default async function Page() {
 *   const t = await getServerTranslations('home');
 *   return <h1>{t('title')}</h1>;
 * }
 * ```
 */
export async function getServerTranslations(namespace: string = 'common') {
  return getTranslations(namespace);
}

/**
 * Get current server locale
 *
 * @returns Current locale code
 */
export async function getServerLocale() {
  return getLocale();
}

/**
 * Get multiple translation namespaces at once
 *
 * @param namespaces - Array of namespace names
 * @returns Object with translator functions
 */
export async function getServerTranslationsMultiple(namespaces: string[]) {
  const translations: Record<string, Awaited<ReturnType<typeof getTranslations>>> = {};

  for (const namespace of namespaces) {
    translations[namespace] = await getTranslations(namespace);
  }

  return translations;
}

export default {
  getServerTranslations,
  getServerLocale,
  getServerTranslationsMultiple,
};
