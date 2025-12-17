import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import MetricsService from '../services/MetricsService';

const router = Router();
const prisma = new PrismaClient();

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: CheckResult;
    memory: CheckResult;
    disk?: CheckResult;
  };
  metrics?: {
    activeConnections: number;
    activeSessions: number;
    activeAgents: number;
  };
}

interface CheckResult {
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  value?: any;
  threshold?: any;
}

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  const health: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: await checkDatabase(),
      memory: checkMemory(),
    },
  };

  // Determine overall status
  const checks = Object.values(health.checks);
  if (checks.some((c) => c.status === 'fail')) {
    health.status = 'unhealthy';
  } else if (checks.some((c) => c.status === 'warn')) {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json({
    success: health.status !== 'unhealthy',
    data: health,
  });
});

/**
 * GET /health/live
 * Kubernetes liveness probe - checks if the app is running
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready
 * Kubernetes readiness probe - checks if the app is ready to serve traffic
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database connection
    const dbCheck = await checkDatabase();

    if (dbCheck.status === 'fail') {
      return res.status(503).json({
        success: false,
        status: 'not ready',
        message: 'Database connection failed',
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      status: 'not ready',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/detailed
 * Detailed health check with all metrics (admin only)
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const [dbCheck, memCheck, activeConnections, activeSessions, activeAgents] =
      await Promise.all([
        checkDatabase(),
        checkMemory(),
        getActiveConnections(),
        getActiveSessions(),
        getActiveAgents(),
      ]);

    const health: HealthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        database: dbCheck,
        memory: memCheck,
      },
      metrics: {
        activeConnections,
        activeSessions,
        activeAgents,
      },
    };

    // Determine overall status
    const checks = Object.values(health.checks);
    if (checks.some((c) => c.status === 'fail')) {
      health.status = 'unhealthy';
    } else if (checks.some((c) => c.status === 'warn')) {
      health.status = 'degraded';
    }

    const statusCode =
      health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status !== 'unhealthy',
      data: health,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message,
    });
  }
});

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<CheckResult> {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const duration = Date.now() - start;

    if (duration > 1000) {
      return {
        status: 'warn',
        message: 'Database connection slow',
        value: duration,
        threshold: 1000,
      };
    }

    return {
      status: 'pass',
      message: 'Database connected',
      value: duration,
    };
  } catch (error: any) {
    return {
      status: 'fail',
      message: `Database connection failed: ${error.message}`,
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): CheckResult {
  const usage = process.memoryUsage();
  const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;

  if (heapUsedPercent > 90) {
    return {
      status: 'fail',
      message: 'Memory usage critical',
      value: `${heapUsedPercent.toFixed(2)}%`,
      threshold: '90%',
    };
  }

  if (heapUsedPercent > 75) {
    return {
      status: 'warn',
      message: 'Memory usage high',
      value: `${heapUsedPercent.toFixed(2)}%`,
      threshold: '75%',
    };
  }

  return {
    status: 'pass',
    message: 'Memory usage normal',
    value: `${heapUsedPercent.toFixed(2)}%`,
  };
}

/**
 * Get active connections count
 */
async function getActiveConnections(): Promise<number> {
  // This would typically come from your socket.io or connection pool
  // For now, return a placeholder
  return 0;
}

/**
 * Get active sessions count
 */
async function getActiveSessions(): Promise<number> {
  try {
    const count = await prisma.session.count({
      where: {
        status: 'ACTIVE',
      },
    });
    return count;
  } catch (error) {
    return 0;
  }
}

/**
 * Get active agents count
 */
async function getActiveAgents(): Promise<number> {
  try {
    const count = await prisma.desktopAgent.count({
      where: {
        status: 'ONLINE',
      },
    });
    return count;
  } catch (error) {
    return 0;
  }
}

export default router;
