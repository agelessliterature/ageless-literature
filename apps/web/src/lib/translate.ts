/**
 * Server-Side Translation System using Free Google GTX Endpoint
 *
 * This module provides:
 * - Server-only translation (NEVER on frontend)
 * - Free Google GTX endpoint (NO API key needed)
 * - Multi-layer caching (in-memory + persistent)
 * - Fallback to original text on errors
 * - Zero hydration issues
 * - SEO-friendly SSR
 */

import 'server-only';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

interface TranslationCache {
  [cacheKey: string]: string;
}

interface GoogleGTXResponse {
  0?: Array<Array<string | null>>;
}

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

const memoryCache: TranslationCache = {};

// ============================================================================
// PERSISTENT CACHE (JSON FILE)
// ============================================================================

const CACHE_FILE_PATH = path.join(process.cwd(), '.next', 'translation-cache.json');

/**
 * Load persistent cache from disk
 */
async function loadPersistentCache(): Promise<TranslationCache> {
  try {
    const data = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/**
 * Save persistent cache to disk
 */
async function savePersistentCache(cache: TranslationCache): Promise<void> {
  try {
    await fs.mkdir(path.dirname(CACHE_FILE_PATH), { recursive: true });
    await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (error) {
    console.error('Translation error:', error);
  }
}

// ============================================================================
// CACHE HELPERS
// ============================================================================

/**
 * Generate cache key: "locale:text"
 */
function getCacheKey(text: string, locale: string): string {
  return `${locale}:${text.trim().substring(0, 200)}`;
}

/**
 * Get translation from cache (memory first, then persistent)
 */
async function getFromCache(cacheKey: string): Promise<string | null> {
  // Check memory cache first
  if (memoryCache[cacheKey]) {
    return memoryCache[cacheKey];
  }

  // Check persistent cache
  const persistentCache = await loadPersistentCache();
  if (persistentCache[cacheKey]) {
    // Store in memory for faster future access
    memoryCache[cacheKey] = persistentCache[cacheKey];
    return persistentCache[cacheKey];
  }

  return null;
}

/**
 * Store translation in both caches
 */
async function storeInCache(cacheKey: string, translatedText: string): Promise<void> {
  // Store in memory
  memoryCache[cacheKey] = translatedText;

  // Store in persistent cache (async, don't wait)
  loadPersistentCache()
    .then((cache) => {
      cache[cacheKey] = translatedText;
      return savePersistentCache(cache);
    })
    .catch(() => {
      // Silently handle cache errors
    });
}

// ============================================================================
// GOOGLE GTX TRANSLATION
// ============================================================================

/**
 * Translate text using free Google GTX endpoint
 *
 * @param text - Text to translate
 * @param targetLocale - Target language code (es, fr, de, etc.)
 * @returns Translated text
 */
async function translateWithGoogleGTX(text: string, targetLocale: string): Promise<string> {
  try {
    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLocale}&dt=t&q=${encodedText}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Translation API returned ${response.status}`);
    }

    const data: GoogleGTXResponse = await response.json();

    // GTX returns: [[["translated text", "original text", null, null, 3], ...], ...]
    if (data && data[0] && Array.isArray(data[0])) {
      const translatedParts = data[0]
        .filter((item): item is Array<string | null> => Array.isArray(item))
        .map((item) => item[0])
        .filter((item): item is string => typeof item === 'string');

      return translatedParts.join('');
    }

    throw new Error('Invalid response format from GTX');
  } catch (error) {
    return text; // Return original on error
  }
}

// ============================================================================
// LOCALE HELPERS
// ============================================================================

/**
 * Get current user's locale from cookie
 */
export async function getCurrentLocale(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE');

    if (localeCookie?.value && ['en', 'es', 'fr', 'de'].includes(localeCookie.value)) {
      return localeCookie.value;
    }
  } catch {
    // Ignore cookie errors
  }

  return 'en'; // Default to English
}

// ============================================================================
// MAIN TRANSLATION FUNCTION
// ============================================================================

/**
 * Translate dynamic content (SERVER-SIDE ONLY)
 *
 * Process:
 * 1. If locale is 'en' - return original
 * 2. Check in-memory cache
 * 3. Check persistent cache
 * 4. Translate with Google GTX
 * 5. Store in both caches
 * 6. Return translated text
 *
 * @param text - Text to translate
 * @param targetLocale - Optional locale (uses current if not provided)
 * @returns Translated text
 *
 * @example
 * ```tsx
 * const title = await translateDynamic(book.title, 'es');
 * ```
 */
export async function translateDynamic(
  text: string | undefined | null,
  targetLocale?: string,
): Promise<string> {
  // Handle empty input
  if (!text || text.trim() === '') {
    return '';
  }

  // Get locale
  const locale = targetLocale || (await getCurrentLocale());

  // Step 1: If English, return original
  if (locale === 'en') {
    return text;
  }

  // Generate cache key
  const cacheKey = getCacheKey(text, locale);

  // Step 2 & 3: Check caches
  const cachedTranslation = await getFromCache(cacheKey);
  if (cachedTranslation) {
    return cachedTranslation;
  }

  // Step 4: Translate with Google GTX
  const translated = await translateWithGoogleGTX(text, locale);

  // Step 5: Store in caches
  await storeInCache(cacheKey, translated);

  // Step 6: Return result
  return translated;
}

/**
 * Translate multiple fields of an object
 *
 * @param obj - Object to translate
 * @param fields - Fields to translate
 * @param targetLocale - Target locale
 * @returns Object with translated fields
 *
 * @example
 * ```tsx
 * const translatedBook = await translateObject(book, ['title', 'description'], 'fr');
 * ```
 */
export async function translateObject<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
  targetLocale?: string,
): Promise<T> {
  const translated = { ...obj };

  for (const field of fields) {
    if (typeof obj[field] === 'string') {
      translated[field] = (await translateDynamic(obj[field] as string, targetLocale)) as any;
    }
  }

  return translated;
}

/**
 * Translate array of objects
 *
 * @param items - Array of objects
 * @param fields - Fields to translate in each object
 * @param targetLocale - Target locale
 * @returns Array with translated objects
 *
 * @example
 * ```tsx
 * const translatedBooks = await translateArray(books, ['title', 'description'], 'de');
 * ```
 */
export async function translateArray<T extends Record<string, any>>(
  items: T[],
  fields: (keyof T)[],
  targetLocale?: string,
): Promise<T[]> {
  return Promise.all(items.map((item) => translateObject(item, fields, targetLocale)));
}

/**
 * Clear translation caches (for maintenance)
 */
export async function clearTranslationCache(): Promise<void> {
  // Clear memory cache
  Object.keys(memoryCache).forEach((key) => delete memoryCache[key]);

  // Clear persistent cache
  try {
    await fs.unlink(CACHE_FILE_PATH);
  } catch {
    // File doesn't exist, that's fine
  }
}

export default {
  translateDynamic,
  translateObject,
  translateArray,
  getCurrentLocale,
  clearTranslationCache,
};
