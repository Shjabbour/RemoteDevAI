import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface UpdateUserData {
  name?: string;
  avatarUrl?: string;
}

export class UserService {
  /**
   * Get user profile
   */
  static async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        _count: {
          select: {
            projects: true,
            sessions: true,
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        subscriptionTier: true,
        createdAt: true,
        updatedAt: true,
        lastSeenAt: true,
        subscription: true,
        _count: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, data: UpdateUserData) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        subscriptionTier: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Delete user account
   */
  static async deleteAccount(userId: string) {
    // This will cascade delete all related data due to Prisma schema
    await prisma.user.delete({
      where: { id: userId },
    });

    return { success: true };
  }

  /**
   * Get user statistics
   */
  static async getStatistics(userId: string) {
    const [
      projectCount,
      sessionCount,
      recordingCount,
      activeAgents,
    ] = await Promise.all([
      prisma.project.count({
        where: { userId, isActive: true },
      }),
      prisma.session.count({
        where: { userId },
      }),
      prisma.recording.count({
        where: {
          session: {
            userId,
          },
        },
      }),
      prisma.desktopAgent.count({
        where: { userId, status: 'ONLINE' },
      }),
    ]);

    // Get recent sessions
    const recentSessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            recordings: true,
          },
        },
      },
    });

    // Get storage usage (sum of all recording file sizes)
    const storageUsage = await prisma.recording.aggregate({
      where: {
        session: {
          userId,
        },
      },
      _sum: {
        fileSize: true,
      },
    });

    return {
      projects: projectCount,
      sessions: sessionCount,
      recordings: recordingCount,
      activeAgents,
      storageUsed: storageUsage._sum.fileSize || 0,
      recentSessions,
    };
  }

  /**
   * Update user's last seen timestamp
   */
  static async updateLastSeen(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  }

  /**
   * Get all users (admin only)
   */
  static async getAllUsers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: true,
          _count: {
            select: {
              projects: true,
              sessions: true,
            },
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          subscriptionTier: true,
          createdAt: true,
          lastSeenAt: true,
          subscription: true,
          _count: true,
        },
      }),
      prisma.user.count(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export default UserService;
