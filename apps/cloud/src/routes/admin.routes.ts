import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { requireAdmin, requireSuperAdmin, logAdminAction } from '../middleware/admin.middleware';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// ==================
// DASHBOARD STATS
// ==================

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get total users
    const totalUsers = await prisma.user.count();

    // Get active users (logged in last 30 days)
    const activeUsers = await prisma.user.count({
      where: {
        lastSeenAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Get new users this month
    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      },
    });

    // Get subscription stats
    const subscriptions = await prisma.subscription.groupBy({
      by: ['tier', 'status'],
      _count: true,
    });

    // Calculate MRR and ARR (mock calculation - adjust based on actual pricing)
    const pricing = { FREE: 0, PRO: 29, ENTERPRISE: 99 };
    let mrr = 0;
    subscriptions.forEach((sub) => {
      if (sub.status === 'ACTIVE' || sub.status === 'TRIALING') {
        mrr += pricing[sub.tier as keyof typeof pricing] * sub._count;
      }
    });
    const arr = mrr * 12;

    // Get active agents
    const activeAgents = await prisma.desktopAgent.count({
      where: { status: 'ONLINE' },
    });

    // Get total projects
    const totalProjects = await prisma.project.count();

    // Get total sessions
    const totalSessions = await prisma.session.count();

    // Get error count (last 24 hours)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentErrors = await prisma.errorLog.count({
      where: {
        createdAt: { gte: oneDayAgo },
        severity: { in: ['ERROR', 'CRITICAL'] },
      },
    });

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          new: newUsers,
        },
        revenue: {
          mrr,
          arr,
        },
        agents: {
          active: activeAgents,
        },
        projects: {
          total: totalProjects,
        },
        sessions: {
          total: totalSessions,
        },
        system: {
          recentErrors,
          uptime: process.uptime(),
        },
      },
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================
// USER MANAGEMENT
// ==================

/**
 * GET /api/admin/users
 * Get all users with filters
 */
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      tier,
      role,
      status
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (tier) {
      where.subscriptionTier = tier;
    }

    if (role) {
      where.role = role;
    }

    if (status === 'banned') {
      where.isBanned = true;
    } else if (status === 'active') {
      where.isBanned = false;
    }

    // Get users
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          subscriptionTier: true,
          role: true,
          isBanned: true,
          createdAt: true,
          lastSeenAt: true,
          _count: {
            select: {
              projects: true,
              sessions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Get user details
 */
router.get('/users/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subscription: true,
        projects: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        desktopAgents: true,
        userStats: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User not found',
      });
      return;
    }

    // Get recent activity
    const recentActivity = await prisma.analyticsEvent.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      data: {
        user,
        recentActivity,
      },
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user details',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/admin/users/:id/ban
 * Ban/unban a user
 */
router.put('/users/:id/ban', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { banned, reason } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        isBanned: banned,
        bannedAt: banned ? new Date() : null,
        bannedReason: banned ? reason : null,
      },
    });

    await logAdminAction(
      req.user!.userId,
      banned ? 'user.banned' : 'user.unbanned',
      'user',
      id,
      { reason },
      req
    );

    res.json({
      success: true,
      data: user,
      message: banned ? 'User banned successfully' : 'User unbanned successfully',
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Update user role (super admin only)
 */
router.put('/users/:id/role', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Invalid role',
        message: 'Role must be USER, ADMIN, or SUPER_ADMIN',
      });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
    });

    await logAdminAction(
      req.user!.userId,
      'user.role_changed',
      'user',
      id,
      { newRole: role },
      req
    );

    res.json({
      success: true,
      data: user,
      message: 'User role updated successfully',
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user role',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user (super admin only)
 */
router.delete('/users/:id', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id },
    });

    await logAdminAction(
      req.user!.userId,
      'user.deleted',
      'user',
      id,
      {},
      req
    );

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/users/export
 * Export users to CSV
 */
