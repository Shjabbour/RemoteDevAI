/**
 * Validation utility functions
 */

/**
 * Email validation regex (RFC 5322 simplified)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Phone number validation regex (E.164 format)
 */
const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

/**
 * URL validation regex
 */
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

/**
 * UUID validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates an email address
 *
 * @param email - Email address to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * validateEmail('user@example.com') // true
 * validateEmail('invalid-email') // false
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates a phone number in E.164 format
 *
 * @param phoneNumber - Phone number to validate (should start with +)
 * @returns True if valid, false otherwise
 *
 * @example
 * validatePhoneNumber('+14155552671') // true
 * validatePhoneNumber('555-1234') // false
 */
export function validatePhoneNumber(phoneNumber: string): boolean {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false;
  }
  return PHONE_REGEX.test(phoneNumber.trim());
}

/**
 * Validates a URL
 *
 * @param url - URL to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * validateUrl('https://example.com') // true
 * validateUrl('not-a-url') // false
 */
export function validateUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  return URL_REGEX.test(url.trim());
}

/**
 * Validates a UUID
 *
 * @param uuid - UUID to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * validateUuid('550e8400-e29b-41d4-a716-446655440000') // true
 * validateUuid('not-a-uuid') // false
 */
export function validateUuid(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') {
    return false;
  }
  return UUID_REGEX.test(uuid.trim());
}

/**
 * Validates a password meets minimum requirements
 *
 * @param password - Password to validate
 * @param minLength - Minimum password length (default: 8)
 * @returns Object with validation result and error messages
 *
 * @example
 * validatePassword('MyP@ssw0rd') // { valid: true, errors: [] }
 * validatePassword('weak') // { valid: false, errors: [...] }
 */
export function validatePassword(
  password: string,
  minLength: number = 8
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
    return { valid: false, errors };
  }

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a username
 *
 * @param username - Username to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * validateUsername('john_doe123') // true
 * validateUsername('a') // false (too short)
 */
export function validateUsername(username: string): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }

  const trimmed = username.trim();

  // Must be 3-30 characters
  if (trimmed.length < 3 || trimmed.length > 30) {
    return false;
  }

  // Can only contain letters, numbers, underscores, and hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  return usernameRegex.test(trimmed);
}

/**
 * Validates a file extension
 *
 * @param fileName - File name to validate
 * @param allowedExtensions - Array of allowed extensions (e.g., ['.jpg', '.png'])
 * @returns True if valid, false otherwise
 *
 * @example
 * validateFileExtension('image.jpg', ['.jpg', '.png']) // true
 * validateFileExtension('file.exe', ['.jpg', '.png']) // false
 */
export function validateFileExtension(
  fileName: string,
  allowedExtensions: string[]
): boolean {
  if (!fileName || typeof fileName !== 'string') {
    return false;
  }

  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return allowedExtensions.some(ext => ext.toLowerCase() === extension);
}

/**
 * Validates a file size
 *
 * @param fileSizeBytes - File size in bytes
 * @param maxSizeBytes - Maximum allowed size in bytes
 * @returns True if valid, false otherwise
 *
 * @example
 * validateFileSize(1024, 2048) // true
 * validateFileSize(3072, 2048) // false
 */
export function validateFileSize(
  fileSizeBytes: number,
  maxSizeBytes: number
): boolean {
  if (typeof fileSizeBytes !== 'number' || typeof maxSizeBytes !== 'number') {
    return false;
  }

  return fileSizeBytes > 0 && fileSizeBytes <= maxSizeBytes;
}

/**
 * Sanitizes a string for safe display
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 *
 * @example
 * sanitizeString('<script>alert("XSS")</script>') // '&lt;script&gt;alert("XSS")&lt;/script&gt;'
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates a hex color code
 *
 * @param color - Color code to validate
 * @returns True if valid, false otherwise
 *
 * @example
 * validateHexColor('#ff0000') // true
 * validateHexColor('red') // false
 */
export function validateHexColor(color: string): boolean {
  if (!color || typeof color !== 'string') {
    return false;
  }

  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color.trim());
}

/**
 * Validates a date is within a range
 *
 * @param date - Date to validate
 * @param minDate - Minimum allowed date (optional)
 * @param maxDate - Maximum allowed date (optional)
 * @returns True if valid, false otherwise
 *
 * @example
 * validateDateRange(new Date(), new Date('2020-01-01'), new Date('2025-01-01')) // true
 */
export function validateDateRange(
  date: Date,
  minDate?: Date,
  maxDate?: Date
): boolean {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return false;
  }

  if (minDate && date < minDate) {
    return false;
  }

  if (maxDate && date > maxDate) {
    return false;
  }

  return true;
}
