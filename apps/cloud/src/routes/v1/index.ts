/**
 * API v1 Routes
 *
 * Initial version with core functionality
 */

import { Router } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import projectsRoutes from './projects.routes';
import sessionsRoutes from './sessions.routes';
import recordingsRoutes from './recordings.routes';
import paymentsRoutes from './payments.routes';
import webhooksRoutes from './webhooks.routes';
import relayRoutes from './relay.routes';
import { apiLimiter } from '../../middleware/rateLimit.middleware';

const router = Router();

// Mount all v1 routes
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/projects', apiLimiter, projectsRoutes);
router.use('/sessions', apiLimiter, sessionsRoutes);
router.use('/recordings', apiLimiter, recordingsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/relay', apiLimiter, relayRoutes);

export default router;
