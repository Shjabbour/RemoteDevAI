/**
 * Formatting utility functions
 */

/**
 * Formats a date to a readable string
 *
 * @param date - Date to format
 * @param format - Format type ('short', 'long', 'time', 'datetime', 'relative')
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted date string
 *
 * @example
 * formatDate(new Date(), 'short') // '12/16/2025'
 * formatDate(new Date(), 'long') // 'December 16, 2025'
 * formatDate(new Date(), 'relative') // '2 hours ago'
 */
export function formatDate(
  date: Date | string,
  format: 'short' | 'long' | 'time' | 'datetime' | 'relative' = 'short',
  locale: string = 'en-US'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  if (format === 'relative') {
    return formatRelativeTime(dateObj);
  }

  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    short: { year: 'numeric', month: 'numeric', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
    datetime: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  };

  return dateObj.toLocaleDateString(locale, formatOptions[format]);
}

/**
 * Formats a date as relative time (e.g., '2 hours ago')
 *
 * @param date - Date to format
 * @returns Relative time string
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 3600000)) // '1 hour ago'
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } else if (diffWeek < 4) {
    return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
  } else if (diffMonth < 12) {
    return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
  } else {
    return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
  }
}

/**
 * Formats a duration in milliseconds to a readable string
 *
 * @param durationMs - Duration in milliseconds
 * @param format - Format type ('short', 'long', 'precise')
 * @returns Formatted duration string
 *
 * @example
 * formatDuration(3665000) // '1h 1m 5s'
 * formatDuration(3665000, 'long') // '1 hour, 1 minute, 5 seconds'
 */
export function formatDuration(
  durationMs: number,
  format: 'short' | 'long' | 'precise' = 'short'
): string {
  if (typeof durationMs !== 'number' || durationMs < 0) {
    return '0s';
  }

  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const sec = seconds % 60;
  const min = minutes % 60;
  const hr = hours % 24;

  if (format === 'precise') {
    const ms = durationMs % 1000;
    return `${hr}h ${min}m ${sec}s ${ms}ms`;
  }

  const parts: string[] = [];

  if (days > 0) {
    parts.push(format === 'long' ? `${days} day${days > 1 ? 's' : ''}` : `${days}d`);
  }
  if (hr > 0) {
    parts.push(format === 'long' ? `${hr} hour${hr > 1 ? 's' : ''}` : `${hr}h`);
  }
  if (min > 0) {
    parts.push(format === 'long' ? `${min} minute${min > 1 ? 's' : ''}` : `${min}m`);
  }
  if (sec > 0 || parts.length === 0) {
    parts.push(format === 'long' ? `${sec} second${sec > 1 ? 's' : ''}` : `${sec}s`);
  }

  return format === 'long' ? parts.join(', ') : parts.join(' ');
}

/**
 * Formats a file size in bytes to a readable string
 *
 * @param sizeBytes - File size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size string
 *
 * @example
 * formatFileSize(1024) // '1.00 KB'
 * formatFileSize(1536, 0) // '2 KB'
 */
export function formatFileSize(sizeBytes: number, decimals: number = 2): string {
  if (typeof sizeBytes !== 'number' || sizeBytes < 0) {
    return '0 B';
  }

  if (sizeBytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(sizeBytes) / Math.log(k));
  const size = sizeBytes / Math.pow(k, i);

  return `${size.toFixed(decimals)} ${sizes[i]}`;
}

/**
 * Truncates text to a maximum length
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to append if truncated (default: '...')
 * @returns Truncated text
 *
 * @example
 * truncateText('Hello, World!', 8) // 'Hello...'
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = '...'
): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Formats a number with thousand separators
 *
 * @param num - Number to format
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1234567.89) // '1,234,567.89'
 */
export function formatNumber(num: number, locale: string = 'en-US'): string {
  if (typeof num !== 'number') {
    return '0';
  }

  return num.toLocaleString(locale);
}

/**
 * Formats a currency value
 *
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'USD')
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56) // '$1,234.56'
 * formatCurrency(1234.56, 'EUR', 'de-DE') // '1.234,56 €'
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  if (typeof amount !== 'number') {
    return '$0.00';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
}

/**
 * Formats a percentage
 *
 * @param value - Value to format (0-1 or 0-100)
 * @param decimals - Number of decimal places (default: 2)
 * @param isDecimal - Whether value is decimal (0-1) or percentage (0-100) (default: true)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(0.1234) // '12.34%'
 * formatPercentage(12.34, 2, false) // '12.34%'
 */
export function formatPercentage(
  value: number,
  decimals: number = 2,
  isDecimal: boolean = true
): string {
  if (typeof value !== 'number') {
    return '0%';
  }

  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Formats a phone number
 *
 * @param phoneNumber - Phone number to format (E.164 format)
 * @param format - Format type ('national', 'international')
 * @returns Formatted phone number
 *
 * @example
 * formatPhoneNumber('+14155552671', 'national') // '(415) 555-2671'
 * formatPhoneNumber('+14155552671', 'international') // '+1 415-555-2671'
 */
export function formatPhoneNumber(
  phoneNumber: string,
  format: 'national' | 'international' = 'national'
): string {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return '';
  }

  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // US phone number format
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const areaCode = cleaned.substring(1, 4);
    const prefix = cleaned.substring(4, 7);
    const lineNumber = cleaned.substring(7, 11);

    if (format === 'international') {
      return `+1 ${areaCode}-${prefix}-${lineNumber}`;
    }
    return `(${areaCode}) ${prefix}-${lineNumber}`;
  }

  return phoneNumber;
}

/**
 * Capitalizes the first letter of a string
 *
 * @param str - String to capitalize
 * @returns Capitalized string
 *
 * @example
 * capitalize('hello world') // 'Hello world'
 */
export function capitalize(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a string to title case
 *
 * @param str - String to convert
 * @returns Title case string
 *
 * @example
 * toTitleCase('hello world') // 'Hello World'
 */
export function toTitleCase(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Converts a camelCase or PascalCase string to kebab-case
 *
 * @param str - String to convert
 * @returns kebab-case string
 *
 * @example
 * toKebabCase('helloWorld') // 'hello-world'
 */
export function toKebabCase(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Converts a string to camelCase
 *
 * @param str - String to convert
 * @returns camelCase string
 *
 * @example
 * toCamelCase('hello-world') // 'helloWorld'
 */
export function toCamelCase(str: string): string {
  if (!str || typeof str !== 'string') {
    return '';
  }

  return str
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^[A-Z]/, char => char.toLowerCase());
}
