import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth.middleware';

const prisma = new PrismaClient();

/**
 * Middleware to check if user is an admin
 */
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please authenticate first',
      });
      return;
    }

    // Get user from database to check role
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, isBanned: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User account not found',
      });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({
        success: false,
        error: 'Account banned',
        message: 'Your account has been banned',
      });
      return;
    }

    // Check if user has admin role
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'Admin access required',
      });
      return;
    }

    // Attach role to request for further use
    req.user.role = user.role;

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Middleware to check if user is a super admin
 */
export const requireSuperAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Please authenticate first',
      });
      return;
    }

    // Get user from database to check role
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, isBanned: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User account not found',
      });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({
        success: false,
        error: 'Account banned',
        message: 'Your account has been banned',
      });
      return;
    }

    // Check if user has super admin role
    if (user.role !== 'SUPER_ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: 'Super admin access required',
      });
      return;
    }

    // Attach role to request for further use
    req.user.role = user.role;

    next();
  } catch (error) {
    console.error('Super admin middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authorization check failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Log admin action to database
 */
export const logAdminAction = async (
  userId: string,
  action: string,
  resource?: string,
  resourceId?: string,
  metadata?: any,
  req?: Request
): Promise<void> => {
  try {
    await prisma.analyticsEvent.create({
      data: {
        eventType: 'admin_action',
        eventName: action,
        category: 'SYSTEM',
        userId,
        metadata: {
          resource,
          resourceId,
          ...metadata,
        },
        ipAddress: req?.ip,
        userAgent: req?.get('user-agent'),
      },
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw error, just log it
  }
};

export default requireAdmin;
