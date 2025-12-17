/**
 * API Version Configuration
 *
 * Defines all API versions, their lifecycle dates, and metadata
 */

export interface VersionMetadata {
  /** Release date in ISO format */
  released: string;
  /** Deprecation date (when version is marked deprecated) */
  deprecated: string | null;
  /** Sunset date (when version will be removed) */
  sunset: string | null;
  /** Version description */
  description: string;
  /** Major changes in this version */
  changes?: string[];
  /** Migration guide URL */
  migrationGuide?: string;
}

export const VERSIONS: Record<string, VersionMetadata> = {
  v1: {
    released: '2024-01-01',
    deprecated: null,
    sunset: null,
    description: 'Initial API version with core functionality',
    changes: [
      'Basic authentication with JWT',
      'Project and session management',
      'Real-time collaboration via Socket.IO',
      'Recording storage and playback',
      'Stripe payment integration',
    ],
  },
  v2: {
    released: '2024-06-01',
    deprecated: null,
    sunset: null,
    description: 'Enhanced API with improved auth and features',
    changes: [
      'Enhanced authentication with refresh tokens',
      'Improved error handling and validation',
      'Team collaboration features',
      'Advanced recording analytics',
      'Webhook support for events',
    ],
    migrationGuide: '/docs/migrations/v1-to-v2',
  },
};

/**
 * Ordered list of versions (oldest to newest)
 */
export const VERSION_ORDER = ['v1', 'v2'] as const;

/**
 * Type for valid API versions
 */
export type ApiVersion = typeof VERSION_ORDER[number];

/**
 * Latest API version
 */
export const LATEST_VERSION: ApiVersion = VERSION_ORDER[VERSION_ORDER.length - 1];

/**
 * Default version when none specified
 */
export const DEFAULT_VERSION: ApiVersion = 'v1';

/**
 * Minimum supported version
 */
export const MINIMUM_SUPPORTED_VERSION: ApiVersion = 'v1';

/**
 * Check if a version string is valid
 */
export function isValidVersion(version: string): version is ApiVersion {
  return VERSION_ORDER.includes(version as ApiVersion);
}

/**
 * Get version metadata
 */
export function getVersionMetadata(version: ApiVersion): VersionMetadata {
  return VERSIONS[version];
}

/**
 * Check if a version is deprecated
 */
export function isVersionDeprecated(version: ApiVersion): boolean {
  const metadata = VERSIONS[version];
  if (!metadata.deprecated) return false;

  const deprecatedDate = new Date(metadata.deprecated);
  return deprecatedDate <= new Date();
}

/**
 * Check if a version is sunset (end of life)
 */
export function isVersionSunset(version: ApiVersion): boolean {
  const metadata = VERSIONS[version];
  if (!metadata.sunset) return false;

  const sunsetDate = new Date(metadata.sunset);
  return sunsetDate <= new Date();
}

/**
 * Get days until sunset
 */
export function getDaysUntilSunset(version: ApiVersion): number | null {
  const metadata = VERSIONS[version];
  if (!metadata.sunset) return null;

  const sunsetDate = new Date(metadata.sunset);
  const today = new Date();
  const diffTime = sunsetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Compare version numbers
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: ApiVersion, v2: ApiVersion): number {
  const index1 = VERSION_ORDER.indexOf(v1);
  const index2 = VERSION_ORDER.indexOf(v2);

  if (index1 < index2) return -1;
  if (index1 > index2) return 1;
  return 0;
}

/**
 * Check if client version meets minimum requirement
 */
export function meetsMinimumVersion(
  clientVersion: ApiVersion,
  requiredVersion: ApiVersion = MINIMUM_SUPPORTED_VERSION
): boolean {
  return compareVersions(clientVersion, requiredVersion) >= 0;
}
