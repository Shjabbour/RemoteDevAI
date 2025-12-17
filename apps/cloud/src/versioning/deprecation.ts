/**
 * API Deprecation Management
 *
 * Tracks deprecated endpoints, versions, and features
 * Adds appropriate headers and warnings
 */

import { Request, Response, NextFunction } from 'express';
import { ApiVersion, getVersionMetadata, getDaysUntilSunset } from './versions';

/**
 * Deprecated endpoint configuration
 */
interface DeprecatedEndpoint {
  /** Endpoint pattern (supports wildcards) */
  pattern: string | RegExp;
  /** HTTP method */
  method?: string;
  /** Version where deprecated */
  deprecatedIn: ApiVersion;
  /** Sunset date (ISO string) */
  sunsetDate?: string;
  /** Deprecation reason */
  reason: string;
  /** Alternative endpoint */
  alternative?: string;
  /** Migration guide URL */
  migrationGuide?: string;
}

/**
 * Deprecated field configuration
 */
interface DeprecatedField {
  /** Field path (dot notation) */
  field: string;
  /** Version where deprecated */
  deprecatedIn: ApiVersion;
  /** Sunset date (ISO string) */
  sunsetDate?: string;
  /** Alternative field */
  alternative?: string;
  /** Deprecation reason */
  reason?: string;
}

/**
 * Registry of deprecated endpoints
 */
const DEPRECATED_ENDPOINTS: DeprecatedEndpoint[] = [
  // Example: Old auth endpoint
  // {
  //   pattern: '/api/auth/token',
  //   method: 'POST',
  //   deprecatedIn: 'v1',
  //   sunsetDate: '2025-12-31',
  //   reason: 'Replaced with improved authentication flow',
  //   alternative: '/api/v2/auth/refresh',
  //   migrationGuide: '/docs/migrations/auth-v1-to-v2',
  // },
];

/**
 * Registry of deprecated fields
 */
const DEPRECATED_FIELDS: Record<string, DeprecatedField[]> = {
  '/api/v1/auth/login': [
    {
      field: 'token',
      deprecatedIn: 'v1',
      alternative: 'accessToken',
      reason: 'Use accessToken and refreshToken for better security',
    },
  ],
};

/**
 * Check if endpoint matches pattern
 */
function matchesPattern(path: string, pattern: string | RegExp): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(path);
  }
  return path === pattern || path.startsWith(pattern + '/');
}

/**
 * Find deprecated endpoint configuration
 */
function findDeprecatedEndpoint(
  path: string,
  method: string
): DeprecatedEndpoint | null {
  for (const endpoint of DEPRECATED_ENDPOINTS) {
    if (endpoint.method && endpoint.method !== method) continue;
    if (matchesPattern(path, endpoint.pattern)) {
      return endpoint;
    }
  }
  return null;
}

/**
 * Find deprecated fields for endpoint
 */
function findDeprecatedFields(path: string): DeprecatedField[] {
  for (const [pattern, fields] of Object.entries(DEPRECATED_FIELDS)) {
    if (matchesPattern(path, pattern)) {
      return fields;
    }
  }
  return [];
}

/**
 * Add deprecation headers to response
 */
export function addDeprecationHeaders(
  res: Response,
  deprecation: DeprecatedEndpoint
): void {
  // Standard Deprecation header (RFC 8594)
  res.setHeader('Deprecation', 'true');

  // Sunset header (RFC 8594)
  if (deprecation.sunsetDate) {
    res.setHeader('Sunset', deprecation.sunsetDate);
  }

  // Custom headers for additional info
  if (deprecation.alternative) {
    res.setHeader('X-API-Alternative', deprecation.alternative);
  }

  if (deprecation.migrationGuide) {
    res.setHeader('X-API-Migration-Guide', deprecation.migrationGuide);
  }

  res.setHeader('X-API-Deprecation-Reason', deprecation.reason);
}

/**
 * Add deprecation warning to response body
 */
