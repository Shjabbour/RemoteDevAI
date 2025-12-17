import { Request, Response, NextFunction } from 'express';
import { PrismaClient, TeamRole } from '@prisma/client';
import { AuthRequest } from './auth.middleware';

const prisma = new PrismaClient();

export interface TeamAuthRequest extends AuthRequest {
  team?: {
    id: string;
    role: TeamRole;
  };
}

/**
 * Middleware to verify team membership
 */
export const requireTeamMembership = async (
  req: TeamAuthRequest,
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

    const teamId = req.params.id || req.params.teamId;

    if (!teamId) {
      res.status(400).json({
        success: false,
        error: 'Missing team ID',
        message: 'Team ID is required',
      });
      return;
    }

    // Check if user is a member of the team
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: req.user.userId,
      },
    });

    if (!membership) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You are not a member of this team',
      });
      return;
    }

    // Attach team info to request
    req.team = {
      id: teamId,
      role: membership.role,
    };

    next();
  } catch (error) {
    console.error('Team membership check error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to verify team membership',
    });
  }
};

/**
 * Middleware to require specific team role(s)
 */
export const requireTeamRole = (...allowedRoles: TeamRole[]) => {
  return async (req: TeamAuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Please authenticate first',
        });
        return;
      }

      const teamId = req.params.id || req.params.teamId;

      if (!teamId) {
        res.status(400).json({
          success: false,
          error: 'Missing team ID',
          message: 'Team ID is required',
        });
        return;
      }

      // Check if user is a member of the team
      const membership = await prisma.teamMember.findFirst({
        where: {
          teamId,
          userId: req.user.userId,
        },
      });

      if (!membership) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You are not a member of this team',
        });
        return;
      }

      // Check if user has required role
      if (!allowedRoles.includes(membership.role)) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `This action requires ${allowedRoles.join(' or ')} role`,
        });
        return;
      }

      // Attach team info to request
      req.team = {
        id: teamId,
        role: membership.role,
      };

      next();
    } catch (error) {
      console.error('Team role check error:', error);
      res.status(500).json({
        success: false,
        error: 'Server error',
        message: 'Failed to verify team role',
      });
    }
  };
};

/**
 * Middleware to check project team ownership
 * Verifies that a project belongs to the team or the user has access through team
 */
export const checkProjectTeamAccess = async (
  req: TeamAuthRequest,
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

    const projectId = req.params.projectId || req.params.id;
    const teamId = req.params.teamId;

    if (!projectId) {
      res.status(400).json({
        success: false,
        error: 'Missing project ID',
        message: 'Project ID is required',
      });
      return;
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        teamProjects: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!project) {
      res.status(404).json({
        success: false,
        error: 'Project not found',
        message: 'The requested project does not exist',
      });
      return;
    }

    // Check if user owns the project directly
    if (project.userId === req.user.userId) {
      next();
      return;
    }

    // Check if project is part of a team the user belongs to
    let hasAccess = false;
    for (const teamProject of project.teamProjects) {
      // If specific team is required, check only that team
      if (teamId && teamProject.teamId !== teamId) {
        continue;
      }

      // Check if user is a member of this team
      const membership = await prisma.teamMember.findFirst({
        where: {
          teamId: teamProject.teamId,
          userId: req.user.userId,
        },
      });

      if (membership) {
        // Check access level
        if (teamProject.accessLevel === 'ALL_MEMBERS') {
          hasAccess = true;
          req.team = {
            id: teamProject.teamId,
            role: membership.role,
          };
          break;
        } else if (teamProject.accessLevel === 'ADMINS_ONLY') {
          if (membership.role === TeamRole.OWNER || membership.role === TeamRole.ADMIN) {
            hasAccess = true;
            req.team = {
              id: teamProject.teamId,
              role: membership.role,
            };
            break;
          }
        }
      }
    }

    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this project',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Project team access check error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to verify project access',
    });
  }
};

/**
 * Middleware to require team owner role
 */
export const requireTeamOwner = requireTeamRole(TeamRole.OWNER);

/**
 * Middleware to require team admin or owner role
 */
export const requireTeamAdmin = requireTeamRole(TeamRole.OWNER, TeamRole.ADMIN);

export default {
  requireTeamMembership,
  requireTeamRole,
  requireTeamOwner,
  requireTeamAdmin,
  checkProjectTeamAccess,
};
