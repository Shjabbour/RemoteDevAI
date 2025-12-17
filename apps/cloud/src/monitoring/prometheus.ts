import { Router, Request, Response } from 'express';
import MetricsService from '../services/MetricsService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /metrics
 * Prometheus metrics endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Update business metrics before exporting
    await updateBusinessMetrics();

    // Export metrics in Prometheus format
    const metrics = MetricsService.exportPrometheusMetrics();

    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(metrics);
  } catch (error: any) {
    console.error('Error exporting Prometheus metrics:', error);
    res.status(500).send('# Error exporting metrics\n');
  }
});

/**
 * Update business metrics from database
 */
async function updateBusinessMetrics() {
  try {
    // Get current counts
    const [totalUsers, activeUsers, totalProjects, totalSessions, onlineAgents] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            lastSeenAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        }),
        prisma.project.count({
          where: { isActive: true },
        }),
        prisma.session.count({
          where: { status: 'ACTIVE' },
        }),
        prisma.desktopAgent.count({
          where: { status: 'ONLINE' },
        }),
      ]);

    // Update gauges
    MetricsService.setGauge('total_users', totalUsers);
    MetricsService.setGauge('active_users', activeUsers);
    MetricsService.setGauge('total_projects', totalProjects);
    MetricsService.setGauge('active_sessions', totalSessions);
    MetricsService.setGauge('active_agents', onlineAgents);

    // Get subscription counts by tier
    const subscriptionCounts = await prisma.user.groupBy({
      by: ['subscriptionTier'],
      _count: { id: true },
    });

    for (const tier of subscriptionCounts) {
      MetricsService.setGauge(
        'users_by_tier',
        tier._count.id,
        { tier: tier.subscriptionTier }
      );
    }

    // Get error counts from last 24 hours
    const recentErrors = await prisma.errorLog.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        resolved: false,
      },
    });

    MetricsService.setGauge('unresolved_errors', recentErrors);
  } catch (error) {
    console.error('Error updating business metrics:', error);
  }
}

export default router;