export function addDeprecationWarning(
  body: any,
  deprecation: DeprecatedEndpoint,
  version: ApiVersion
): any {
  if (typeof body !== 'object' || body === null) {
    return body;
  }

  // Calculate days until sunset
  let daysUntilSunset: number | null = null;
  if (deprecation.sunsetDate) {
    const sunset = new Date(deprecation.sunsetDate);
    const now = new Date();
    const diffTime = sunset.getTime() - now.getTime();
    daysUntilSunset = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Add deprecation warning
  body._deprecation = {
    deprecated: true,
    version,
    endpoint: deprecation.pattern.toString(),
    reason: deprecation.reason,
    deprecatedIn: deprecation.deprecatedIn,
    sunsetDate: deprecation.sunsetDate,
    daysUntilSunset,
    alternative: deprecation.alternative,
    migrationGuide: deprecation.migrationGuide,
    message: deprecation.sunsetDate
      ? `This endpoint is deprecated and will be removed on ${deprecation.sunsetDate}. ` +
        `Please migrate to ${deprecation.alternative || 'the new API'}.`
      : `This endpoint is deprecated. Please migrate to ${deprecation.alternative || 'the new API'}.`,
  };

  return body;
}

/**
 * Add field deprecation warnings to response body
 */
export function addFieldDeprecationWarnings(
  body: any,
  fields: DeprecatedField[]
): any {
  if (typeof body !== 'object' || body === null || fields.length === 0) {
    return body;
  }

  const fieldWarnings: any[] = [];

  for (const field of fields) {
    // Check if deprecated field exists in response
    const fieldPath = field.field.split('.');
    let current = body;
    let exists = true;

    for (const key of fieldPath) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        exists = false;
        break;
      }
    }

    if (exists) {
      fieldWarnings.push({
        field: field.field,
        deprecated: true,
        deprecatedIn: field.deprecatedIn,
        alternative: field.alternative,
        reason: field.reason,
        sunsetDate: field.sunsetDate,
      });
    }
  }

  if (fieldWarnings.length > 0) {
    if (!body._deprecation) {
      body._deprecation = {};
    }
    body._deprecation.fields = fieldWarnings;
  }

  return body;
}

/**
 * Middleware to handle endpoint deprecation
 */
export function deprecationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const version = req.apiVersion;
  const path = req.path;
  const method = req.method;

  // Check if endpoint is deprecated
  const deprecatedEndpoint = findDeprecatedEndpoint(path, method);

  if (deprecatedEndpoint) {
    // Add deprecation headers
    addDeprecationHeaders(res, deprecatedEndpoint);

    // Override json method to add warning to body
    const originalJson = res.json.bind(res);
    res.json = function (body: any): Response {
      body = addDeprecationWarning(body, deprecatedEndpoint, version);
      return originalJson(body);
    };

    // Log deprecation usage
    console.warn('[Deprecation]', {
      endpoint: path,
      method,
      version,
      reason: deprecatedEndpoint.reason,
      alternative: deprecatedEndpoint.alternative,
    });
  }

  // Check for deprecated fields
  const deprecatedFields = findDeprecatedFields(path);

  if (deprecatedFields.length > 0) {
    // Override json method to add field warnings
    const originalJson = res.json.bind(res);
    res.json = function (body: any): Response {
      body = addFieldDeprecationWarnings(body, deprecatedFields);
      return originalJson(body);
    };
  }

  next();
}

/**
 * Mark endpoint as deprecated
 */
export function markDeprecated(
  pattern: string | RegExp,
  config: Omit<DeprecatedEndpoint, 'pattern'>
): void {
  DEPRECATED_ENDPOINTS.push({
    pattern,
    ...config,
  });
}

/**
 * Mark field as deprecated
 */
export function markFieldDeprecated(
  endpoint: string,
  field: DeprecatedField
): void {
  if (!DEPRECATED_FIELDS[endpoint]) {
    DEPRECATED_FIELDS[endpoint] = [];
  }
  DEPRECATED_FIELDS[endpoint].push(field);
}

/**
 * Get all deprecated endpoints
 */
export function getDeprecatedEndpoints(): DeprecatedEndpoint[] {
  return [...DEPRECATED_ENDPOINTS];
}

/**
 * Get deprecated endpoints for a specific version
 */
export function getDeprecatedEndpointsForVersion(
  version: ApiVersion
): DeprecatedEndpoint[] {
  return DEPRECATED_ENDPOINTS.filter((e) => e.deprecatedIn === version);
}

/**
 * Check if endpoint will be sunset soon (within 30 days)
 */
export function isSunsetSoon(deprecation: DeprecatedEndpoint): boolean {
  if (!deprecation.sunsetDate) return false;

  const sunset = new Date(deprecation.sunsetDate);
  const now = new Date();
  const daysUntilSunset = Math.ceil(
    (sunset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysUntilSunset > 0 && daysUntilSunset <= 30;
}

/**
 * Generate deprecation notice for documentation
 */
export function generateDeprecationNotice(
  deprecation: DeprecatedEndpoint
): string {
  let notice = `**DEPRECATED**: This endpoint is deprecated`;

  if (deprecation.sunsetDate) {
    notice += ` and will be removed on ${deprecation.sunsetDate}`;
  }

  notice += `.\n\n**Reason**: ${deprecation.reason}`;

  if (deprecation.alternative) {
    notice += `\n\n**Alternative**: Use \`${deprecation.alternative}\` instead.`;
  }

  if (deprecation.migrationGuide) {
    notice += `\n\n**Migration Guide**: ${deprecation.migrationGuide}`;
  }

  return notice;
}