router.get('/users/export', async (req: AuthRequest, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        subscriptionTier: true,
        role: true,
        isBanned: true,
        createdAt: true,
        lastSeenAt: true,
      },
    });

    // Convert to CSV
    const headers = ['ID', 'Email', 'Name', 'Tier', 'Role', 'Banned', 'Created', 'Last Seen'];
    const rows = users.map(u => [
      u.id,
      u.email,
      u.name || '',
      u.subscriptionTier,
      u.role,
      u.isBanned,
      u.createdAt.toISOString(),
      u.lastSeenAt.toISOString(),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export users',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================
// SUBSCRIPTIONS
// ==================

/**
 * GET /api/admin/subscriptions
 * Get all subscriptions
 */
router.get('/subscriptions', async (req: AuthRequest, res) => {
  try {
    const { status, tier } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (tier) where.tier = tier;

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate metrics
    const metrics = {
      total: subscriptions.length,
      active: subscriptions.filter(s => s.status === 'ACTIVE').length,
      trialing: subscriptions.filter(s => s.status === 'TRIALING').length,
      canceled: subscriptions.filter(s => s.status === 'CANCELED').length,
    };

    res.json({
      success: true,
      data: {
        subscriptions,
        metrics,
      },
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscriptions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/admin/subscriptions/:id
 * Update subscription (manual adjustment)
 */
router.put('/subscriptions/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { tier, status } = req.body;

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        ...(tier && { tier }),
        ...(status && { status }),
      },
    });

    await logAdminAction(
      req.user!.userId,
      'subscription.updated',
      'subscription',
      id,
      { tier, status },
      req
    );

    res.json({
      success: true,
      data: subscription,
      message: 'Subscription updated successfully',
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subscription',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================
// AGENTS
// ==================

/**
 * GET /api/admin/agents
 * Get all desktop agents
 */
router.get('/agents', async (req: AuthRequest, res) => {
  try {
    const agents = await prisma.desktopAgent.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { lastSeenAt: 'desc' },
    });

    const stats = {
      total: agents.length,
      online: agents.filter(a => a.status === 'ONLINE').length,
      offline: agents.filter(a => a.status === 'OFFLINE').length,
      busy: agents.filter(a => a.status === 'BUSY').length,
    };

    res.json({
      success: true,
      data: {
        agents,
        stats,
      },
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agents',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/admin/agents/:id/disconnect
 * Force disconnect an agent
 */
router.delete('/agents/:id/disconnect', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const agent = await prisma.desktopAgent.update({
      where: { id },
      data: {
        status: 'OFFLINE',
        socketId: null,
      },
    });

    await logAdminAction(
      req.user!.userId,
      'agent.force_disconnected',
      'agent',
      id,
      {},
      req
    );

    res.json({
      success: true,
      data: agent,
      message: 'Agent disconnected successfully',
    });
  } catch (error) {
    console.error('Disconnect agent error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect agent',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================
// LOGS
// ==================

/**
 * GET /api/admin/logs
 * Get system logs
 */
router.get('/logs', async (req: AuthRequest, res) => {
  try {
    const {
      type = 'error',
      severity,
      page = '1',
      limit = '50'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (severity) {
      where.severity = severity;
    }

    let logs;
    let total;

    if (type === 'error') {
      [logs, total] = await Promise.all([
        prisma.errorLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.errorLog.count({ where }),
      ]);
    } else {
      [logs, total] = await Promise.all([
        prisma.analyticsEvent.findMany({
          where: severity ? { category: severity as any } : {},
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.analyticsEvent.count({ where: severity ? { category: severity as any } : {} }),
      ]);
    }

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get logs',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================
// SYSTEM SETTINGS
// ==================

/**
 * GET /api/admin/settings
 * Get all system settings
 */
router.get('/settings', async (req: AuthRequest, res) => {
  try {
    const settings = await prisma.systemSettings.findMany({
      orderBy: { key: 'asc' },
    });

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get settings',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/admin/settings/:key
 * Update a system setting
 */
router.put('/settings/:key', requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });

    await logAdminAction(
      req.user!.userId,
      'setting.updated',
      'setting',
      key,
      { value },
      req
    );

    res.json({
      success: true,
      data: setting,
      message: 'Setting updated successfully',
    });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update setting',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================
// ANALYTICS
// ==================

/**
 * GET /api/admin/analytics/revenue
 * Get revenue analytics
 */
router.get('/analytics/revenue', async (req: AuthRequest, res) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const dailyStats = await prisma.dailyStats.findMany({
      where: {
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        revenue: true,
        newSubscriptions: true,
        canceledSubscriptions: true,
      },
    });

    res.json({
      success: true,
      data: dailyStats,
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get revenue analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/analytics/users
 * Get user analytics
 */
router.get('/analytics/users', async (req: AuthRequest, res) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    const dailyStats = await prisma.dailyStats.findMany({
      where: {
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        activeUsers: true,
        newUsers: true,
        totalLogins: true,
      },
    });

    res.json({
      success: true,
      data: dailyStats,
    });
  } catch (error) {
    console.error('Get user analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user analytics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
