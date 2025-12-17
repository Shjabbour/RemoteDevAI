/**
 * Tests for formatting utility functions
 */

import {
  formatDate,
  formatRelativeTime,
  formatDuration,
  formatFileSize,
  truncateText,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatPhoneNumber,
  capitalize,
  toTitleCase,
  toKebabCase,
  toCamelCase
} from '../utils/formatting';

describe('formatting utilities', () => {
  describe('formatDate', () => {
    const testDate = new Date('2024-12-16T15:30:00Z');

    it('should format date in short format', () => {
      const result = formatDate(testDate, 'short');
      expect(result).toMatch(/12\/16\/2024/);
    });

    it('should format date in long format', () => {
      const result = formatDate(testDate, 'long');
      expect(result).toContain('December');
      expect(result).toContain('2024');
    });

    it('should format date as time', () => {
      const result = formatDate(testDate, 'time');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should format date as datetime', () => {
      const result = formatDate(testDate, 'datetime');
      expect(result).toContain('Dec');
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('should handle string input', () => {
      const result = formatDate('2024-12-16', 'short');
      expect(result).toMatch(/12\/16\/2024/);
    });

    it('should handle invalid dates', () => {
      expect(formatDate(new Date('invalid'), 'short')).toBe('Invalid date');
    });
  });

  describe('formatRelativeTime', () => {
    it('should format recent time as "just now"', () => {
      const date = new Date(Date.now() - 30000); // 30 seconds ago
      expect(formatRelativeTime(date)).toBe('just now');
    });

    it('should format minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      expect(formatRelativeTime(date)).toBe('5 minutes ago');
    });

    it('should format hours ago', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      expect(formatRelativeTime(date)).toBe('3 hours ago');
    });

    it('should format days ago', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      expect(formatRelativeTime(date)).toBe('2 days ago');
    });

    it('should format weeks ago', () => {
      const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 2 weeks ago
      expect(formatRelativeTime(date)).toBe('2 weeks ago');
    });

    it('should handle singular units', () => {
      const date = new Date(Date.now() - 61 * 1000); // 1 minute ago
      expect(formatRelativeTime(date)).toBe('1 minute ago');
    });
  });

  describe('formatDuration', () => {
    it('should format duration in short format', () => {
      expect(formatDuration(3665000)).toBe('1h 1m 5s');
      expect(formatDuration(65000)).toBe('1m 5s');
      expect(formatDuration(5000)).toBe('5s');
    });

    it('should format duration in long format', () => {
      expect(formatDuration(3665000, 'long')).toBe('1 hour, 1 minute, 5 seconds');
      expect(formatDuration(65000, 'long')).toBe('1 minute, 5 seconds');
    });

    it('should format duration in precise format', () => {
      expect(formatDuration(3665123, 'precise')).toBe('1h 1m 5s 123ms');
    });

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('should handle negative values', () => {
      expect(formatDuration(-1000)).toBe('0s');
    });

    it('should handle invalid input', () => {
      expect(formatDuration(null as any)).toBe('0s');
      expect(formatDuration(undefined as any)).toBe('0s');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500.00 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1536)).toBe('1.50 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    it('should handle custom decimal places', () => {
      expect(formatFileSize(1536, 0)).toBe('2 KB');
      expect(formatFileSize(1536, 1)).toBe('1.5 KB');
    });

    it('should handle zero size', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('should handle invalid input', () => {
      expect(formatFileSize(-100)).toBe('0 B');
      expect(formatFileSize(null as any)).toBe('0 B');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      expect(truncateText('Hello, World!', 8)).toBe('Hello...');
    });

    it('should not truncate short text', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
    });

    it('should use custom suffix', () => {
      expect(truncateText('Hello, World!', 8, '…')).toBe('Hello, …');
    });

    it('should handle empty text', () => {
      expect(truncateText('', 10)).toBe('');
    });

    it('should handle invalid input', () => {
      expect(truncateText(null as any, 10)).toBe('');
      expect(truncateText(undefined as any, 10)).toBe('');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with thousand separators', () => {
      expect(formatNumber(1234567.89)).toBe('1,234,567.89');
      expect(formatNumber(1000)).toBe('1,000');
    });

    it('should handle small numbers', () => {
      expect(formatNumber(123)).toBe('123');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle invalid input', () => {
      expect(formatNumber(null as any)).toBe('0');
      expect(formatNumber(undefined as any)).toBe('0');
    });
  });

  describe('formatCurrency', () => {
    it('should format USD currency', () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain('1,234.56');
      expect(result).toContain('$');
    });

    it('should handle different currencies', () => {
      const result = formatCurrency(1234.56, 'EUR', 'de-DE');
      expect(result).toContain('1.234,56');
      expect(result).toContain('€');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0');
    });

    it('should handle invalid input', () => {
      const result = formatCurrency(null as any);
      expect(result).toBe('$0.00');
    });
  });

  describe('formatPercentage', () => {
    it('should format decimal as percentage', () => {
      expect(formatPercentage(0.1234)).toBe('12.34%');
      expect(formatPercentage(0.5)).toBe('50.00%');
    });

    it('should format non-decimal percentage', () => {
      expect(formatPercentage(12.34, 2, false)).toBe('12.34%');
    });

    it('should handle custom decimal places', () => {
      expect(formatPercentage(0.1234, 1)).toBe('12.3%');
      expect(formatPercentage(0.1234, 0)).toBe('12%');
    });

    it('should handle zero', () => {
      expect(formatPercentage(0)).toBe('0.00%');
    });

    it('should handle invalid input', () => {
      expect(formatPercentage(null as any)).toBe('0%');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format US phone numbers in national format', () => {
      expect(formatPhoneNumber('+14155552671', 'national')).toBe('(415) 555-2671');
    });

    it('should format US phone numbers in international format', () => {
      expect(formatPhoneNumber('+14155552671', 'international')).toBe('+1 415-555-2671');
    });

    it('should handle non-US phone numbers', () => {
      const result = formatPhoneNumber('+442071234567', 'national');
      expect(result).toBe('+442071234567'); // Returns original if not US format
    });

    it('should handle empty input', () => {
      expect(formatPhoneNumber('', 'national')).toBe('');
    });

    it('should handle invalid input', () => {
      expect(formatPhoneNumber(null as any, 'national')).toBe('');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello world')).toBe('Hello world');
      expect(capitalize('test')).toBe('Test');
    });

    it('should handle already capitalized text', () => {
      expect(capitalize('Hello')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle invalid input', () => {
      expect(capitalize(null as any)).toBe('');
      expect(capitalize(undefined as any)).toBe('');
    });
  });

  describe('toTitleCase', () => {
    it('should convert to title case', () => {
      expect(toTitleCase('hello world')).toBe('Hello World');
      expect(toTitleCase('the quick brown fox')).toBe('The Quick Brown Fox');
    });

    it('should handle already title case', () => {
      expect(toTitleCase('Hello World')).toBe('Hello World');
    });

    it('should handle empty string', () => {
      expect(toTitleCase('')).toBe('');
    });

    it('should handle invalid input', () => {
      expect(toTitleCase(null as any)).toBe('');
    });
  });

  describe('toKebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(toKebabCase('helloWorld')).toBe('hello-world');
      expect(toKebabCase('myVariableName')).toBe('my-variable-name');
    });

    it('should convert PascalCase to kebab-case', () => {
      expect(toKebabCase('HelloWorld')).toBe('hello-world');
    });

    it('should handle already kebab-case', () => {
      expect(toKebabCase('hello-world')).toBe('hello-world');
    });

    it('should handle empty string', () => {
      expect(toKebabCase('')).toBe('');
    });

    it('should handle invalid input', () => {
      expect(toKebabCase(null as any)).toBe('');
    });
  });

  describe('toCamelCase', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(toCamelCase('hello-world')).toBe('helloWorld');
      expect(toCamelCase('my-variable-name')).toBe('myVariableName');
    });

    it('should convert snake_case to camelCase', () => {
      expect(toCamelCase('hello_world')).toBe('helloWorld');
    });

    it('should convert space-separated to camelCase', () => {
      expect(toCamelCase('hello world')).toBe('helloWorld');
    });

    it('should handle PascalCase input', () => {
      expect(toCamelCase('HelloWorld')).toBe('helloWorld');
    });

    it('should handle empty string', () => {
      expect(toCamelCase('')).toBe('');
    });

    it('should handle invalid input', () => {
      expect(toCamelCase(null as any)).toBe('');
    });
  });
});
