/**
 * API Compatibility Checker
 *
 * Validates client version compatibility and enforces version requirements
 */

import { Request, Response, NextFunction } from 'express';
import {
  ApiVersion,
  MINIMUM_SUPPORTED_VERSION,
  LATEST_VERSION,
  isValidVersion,
  isVersionSunset,
  compareVersions,
  meetsMinimumVersion,
  getVersionMetadata,
} from './versions';

/**
 * Client version information
 */
export interface ClientVersionInfo {
  /** Client API version */
  version: ApiVersion;
  /** Client SDK version (optional) */
  sdkVersion?: string;
  /** Client application name */
  clientName?: string;
  /** Client application version */
  clientVersion?: string;
}

/**
 * Compatibility check result
 */
export interface CompatibilityResult {
  /** Whether the client version is compatible */
  compatible: boolean;
  /** Warning messages (non-blocking) */
  warnings: string[];
  /** Error messages (blocking) */
  errors: string[];
  /** Recommended actions */
  recommendations: string[];
  /** Minimum required version */
  minimumVersion: ApiVersion;
  /** Latest available version */
  latestVersion: ApiVersion;
  /** Whether upgrade is required */
  upgradeRequired: boolean;
  /** Whether upgrade is recommended */
  upgradeRecommended: boolean;
}

/**
 * Extract client version info from request
 */
export function extractClientVersionInfo(req: Request): ClientVersionInfo {
  return {
    version: req.apiVersion,
    sdkVersion: req.get('X-SDK-Version'),
    clientName: req.get('X-Client-Name'),
    clientVersion: req.get('X-Client-Version'),
  };
}

/**
 * Check client version compatibility
 */
export function checkCompatibility(
  clientInfo: ClientVersionInfo
): CompatibilityResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const recommendations: string[] = [];

  // Check if version is valid
  if (!isValidVersion(clientInfo.version)) {
    errors.push(`Invalid API version: ${clientInfo.version}`);
    return {
      compatible: false,
      warnings,
      errors,
      recommendations: ['Use a valid API version (v1, v2)'],
      minimumVersion: MINIMUM_SUPPORTED_VERSION,
      latestVersion: LATEST_VERSION,
      upgradeRequired: true,
      upgradeRecommended: true,
    };
  }

  // Check if version is sunset (end of life)
  if (isVersionSunset(clientInfo.version)) {
    errors.push(
      `API version ${clientInfo.version} has reached end-of-life and is no longer supported`
    );
    errors.push(`Please upgrade to ${LATEST_VERSION} immediately`);

    return {
      compatible: false,
      warnings,
      errors,
      recommendations: [
        `Upgrade to ${LATEST_VERSION}`,
        'Review migration guide for breaking changes',
      ],
      minimumVersion: MINIMUM_SUPPORTED_VERSION,
      latestVersion: LATEST_VERSION,
      upgradeRequired: true,
      upgradeRecommended: true,
    };
  }

  // Check if version meets minimum requirement
  if (!meetsMinimumVersion(clientInfo.version)) {
    errors.push(
      `API version ${clientInfo.version} is below minimum supported version ${MINIMUM_SUPPORTED_VERSION}`
    );

    return {
      compatible: false,
      warnings,
      errors,
      recommendations: [
        `Upgrade to at least ${MINIMUM_SUPPORTED_VERSION}`,
        `Latest version is ${LATEST_VERSION}`,
      ],
      minimumVersion: MINIMUM_SUPPORTED_VERSION,
      latestVersion: LATEST_VERSION,
      upgradeRequired: true,
      upgradeRecommended: true,
    };
  }

  // Check if version is deprecated
  const metadata = getVersionMetadata(clientInfo.version);
  if (metadata.deprecated) {
    const deprecatedDate = new Date(metadata.deprecated);
    if (deprecatedDate <= new Date()) {
      warnings.push(
        `API version ${clientInfo.version} is deprecated since ${metadata.deprecated}`
      );

      if (metadata.sunset) {
        warnings.push(`This version will be sunset on ${metadata.sunset}`);

        // Check if sunset is soon (within 30 days)
        const sunsetDate = new Date(metadata.sunset);
        const daysUntilSunset = Math.ceil(
          (sunsetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilSunset <= 30 && daysUntilSunset > 0) {
          warnings.push(
            `URGENT: Only ${daysUntilSunset} days until sunset!`
          );
          recommendations.push('Upgrade immediately to avoid service disruption');
        }
      }

      recommendations.push(`Upgrade to ${LATEST_VERSION}`);

      if (metadata.migrationGuide) {
        recommendations.push(`Review migration guide: ${metadata.migrationGuide}`);
      }
    }
  }

  // Check if using latest version
  const upgradeRecommended = compareVersions(clientInfo.version, LATEST_VERSION) < 0;
  if (upgradeRecommended) {
    recommendations.push(
      `Consider upgrading to ${LATEST_VERSION} for the latest features and improvements`
    );
  }

  return {
    compatible: errors.length === 0,
    warnings,
    errors,
    recommendations,
    minimumVersion: MINIMUM_SUPPORTED_VERSION,
    latestVersion: LATEST_VERSION,
    upgradeRequired: errors.length > 0,
    upgradeRecommended,
  };
}

