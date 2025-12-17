/**
 * Shared i18n locale configuration
 * Used across all RemoteDevAI applications
 */

export const locales = ['en', 'es', 'fr', 'de', 'zh', 'ja'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  zh: '中文',
  ja: '日本語',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  zh: '🇨🇳',
  ja: '🇯🇵',
};

export const localeNativeNames: Record<Locale, string> = {
  en: 'English (US)',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  zh: '简体中文',
  ja: '日本語',
};

/**
 * Check if a given string is a valid locale
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/**
 * Get a valid locale from a string, falling back to default if invalid
 */
export function getValidLocale(locale: string | null | undefined): Locale {
  if (!locale) return defaultLocale;

  // Try exact match
  if (isValidLocale(locale)) return locale;

  // Try language code only (e.g., 'en-US' -> 'en')
  const langCode = locale.split('-')[0].toLowerCase();
  if (isValidLocale(langCode)) return langCode;

  return defaultLocale;
}
