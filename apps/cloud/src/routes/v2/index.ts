/**
 * API v2 Routes
 *
 * Enhanced version with:
 * - Improved authentication
 * - Better error handling
 * - Enhanced response structures
 * - Additional endpoints
 * - Comprehensive audit logging
 */

import { Router } from 'express';
import authRoutes from './auth.routes';
// Import v1 routes for endpoints that haven't changed
import usersRoutes from '../v1/users.routes';
import projectsRoutes from '../v1/projects.routes';
import sessionsRoutes from '../v1/sessions.routes';
import recordingsRoutes from '../v1/recordings.routes';
import paymentsRoutes from '../v1/payments.routes';
import webhooksRoutes from '../v1/webhooks.routes';
import relayRoutes from '../v1/relay.routes';
import auditRoutes from '../audit.routes';
import exportRoutes from '../export.routes';
import importRoutes from '../import.routes';
import usageRoutes from '../usage.routes';
import { apiLimiter } from '../../middleware/rateLimit.middleware';
import { captureAuditContext, detectSuspiciousActivity } from '../../middleware/audit.middleware';
import { addRateLimitHeaders } from '../../middleware/usageLimit.middleware';

const router = Router();

// Apply audit middleware to all routes
router.use(captureAuditContext);
router.use(detectSuspiciousActivity);

// Apply rate limit headers to all routes
router.use(addRateLimitHeaders);

// Mount v2 routes (only auth is different in v2)
router.use('/auth', authRoutes);

// Use v1 routes for endpoints that haven't changed
router.use('/users', usersRoutes);
router.use('/projects', apiLimiter, projectsRoutes);
router.use('/sessions', apiLimiter, sessionsRoutes);
router.use('/recordings', apiLimiter, recordingsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/relay', apiLimiter, relayRoutes);

// Audit routes
router.use('/audit', auditRoutes);

// Usage routes
router.use('/usage', usageRoutes);
n// Export & Import routes
router.use('/export', apiLimiter, exportRoutes);
router.use('/import', apiLimiter, importRoutes);

export default router;