/**
 * Middleware to check client compatibility
 */
export function compatibilityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const clientInfo = extractClientVersionInfo(req);
  const compatibility = checkCompatibility(clientInfo);

  // Add compatibility headers
  res.setHeader('X-API-Compatible', compatibility.compatible.toString());
  res.setHeader('X-API-Minimum-Version', compatibility.minimumVersion);
  res.setHeader('X-API-Latest-Version', compatibility.latestVersion);

  if (compatibility.upgradeRequired) {
    res.setHeader('X-API-Upgrade-Required', 'true');
  }

  if (compatibility.upgradeRecommended) {
    res.setHeader('X-API-Upgrade-Recommended', 'true');
  }

  // Block incompatible clients
  if (!compatibility.compatible) {
    res.status(426).json({
      success: false,
      error: 'Incompatible API version',
      message: 'Your API version is not supported',
      compatibility: {
        currentVersion: clientInfo.version,
        minimumVersion: compatibility.minimumVersion,
        latestVersion: compatibility.latestVersion,
        errors: compatibility.errors,
        recommendations: compatibility.recommendations,
      },
    });
    return;
  }

  // Log warnings for deprecated versions
  if (compatibility.warnings.length > 0) {
    console.warn('[Compatibility Warning]', {
      client: clientInfo,
      warnings: compatibility.warnings,
      recommendations: compatibility.recommendations,
    });
  }

  // Attach compatibility info to request
  (req as any).compatibility = compatibility;

  next();
}

/**
 * Middleware to add compatibility warnings to responses
 */
export function addCompatibilityWarnings(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const compatibility = (req as any).compatibility as CompatibilityResult;

  if (!compatibility || compatibility.warnings.length === 0) {
    next();
    return;
  }

  // Override json method to add warnings
  const originalJson = res.json.bind(res);
  res.json = function (body: any): Response {
    if (typeof body === 'object' && body !== null) {
      body._compatibility = {
        warnings: compatibility.warnings,
        recommendations: compatibility.recommendations,
        currentVersion: req.apiVersion,
        latestVersion: compatibility.latestVersion,
        upgradeRecommended: compatibility.upgradeRecommended,
      };
    }
    return originalJson(body);
  };

  next();
}

/**
 * Check if client SDK is compatible
 */
export function checkSDKCompatibility(
  sdkVersion: string,
  minimumSdkVersion: string
): boolean {
  // Simple semver comparison (major.minor.patch)
  const parseVersion = (v: string): number[] => {
    return v.split('.').map((n) => parseInt(n, 10) || 0);
  };

  const client = parseVersion(sdkVersion);
  const minimum = parseVersion(minimumSdkVersion);

  for (let i = 0; i < 3; i++) {
    if (client[i] > minimum[i]) return true;
    if (client[i] < minimum[i]) return false;
  }

  return true; // Equal versions are compatible
}

/**
 * Middleware to enforce minimum SDK version
 */
export function enforceMinSDKVersion(minVersion: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const sdkVersion = req.get('X-SDK-Version');

    if (!sdkVersion) {
      // No SDK version provided, allow but warn
      console.warn('[SDK] No SDK version provided');
      next();
      return;
    }

    if (!checkSDKCompatibility(sdkVersion, minVersion)) {
      res.status(426).json({
        success: false,
        error: 'Incompatible SDK version',
        message: `SDK version ${sdkVersion} is below minimum required version ${minVersion}`,
        currentVersion: sdkVersion,
        minimumVersion: minVersion,
        upgradeRequired: true,
      });
      return;
    }

    next();
  };
}

/**
 * Generate compatibility report for monitoring
 */
export function generateCompatibilityReport(
  req: Request
): Record<string, any> {
  const clientInfo = extractClientVersionInfo(req);
  const compatibility = checkCompatibility(clientInfo);

  return {
    timestamp: new Date().toISOString(),
    client: clientInfo,
    compatibility: {
      compatible: compatibility.compatible,
      warningCount: compatibility.warnings.length,
      errorCount: compatibility.errors.length,
      upgradeRequired: compatibility.upgradeRequired,
      upgradeRecommended: compatibility.upgradeRecommended,
    },
    endpoint: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
  };
}

/**
 * Log compatibility metrics (for analytics)
 */
export function logCompatibilityMetrics(req: Request): void {
  const report = generateCompatibilityReport(req);

  // In production, send to analytics service
  if (process.env.NODE_ENV === 'development') {
    console.log('[Compatibility Metrics]', report);
  }

  // TODO: Send to analytics service
  // analytics.track('api_compatibility', report);
}
