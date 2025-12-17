/**
 * Tests for validation utility functions
 */

import {
  validateEmail,
  validatePhoneNumber,
  validateUrl,
  validateUuid,
  validatePassword,
  validateUsername,
  validateFileExtension,
  validateFileSize,
  sanitizeString,
  validateHexColor,
  validateDateRange
} from '../utils/validation';

describe('validation utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@example.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user @example.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
      expect(validateEmail(123 as any)).toBe(false);
    });

    it('should trim whitespace', () => {
      expect(validateEmail('  user@example.com  ')).toBe(true);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should validate E.164 format phone numbers', () => {
      expect(validatePhoneNumber('+14155552671')).toBe(true);
      expect(validatePhoneNumber('+442071234567')).toBe(true);
      expect(validatePhoneNumber('+33123456789')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('555-1234')).toBe(false);
      expect(validatePhoneNumber('4155552671')).toBe(false);
      expect(validatePhoneNumber('+1 (415) 555-2671')).toBe(false);
      expect(validatePhoneNumber('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validatePhoneNumber(null as any)).toBe(false);
      expect(validatePhoneNumber(undefined as any)).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://example.com')).toBe(true);
      expect(validateUrl('https://www.example.com/path')).toBe(true);
      expect(validateUrl('https://example.com:8080/path?query=value')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('ftp://example.com')).toBe(false);
      expect(validateUrl('example.com')).toBe(false);
      expect(validateUrl('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateUrl(null as any)).toBe(false);
      expect(validateUrl(undefined as any)).toBe(false);
    });
  });

  describe('validateUuid', () => {
    it('should validate correct UUIDs', () => {
      expect(validateUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(validateUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(validateUuid('not-a-uuid')).toBe(false);
      expect(validateUuid('550e8400-e29b-41d4-a716')).toBe(false);
      expect(validateUuid('550e8400e29b41d4a716446655440000')).toBe(false);
      expect(validateUuid('')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(validateUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('MyP@ssw0rd');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak passwords', () => {
      const result = validatePassword('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should check minimum length', () => {
      const result = validatePassword('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should require lowercase letters', () => {
      const result = validatePassword('PASSWORD123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should require uppercase letters', () => {
      const result = validatePassword('password123!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should require numbers', () => {
      const result = validatePassword('Password!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should require special characters', () => {
      const result = validatePassword('Password123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should support custom minimum length', () => {
      const result = validatePassword('MyP@ss1', 10);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 10 characters long');
    });
  });

  describe('validateUsername', () => {
    it('should validate correct usernames', () => {
      expect(validateUsername('john_doe')).toBe(true);
      expect(validateUsername('user-123')).toBe(true);
      expect(validateUsername('test_user_01')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(validateUsername('ab')).toBe(false); // Too short
      expect(validateUsername('a'.repeat(31))).toBe(false); // Too long
      expect(validateUsername('user@name')).toBe(false); // Invalid characters
      expect(validateUsername('user name')).toBe(false); // Space
      expect(validateUsername('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateUsername(null as any)).toBe(false);
      expect(validateUsername(undefined as any)).toBe(false);
    });
  });

  describe('validateFileExtension', () => {
    it('should validate correct file extensions', () => {
      expect(validateFileExtension('image.jpg', ['.jpg', '.png'])).toBe(true);
      expect(validateFileExtension('document.pdf', ['.pdf', '.doc'])).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(validateFileExtension('IMAGE.JPG', ['.jpg', '.png'])).toBe(true);
    });

    it('should reject invalid extensions', () => {
      expect(validateFileExtension('file.exe', ['.jpg', '.png'])).toBe(false);
      expect(validateFileExtension('noextension', ['.jpg', '.png'])).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateFileExtension(null as any, ['.jpg'])).toBe(false);
      expect(validateFileExtension('', ['.jpg'])).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('should validate file sizes within limits', () => {
      expect(validateFileSize(1024, 2048)).toBe(true);
      expect(validateFileSize(2048, 2048)).toBe(true);
    });

    it('should reject files exceeding limits', () => {
      expect(validateFileSize(3072, 2048)).toBe(false);
      expect(validateFileSize(0, 2048)).toBe(false);
      expect(validateFileSize(-100, 2048)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateFileSize(null as any, 2048)).toBe(false);
      expect(validateFileSize(1024, null as any)).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize HTML special characters', () => {
      expect(sanitizeString('<script>alert("XSS")</script>'))
        .toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(sanitizeString('Hello & goodbye'))
        .toBe('Hello &amp; goodbye');
      expect(sanitizeString("It's \"great\""))
        .toBe('It&#x27;s &quot;great&quot;');
    });

    it('should handle normal text', () => {
      expect(sanitizeString('Hello World')).toBe('Hello World');
    });

    it('should handle edge cases', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
      expect(sanitizeString('')).toBe('');
    });
  });

  describe('validateHexColor', () => {
    it('should validate correct hex colors', () => {
      expect(validateHexColor('#ff0000')).toBe(true);
      expect(validateHexColor('#FF0000')).toBe(true);
      expect(validateHexColor('#f00')).toBe(true);
      expect(validateHexColor('#abc123')).toBe(true);
    });

    it('should reject invalid hex colors', () => {
      expect(validateHexColor('red')).toBe(false);
      expect(validateHexColor('ff0000')).toBe(false);
      expect(validateHexColor('#gg0000')).toBe(false);
      expect(validateHexColor('#ff00')).toBe(false);
      expect(validateHexColor('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateHexColor(null as any)).toBe(false);
      expect(validateHexColor(undefined as any)).toBe(false);
    });
  });

  describe('validateDateRange', () => {
    it('should validate dates within range', () => {
      const date = new Date('2024-06-15');
      const minDate = new Date('2024-01-01');
      const maxDate = new Date('2024-12-31');
      expect(validateDateRange(date, minDate, maxDate)).toBe(true);
    });

    it('should accept dates without min/max constraints', () => {
      const date = new Date('2024-06-15');
      expect(validateDateRange(date)).toBe(true);
    });

    it('should reject dates before minimum', () => {
      const date = new Date('2023-12-31');
      const minDate = new Date('2024-01-01');
      expect(validateDateRange(date, minDate)).toBe(false);
    });

    it('should reject dates after maximum', () => {
      const date = new Date('2025-01-01');
      const maxDate = new Date('2024-12-31');
      expect(validateDateRange(date, undefined, maxDate)).toBe(false);
    });

    it('should handle invalid dates', () => {
      expect(validateDateRange(new Date('invalid'))).toBe(false);
      expect(validateDateRange(null as any)).toBe(false);
    });
  });
});
