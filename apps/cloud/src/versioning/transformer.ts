/**
 * API Response Transformer
 *
 * Transforms responses between different API versions
 * Handles field mapping, deprecated fields, and format changes
 */

import { ApiVersion } from './versions';

/**
 * Field transformation rule
 */
interface TransformRule {
  /** Source field path (dot notation) */
  from: string;
  /** Target field path (dot notation) */
  to: string;
  /** Optional transformation function */
  transform?: (value: any) => any;
}

/**
 * Version transformation configuration
 */
interface VersionTransform {
  /** Source version */
  from: ApiVersion;
  /** Target version */
  to: ApiVersion;
  /** Field transformation rules */
  rules: TransformRule[];
  /** Fields to remove */
  removeFields?: string[];
  /** Fields to add with default values */
  addFields?: Record<string, any>;
}

/**
 * Transformation rules between versions
 */
const TRANSFORMATIONS: VersionTransform[] = [
  // v1 to v2 transformations
  {
    from: 'v1',
    to: 'v2',
    rules: [
      // Auth response transformations
      {
        from: 'token',
        to: 'accessToken',
      },
      // Add token metadata
    ],
    addFields: {
      tokenType: 'Bearer',
      expiresIn: 3600,
    },
  },
  // v2 to v1 transformations (for backward compatibility)
  {
    from: 'v2',
    to: 'v1',
    rules: [
      {
        from: 'accessToken',
        to: 'token',
      },
    ],
    removeFields: ['tokenType', 'expiresIn', 'refreshToken'],
  },
];

/**
 * Get value from nested object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set value in nested object using dot notation
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!(key in current)) {
      current[key] = {};
    }
    return current[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * Remove field from nested object using dot notation
 */
function removeNestedField(obj: any, path: string): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => current?.[key], obj);
  if (target) {
    delete target[lastKey];
  }
}

/**
 * Transform response from one version to another
 */
export function transformResponse(
  data: any,
  fromVersion: ApiVersion,
  toVersion: ApiVersion
): any {
  // No transformation needed if versions are the same
  if (fromVersion === toVersion) {
    return data;
  }

  // Find transformation rules
  const transform = TRANSFORMATIONS.find(
    (t) => t.from === fromVersion && t.to === toVersion
  );

  if (!transform) {
    console.warn(`No transformation rules found for ${fromVersion} -> ${toVersion}`);
    return data;
  }

  // Clone data to avoid mutation
  const result = JSON.parse(JSON.stringify(data));

  // Apply field transformations
  for (const rule of transform.rules) {
    const value = getNestedValue(result, rule.from);
    if (value !== undefined) {
      const transformedValue = rule.transform ? rule.transform(value) : value;
      setNestedValue(result, rule.to, transformedValue);

      // Remove old field if it's different from new field
      if (rule.from !== rule.to) {
        removeNestedField(result, rule.from);
      }
    }
  }

  // Remove deprecated fields
  if (transform.removeFields) {
    for (const field of transform.removeFields) {
      removeNestedField(result, field);
    }
  }

  // Add new fields
  if (transform.addFields) {
    for (const [key, value] of Object.entries(transform.addFields)) {
      if (getNestedValue(result, key) === undefined) {
        setNestedValue(result, key, value);
      }
    }
  }

  return result;
}

/**
 * Transform auth response for different versions
 */
export function transformAuthResponse(data: any, version: ApiVersion): any {
  if (version === 'v1') {
    // v1 format: simple token
    return {
      user: data.user,
      token: data.accessToken || data.token,
    };
  }

  if (version === 'v2') {
    // v2 format: detailed token info
    return {
      user: data.user,
      accessToken: data.accessToken || data.token,
      refreshToken: data.refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
    };
  }

  return data;
}

/**
 * Transform user response for different versions
 */
export function transformUserResponse(data: any, version: ApiVersion): any {
  if (version === 'v1') {
    // v1: basic user info
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      avatar: data.avatar,
      createdAt: data.createdAt,
    };
  }

  if (version === 'v2') {
    // v2: enhanced user info
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      avatar: data.avatar,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      emailVerified: data.emailVerified || false,
      subscription: data.subscription,
    };
  }

  return data;
}

/**
 * Transform project response for different versions
 */
export function transformProjectResponse(data: any, version: ApiVersion): any {
  if (version === 'v1') {
    // v1: basic project info
    const { metadata, ...rest } = data;
    return rest;
  }

  if (version === 'v2') {
    // v2: includes metadata
    return data;
  }

  return data;
}

/**
 * Transform paginated response for different versions
 */
export function transformPaginatedResponse(
  data: any,
  version: ApiVersion,
  itemTransformer?: (item: any, version: ApiVersion) => any
): any {
  const items = data.items || data.data || [];
  const transformedItems = itemTransformer
    ? items.map((item: any) => itemTransformer(item, version))
    : items;

  if (version === 'v1') {
    // v1: simple pagination
    return {
      data: transformedItems,
      total: data.total,
      page: data.page,
      limit: data.limit,
    };
  }

  if (version === 'v2') {
    // v2: enhanced pagination with metadata
    return {
      data: transformedItems,
      pagination: {
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: Math.ceil(data.total / data.limit),
        hasNext: data.page < Math.ceil(data.total / data.limit),
        hasPrev: data.page > 1,
      },
    };
  }

  return data;
}

/**
 * Transform error response for different versions
 */
export function transformErrorResponse(error: any, version: ApiVersion): any {
  if (version === 'v1') {
    // v1: simple error
    return {
      success: false,
      error: error.error || 'Error',
      message: error.message,
    };
  }

  if (version === 'v2') {
    // v2: enhanced error with details
    return {
      success: false,
      error: {
        code: error.code || error.error || 'UNKNOWN_ERROR',
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
      },
    };
  }

  return error;
}

/**
 * Auto-detect and transform response based on endpoint
 */
export function autoTransformResponse(
  endpoint: string,
  data: any,
  version: ApiVersion
): any {
  // Auth endpoints
  if (endpoint.includes('/auth/login') || endpoint.includes('/auth/register')) {
    return transformAuthResponse(data, version);
  }

  // User endpoints
  if (endpoint.includes('/users/')) {
    return transformUserResponse(data, version);
  }

  // Project endpoints with pagination
  if (endpoint.includes('/projects') && Array.isArray(data.data || data.items)) {
    return transformPaginatedResponse(data, version, transformProjectResponse);
  }

  // Default: no transformation
  return data;
}
