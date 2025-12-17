/**
 * Internationalization (i18n) Configuration
 * Defines supported locales and default settings for RemoteDevAI
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

// RTL (Right-to-Left) languages support
export const rtlLocales: Locale[] = [];

export function isRTL(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

// Date/time formatting options
export const dateFormats: Record<Locale, Intl.DateTimeFormatOptions> = {
  en: { year: 'numeric', month: 'long', day: 'numeric' },
  es: { year: 'numeric', month: 'long', day: 'numeric' },
  fr: { year: 'numeric', month: 'long', day: 'numeric' },
  de: { year: 'numeric', month: 'long', day: 'numeric' },
  zh: { year: 'numeric', month: 'long', day: 'numeric' },
  ja: { year: 'numeric', month: 'long', day: 'numeric' },
};

// Number formatting options
export const numberFormats: Record<Locale, Intl.NumberFormatOptions> = {
  en: { notation: 'standard' },
  es: { notation: 'standard' },
  fr: { notation: 'standard' },
  de: { notation: 'standard' },
  zh: { notation: 'standard' },
  ja: { notation: 'standard' },
};

// Currency formatting
export const currencyFormats: Record<Locale, { currency: string; locale: string }> = {
  en: { currency: 'USD', locale: 'en-US' },
  es: { currency: 'EUR', locale: 'es-ES' },
  fr: { currency: 'EUR', locale: 'fr-FR' },
  de: { currency: 'EUR', locale: 'de-DE' },
  zh: { currency: 'CNY', locale: 'zh-CN' },
  ja: { currency: 'JPY', locale: 'ja-JP' },
};
