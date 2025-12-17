/**
 * API Versioning System
 *
 * Handles version detection, validation, and management
 */

import { Request } from 'express';
import {
  ApiVersion,
  DEFAULT_VERSION,
  LATEST_VERSION,
  isValidVersion,
  isVersionDeprecated,
  isVersionSunset,
  meetsMinimumVersion,
} from './versions';

/**
 * Version detection result
 */
export interface VersionDetectionResult {
  /** Detected version */
  version: ApiVersion;
  /** Source of version (url, header, default) */
  source: 'url' | 'header' | 'default';
  /** Whether version is deprecated */
  isDeprecated: boolean;
  /** Whether version is sunset */
  isSunset: boolean;
  /** Whether version is the latest */
  isLatest: boolean;
}

/**
 * Extract version from URL path
 * Supports: /api/v1/*, /api/v2/*, etc.
 */
export function extractVersionFromUrl(path: string): ApiVersion | null {
  const match = path.match(/^\/api\/(v\d+)\//);
  if (!match) return null;

  const version = match[1];
  return isValidVersion(version) ? version : null;
}

/**
 * Extract version from Accept-Version header
 * Supports: "1", "v1", "2", "v2", etc.
 */
export function extractVersionFromHeader(header: string | undefined): ApiVersion | null {
  if (!header) return null;

  // Normalize: "1" -> "v1", "2" -> "v2"
  const normalized = header.startsWith('v') ? header : `v${header}`;

  return isValidVersion(normalized) ? normalized : null;
}

/**
 * Detect API version from request
 *
 * Priority:
 * 1. URL path (/api/v1/...)
 * 2. Accept-Version header
 * 3. Default version
 */
export function detectVersion(req: Request): VersionDetectionResult {
  // Try URL first
  const urlVersion = extractVersionFromUrl(req.path);
  if (urlVersion) {
    return {
      version: urlVersion,
      source: 'url',
      isDeprecated: isVersionDeprecated(urlVersion),
      isSunset: isVersionSunset(urlVersion),
      isLatest: urlVersion === LATEST_VERSION,
    };
  }

  // Try header
  const headerVersion = extractVersionFromHeader(req.get('Accept-Version'));
  if (headerVersion) {
    return {
      version: headerVersion,
      source: 'header',
      isDeprecated: isVersionDeprecated(headerVersion),
      isSunset: isVersionSunset(headerVersion),
      isLatest: headerVersion === LATEST_VERSION,
    };
  }

  // Use default
  return {
    version: DEFAULT_VERSION,
    source: 'default',
    isDeprecated: isVersionDeprecated(DEFAULT_VERSION),
    isSunset: isVersionSunset(DEFAULT_VERSION),
    isLatest: DEFAULT_VERSION === LATEST_VERSION,
  };
}

/**
 * Validate version and check if it's supported
 */
export function validateVersion(version: string): {
  valid: boolean;
  error?: string;
  version?: ApiVersion;
} {
  // Check if version format is valid
  if (!isValidVersion(version)) {
    return {
      valid: false,
      error: `Invalid API version: ${version}. Supported versions: v1, v2`,
    };
  }

  // Check if version is sunset
  if (isVersionSunset(version)) {
    return {
      valid: false,
      error: `API version ${version} has reached end-of-life and is no longer supported. Please upgrade to ${LATEST_VERSION}.`,
    };
  }

  // Check if version meets minimum requirement
  if (!meetsMinimumVersion(version)) {
    return {
      valid: false,
      error: `API version ${version} is no longer supported. Minimum version is v1.`,
    };
  }

  return {
    valid: true,
    version,
  };
}

/**
 * Get default version for requests without version specified
 */
export function getDefaultVersion(): ApiVersion {
  return DEFAULT_VERSION;
}

/**
 * Get latest version
 */
export function getLatestVersion(): ApiVersion {
  return LATEST_VERSION;
}

// Re-export everything from versions
export * from './versions';
