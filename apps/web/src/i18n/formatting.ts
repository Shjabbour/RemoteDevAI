/**
 * Internationalization Formatting Utilities
 * Provides locale-aware formatting for dates, times, numbers, and currency
 */

import { type Locale, dateFormats, numberFormats, currencyFormats } from './config';

/**
 * Format a date according to the specified locale
 */
export function formatDate(
  date: Date | string | number,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const formatOptions = options || dateFormats[locale];

  return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
}

/**
 * Format a date and time according to the specified locale
 */
export function formatDateTime(
  date: Date | string | number,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };

  return new Intl.DateTimeFormat(locale, options || defaultOptions).format(dateObj);
}

/**
 * Format a time according to the specified locale
 */
export function formatTime(
  date: Date | string | number,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };

  return new Intl.DateTimeFormat(locale, options || defaultOptions).format(dateObj);
}

/**
 * Format a relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: Locale,
  baseDate: Date = new Date()
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const diffMs = dateObj.getTime() - baseDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffYears) > 0) {
    return rtf.format(diffYears, 'year');
  } else if (Math.abs(diffMonths) > 0) {
    return rtf.format(diffMonths, 'month');
  } else if (Math.abs(diffWeeks) > 0) {
    return rtf.format(diffWeeks, 'week');
  } else if (Math.abs(diffDays) > 0) {
    return rtf.format(diffDays, 'day');
  } else if (Math.abs(diffHours) > 0) {
    return rtf.format(diffHours, 'hour');
  } else if (Math.abs(diffMinutes) > 0) {
    return rtf.format(diffMinutes, 'minute');
  } else {
    return rtf.format(diffSeconds, 'second');
  }
}

/**
 * Format a number according to the specified locale
 */
export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  const formatOptions = options || numberFormats[locale];
  return new Intl.NumberFormat(locale, formatOptions).format(value);
}

/**
 * Format a currency value according to the specified locale
 */
export function formatCurrency(
  value: number,
  locale: Locale,
  currency?: string
): string {
  const { currency: defaultCurrency, locale: numberLocale } = currencyFormats[locale];
  const currencyCode = currency || defaultCurrency;

  return new Intl.NumberFormat(numberLocale, {
    style: 'currency',
    currency: currencyCode,
  }).format(value);
}

/**
 * Format a percentage according to the specified locale
 */
export function formatPercent(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  const defaultOptions: Intl.NumberFormatOptions = {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  };

  return new Intl.NumberFormat(locale, { ...defaultOptions, ...options }).format(value);
}

/**
 * Format file size in a human-readable format
 */
export function formatFileSize(bytes: number, locale: Locale, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return formatNumber(parseFloat((bytes / Math.pow(k, i)).toFixed(dm)), locale) + ' ' + sizes[i];
}

/**
 * Format duration in a human-readable format (e.g., "2h 30m")
 */
export function formatDuration(
  seconds: number,
  locale: Locale,
  short: boolean = true
): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}${short ? 'h' : ` hour${hours !== 1 ? 's' : ''}`}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}${short ? 'm' : ` minute${minutes !== 1 ? 's' : ''}`}`);
  }
  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs}${short ? 's' : ` second${secs !== 1 ? 's' : ''}`}`);
  }

  return parts.join(' ');
}

/**
 * Format a list of items according to the specified locale
 */
export function formatList(
  items: string[],
  locale: Locale,
  type: 'conjunction' | 'disjunction' = 'conjunction'
): string {
  return new Intl.ListFormat(locale, { type }).format(items);
}
