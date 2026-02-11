#!/usr/bin/env node

/**
 * Translation Sync Script
 * Automatically translates en.json to es.json, fr.json, de.json using Google GTX
 * Run: node scripts/sync-translations.js
 * Or add to package.json scripts
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const https = require('https');

const MESSAGES_DIR = path.join(__dirname, '../messages');
const TARGET_LANGS = ['es', 'fr', 'de'];

// Language names for logging
const LANG_NAMES = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
};

// Cache to avoid re-translating same text
const translationCache = new Map();

/**
 * Translate text using Google GTX free endpoint
 */
async function translateWithGTX(text, targetLang) {
  // Check cache first
  const cacheKey = `${targetLang}:${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  return new Promise((resolve) => {
    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodedText}`;

    https
      .get(url, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);

            if (!parsed || !parsed[0]) {
              console.warn(`WARNING: No translation for: "${text}" -> ${targetLang}`);
              resolve(text); // Return original
              return;
            }

            // Extract translated text from nested array structure
            const translated = parsed[0]
              .map((item) => item[0])
              .filter(Boolean)
              .join('');

            // Cache the translation
            translationCache.set(cacheKey, translated);
            resolve(translated);
          } catch (error) {
            console.warn(`WARNING: Parse error for: "${text}" -> ${targetLang}`);
            resolve(text); // Fallback to original
          }
        });
      })
      .on('error', (error) => {
        console.error(`ERROR: GTX error for: "${text}" -> ${targetLang}:`, error.message);
        resolve(text); // Fallback to original
      });
  });
}

/**
 * Recursively translate object structure
 */
async function translateObject(obj, targetLang, path = '') {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof value === 'string') {
      // Add small delay to avoid rate limiting (100ms between requests)
      await new Promise((resolve) => setTimeout(resolve, 100));

      process.stdout.write(`\r  Translating: ${currentPath.padEnd(50)} `);
      result[key] = await translateWithGTX(value, targetLang);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = await translateObject(value, targetLang, currentPath);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Main sync function
 */
async function syncTranslations() {
  console.log('Translation Sync Started\n');

  // Read source English file
  const enPath = path.join(MESSAGES_DIR, 'en.json');

  if (!fs.existsSync(enPath)) {
    console.error(`ERROR: Source file not found: ${enPath}`);
    process.exit(1);
  }

  const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  console.log(`SUCCESS: Loaded English translations from en.json\n`);

  // Translate to each target language
  for (const targetLang of TARGET_LANGS) {
    const targetPath = path.join(MESSAGES_DIR, `${targetLang}.json`);
    const langName = LANG_NAMES[targetLang];

    console.log(`Translating to ${langName} (${targetLang})...`);

    try {
      // Load existing translations to preserve manual overrides
      let existingTranslations = {};
      if (fs.existsSync(targetPath)) {
        existingTranslations = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      }

      // Translate the English content
      const translated = await translateObject(enContent, targetLang);

      // Merge: prefer existing manual translations over auto-translated
      const merged = deepMerge(existingTranslations, translated);

      // Write to file with formatting
      fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');

      console.log(`\nSUCCESS: ${langName} translations saved to ${targetLang}.json\n`);
    } catch (error) {
      console.error(`\nERROR: Error translating to ${langName}:`, error.message);
    }
  }

  console.log('Translation sync complete!\n');
  console.log('Summary:');
  console.log(`   Source: en.json`);
  console.log(`   Targets: ${TARGET_LANGS.map((l) => `${l}.json`).join(', ')}`);
  console.log(`   Cache size: ${translationCache.size} translations\n`);
}

/**
 * Deep merge two objects, preferring values from 'existing'
 */
function deepMerge(existing, incoming) {
  const result = { ...incoming };

  for (const [key, value] of Object.entries(existing)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = deepMerge(value, incoming[key] || {});
    } else {
      // Prefer existing translation (manual override)
      result[key] = value;
    }
  }

  return result;
}

// Run the sync
syncTranslations().catch((error) => {
  console.error('ERROR: Fatal error:', error);
  process.exit(1);
});
