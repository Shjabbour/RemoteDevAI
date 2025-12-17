/**
 * API Version Middleware
 *
 * Extracts version from URL or headers and attaches to request context
 */

import { Request, Response, NextFunction } from 'express';
import {
  detectVersion,
  validateVersion,
  ApiVersion,
  LATEST_VERSION,
  getVersionMetadata,
  getDaysUntilSunset,
} from '../versioning';

// Extend Express Request type to include version info
declare global {
  namespace Express {
    interface Request {
      apiVersion: ApiVersion;
      versionInfo: {
        source: 'url' | 'header' | 'default';
        isDeprecated: boolean;
        isSunset: boolean;
        isLatest: boolean;
      };
    }
  }
}

/**
 * Version extraction and validation middleware
 *
 * Detects API version from:
 * 1. URL path (/api/v1/...)
 * 2. Accept-Version header
 * 3. Default version
 *
 * Attaches version info to request object
 * Adds version headers to response
 */
export function versionMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Detect version from request
    const detection = detectVersion(req);

    // Validate version
    const validation = validateVersion(detection.version);

    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: 'Invalid API version',
        message: validation.error,
        currentVersion: detection.version,
        latestVersion: LATEST_VERSION,
      });
      return;
    }

    // Attach to request
    req.apiVersion = detection.version;
    req.versionInfo = {
      source: detection.source,
      isDeprecated: detection.isDeprecated,
      isSunset: detection.isSunset,
      isLatest: detection.isLatest,
    };

    // Add version headers to response
    res.setHeader('X-API-Version', detection.version);
    res.setHeader('X-API-Latest-Version', LATEST_VERSION);

    // Add deprecation headers if applicable
    if (detection.isDeprecated) {
      const metadata = getVersionMetadata(detection.version);

      res.setHeader('X-API-Deprecated', 'true');
      res.setHeader('Deprecation', metadata.deprecated!);

      if (metadata.sunset) {
        res.setHeader('Sunset', metadata.sunset);

        const daysUntilSunset = getDaysUntilSunset(detection.version);
        if (daysUntilSunset !== null) {
          res.setHeader('X-API-Sunset-Days', daysUntilSunset.toString());
        }
      }

      // Add migration guide link if available
      if (metadata.migrationGuide) {
        res.setHeader('X-API-Migration-Guide', metadata.migrationGuide);
      }
    }

    next();
  } catch (error) {
    console.error('Version middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Version detection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Middleware to enforce minimum API version
 *
 * Usage: enforceMinVersion('v2') - requires v2 or higher
 */
export function enforceMinVersion(minVersion: ApiVersion) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const validation = validateVersion(req.apiVersion);

    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: 'Unsupported API version',
        message: validation.error,
        minimumVersion: minVersion,
        currentVersion: req.apiVersion,
      });
      return;
    }

    // Parse version numbers for comparison
    const currentVersionNum = parseInt(req.apiVersion.replace('v', ''));
    const minVersionNum = parseInt(minVersion.replace('v', ''));

    if (currentVersionNum < minVersionNum) {
      res.status(400).json({
        success: false,
        error: 'API version too old',
        message: `This endpoint requires API version ${minVersion} or higher. You are using ${req.apiVersion}.`,
        minimumVersion: minVersion,
        currentVersion: req.apiVersion,
        latestVersion: LATEST_VERSION,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to add deprecation warnings to response
 */
export function addDeprecationWarnings(req: Request, res: Response, next: NextFunction): void {
  if (!req.versionInfo.isDeprecated) {
    next();
    return;
  }

  const metadata = getVersionMetadata(req.apiVersion);

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override json method to add deprecation warning
  res.json = function (body: any): Response {
    // Add deprecation warning to response body
    if (typeof body === 'object' && body !== null) {
      body._deprecation = {
        deprecated: true,
        version: req.apiVersion,
        message: `API version ${req.apiVersion} is deprecated. Please upgrade to ${LATEST_VERSION}.`,
        deprecatedSince: metadata.deprecated,
        sunsetDate: metadata.sunset,
        migrationGuide: metadata.migrationGuide,
      };
    }

    return originalJson(body);
  };

  next();
}

/**
 * Middleware to log version usage for analytics
 */
export function logVersionUsage(req: Request, res: Response, next: NextFunction): void {
  const logData = {
    version: req.apiVersion,
    source: req.versionInfo.source,
    path: req.path,
    method: req.method,
    isDeprecated: req.versionInfo.isDeprecated,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
  };

  // Log to console (in production, send to analytics service)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Version Usage]', logData);
  }

  // TODO: Send to analytics service in production
  // analytics.track('api_version_usage', logData);

  next();
}

/**
 * Combined version middleware with all features
 */
export function versionMiddlewareStack() {
  return [
    versionMiddleware,
    addDeprecationWarnings,
    logVersionUsage,
  ];
}
