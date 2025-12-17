/**
 * Sentry Instrumentation
 *
 * This file must be imported FIRST in your application, before any other imports.
 * It initializes Sentry and sets up error tracking and performance monitoring.
 *
 * Usage in server.ts:
 * import './instrument'; // Must be first!
 * import express from 'express';
 * ...rest of imports
 */

import { initializeSentry } from './config/sentry';

// Initialize Sentry
initializeSentry();

// Export Sentry instance for use in other modules
export * from './config/sentry';
