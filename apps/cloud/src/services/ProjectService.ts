import { PrismaClient } from '@prisma/client';
import { WebhookService, WEBHOOK_EVENTS } from './WebhookService';

const prisma = new PrismaClient();

export interface CreateProjectData {
  name: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
  isActive?: boolean;
  isArchived?: boolean;
}

export class ProjectService {
  /**
   * Create a new project
   */
  static async createProject(userId: string, data: CreateProjectData) {
    const project = await prisma.project.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        settings: data.settings || {},
      },
      include: {
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    });

    // Trigger webhook event
    WebhookService.triggerEvent({
      eventType: WEBHOOK_EVENTS.PROJECT_CREATED,
      userId,
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        userId: project.userId,
        createdAt: project.createdAt,
      },
    }).catch((error) => {
      console.error('Failed to trigger project.created webhook:', error);
    });

    return project;
  }

  /**
   * Get all projects for a user (including team projects)
   */
  static async getProjects(
    userId: string,
    options: {
      includeArchived?: boolean;
      includeTeamProjects?: boolean;
      teamId?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { includeArchived = false, includeTeamProjects = true, teamId, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    // Get user's own projects
    const where: any = { userId };
    if (!includeArchived) {
      where.isArchived = false;
    }

    const [ownProjects, ownTotal] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: {
              sessions: true,
            },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    let allProjects = ownProjects;
    let total = ownTotal;

    // Get team projects if requested
    if (includeTeamProjects) {
      const teamMemberships = await prisma.teamMember.findMany({
        where: {
          userId,
          ...(teamId && { teamId }),
        },
        include: {
          team: {
            include: {
              projects: {
                include: {
                  project: {
                    include: {
                      _count: {
                        select: {
                          sessions: true,
                        },
                      },
                      user: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Flatten team projects
      const teamProjects = teamMemberships.flatMap(membership =>
        membership.team.projects
          .filter(tp => {
            // Filter based on access level
            if (tp.accessLevel === 'ALL_MEMBERS') return true;
            if (tp.accessLevel === 'ADMINS_ONLY') {
              return membership.role === 'OWNER' || membership.role === 'ADMIN';
            }
            return false;
          })
          .map(tp => ({
            ...tp.project,
            teamId: membership.teamId,
            teamName: membership.team.name,
            isTeamProject: true,
          }))
      );

      allProjects = [...ownProjects, ...teamProjects];
      total = ownTotal + teamProjects.length;
    }

    return {
      projects: allProjects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single project (with team access check)
   */
  static async getProject(projectId: string, userId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            _count: {
              select: {
                recordings: true,
              },
            },
          },
        },
        teamProjects: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Check if user has access (either owns it or is team member)
    const hasAccess = await this.checkProjectAccess(projectId, userId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return project;
  }

  /**
   * Check if user has access to a project
   */
  static async checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        teamProjects: {
          include: {
            team: {
              include: {
                members: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      return false;
    }

    // User owns the project
    if (project.userId === userId) {
      return true;
    }

    // Check team access
    for (const teamProject of project.teamProjects) {
      const membership = teamProject.team.members[0];
      if (membership) {
        // Check access level
        if (teamProject.accessLevel === 'ALL_MEMBERS') {
          return true;
        } else if (teamProject.accessLevel === 'ADMINS_ONLY') {
          if (membership.role === 'OWNER' || membership.role === 'ADMIN') {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Update a project
   */
  static async updateProject(projectId: string, userId: string, data: UpdateProjectData) {
    // First verify ownership
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!existingProject) {
      throw new Error('Project not found');
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    });

    return project;
  }

  /**
   * Delete a project
   */
  static async deleteProject(projectId: string, userId: string) {
    // First verify ownership
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!existingProject) {
      throw new Error('Project not found');
    }

    // This will cascade delete all sessions and recordings
    await prisma.project.delete({
      where: { id: projectId },
    });

    // Trigger webhook event
    WebhookService.triggerEvent({
      eventType: WEBHOOK_EVENTS.PROJECT_DELETED,
      userId,
      data: {
        id: projectId,
        name: existingProject.name,
        deletedAt: new Date().toISOString(),
      },
    }).catch((error) => {
      console.error('Failed to trigger project.deleted webhook:', error);
    });

    return { success: true };
  }

  /**
   * Archive a project
   */
  static async archiveProject(projectId: string, userId: string) {
    return this.updateProject(projectId, userId, {
      isArchived: true,
      isActive: false,
    });
  }

  /**
   * Unarchive a project
   */
  static async unarchiveProject(projectId: string, userId: string) {
    return this.updateProject(projectId, userId, {
      isArchived: false,
      isActive: true,
    });
  }

  /**
   * Get project statistics
   */
  static async getProjectStatistics(projectId: string, userId: string) {
    // Verify ownership
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const [
      sessionCount,
      recordingCount,
      activeSessions,
    ] = await Promise.all([
      prisma.session.count({
        where: { projectId },
      }),
      prisma.recording.count({
        where: {
          session: {
            projectId,
          },
        },
      }),
      prisma.session.count({
        where: {
          projectId,
          status: 'ACTIVE',
        },
      }),
    ]);

    // Get recent sessions
    const recentSessions = await prisma.session.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        _count: {
          select: {
            recordings: true,
          },
        },
      },
    });

    return {
      totalSessions: sessionCount,
      totalRecordings: recordingCount,
      activeSessions,
      recentSessions,
    };
  }
}

export default ProjectService;
