#!/usr/bin/env tsx

/**
 * Translation Extraction Script
 * Scans codebase to find untranslated strings and missing translation keys
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface TranslationKey {
  key: string;
  file: string;
  line: number;
}

interface MissingTranslations {
  [locale: string]: string[];
}

const APPS_TO_SCAN = ['apps/web/src', 'apps/mobile/src'];
const TRANSLATION_PATTERNS = [
  /t\(['"](.+?)['"]\)/g, // t('key')
  /useTranslations\(['"](.+?)['"]\)/g, // useTranslations('namespace')
  /\{t\(['"](.+?)['"]\)\}/g, // {t('key')}
];

/**
 * Extract translation keys from a file
 */
function extractKeysFromFile(filePath: string): TranslationKey[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const keys: TranslationKey[] = [];

  lines.forEach((line, index) => {
    TRANSLATION_PATTERNS.forEach((pattern) => {
      const matches = line.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          keys.push({
            key: match[1],
            file: filePath,
            line: index + 1,
          });
        }
      }
    });
  });

  return keys;
}

/**
 * Load translation file
 */
function loadTranslations(filePath: string): any {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return {};
  }
}

/**
 * Check if translation key exists in object
 */
function hasTranslationKey(obj: any, key: string): boolean {
  const parts = key.split('.');
  let current = obj;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return false;
    }
  }

  return true;
}

/**
 * Find missing translation keys
 */
function findMissingKeys(
  usedKeys: TranslationKey[],
  translations: Record<string, any>
): MissingTranslations {
  const missing: MissingTranslations = {};

  Object.keys(translations).forEach((locale) => {
    missing[locale] = [];

    usedKeys.forEach((keyInfo) => {
      if (!hasTranslationKey(translations[locale], keyInfo.key)) {
        missing[locale].push(keyInfo.key);
      }
    });
  });

  return missing;
}

/**
 * Find unused translation keys
 */
function findUnusedKeys(
  usedKeys: TranslationKey[],
  translations: any,
  prefix = ''
): string[] {
  const unused: string[] = [];
  const usedKeySet = new Set(usedKeys.map((k) => k.key));

  function traverse(obj: any, currentPath: string) {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    Object.keys(obj).forEach((key) => {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;

      if (typeof obj[key] === 'object' && obj[key] !== null) {
        traverse(obj[key], fullPath);
      } else {
        if (!usedKeySet.has(fullPath)) {
          unused.push(fullPath);
        }
      }
    });
  }

  traverse(translations, prefix);
  return unused;
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Scanning codebase for translation usage...\n');

  // Extract keys from all source files
  const allKeys: TranslationKey[] = [];

  for (const appPath of APPS_TO_SCAN) {
    const files = await glob(`${appPath}/**/*.{ts,tsx,js,jsx}`, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.*'],
    });

    console.log(`Scanning ${files.length} files in ${appPath}...`);

    for (const file of files) {
      const keys = extractKeysFromFile(file);
      allKeys.push(...keys);
    }
  }

  console.log(`\n✅ Found ${allKeys.length} translation key usages\n`);

  // Load translation files for web app
  console.log('📚 Loading translation files...\n');

  const webTranslations: Record<string, any> = {};
  const webMessagesPath = 'apps/web/src/messages';
  const locales = ['en', 'es', 'fr', 'de', 'zh', 'ja'];

  for (const locale of locales) {
    const filePath = path.join(webMessagesPath, `${locale}.json`);
    if (fs.existsSync(filePath)) {
      webTranslations[locale] = loadTranslations(filePath);
    }
  }

  // Find missing keys
  console.log('🔎 Checking for missing translations...\n');
  const webMissing = findMissingKeys(allKeys, webTranslations);

  let hasMissing = false;
  Object.entries(webMissing).forEach(([locale, keys]) => {
    if (keys.length > 0) {
      hasMissing = true;
      console.log(`❌ Missing in ${locale}: ${keys.length} keys`);
      keys.slice(0, 10).forEach((key) => console.log(`   - ${key}`));
      if (keys.length > 10) {
        console.log(`   ... and ${keys.length - 10} more`);
      }
      console.log('');
    }
  });

  if (!hasMissing) {
    console.log('✅ No missing translations found\n');
  }

  // Find unused keys
  console.log('🔎 Checking for unused translations...\n');
  const webUnused = findUnusedKeys(allKeys, webTranslations.en);

  if (webUnused.length > 0) {
    console.log(`⚠️  Found ${webUnused.length} potentially unused translation keys:`);
    webUnused.slice(0, 20).forEach((key) => console.log(`   - ${key}`));
    if (webUnused.length > 20) {
      console.log(`   ... and ${webUnused.length - 20} more`);
    }
    console.log('');
  } else {
    console.log('✅ No unused translations found\n');
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    totalKeysUsed: allKeys.length,
    uniqueKeysUsed: new Set(allKeys.map((k) => k.key)).size,
    missingTranslations: webMissing,
    unusedKeys: webUnused,
  };

  const reportPath = 'scripts/translation-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Report saved to ${reportPath}\n`);

  // Exit with error if there are missing translations
  if (hasMissing) {
    console.log('❌ Translation check failed: Missing translations found');
    process.exit(1);
  } else {
    console.log('✅ Translation check passed');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
