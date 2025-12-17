import { PrismaClient, TeamRole, InvitationStatus, TeamProjectAccess } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface CreateTeamData {
  name: string;
  slug: string;
  description?: string;
  avatarUrl?: string;
}

export interface UpdateTeamData {
  name?: string;
  slug?: string;
  description?: string;
  avatarUrl?: string;
}

export interface InviteMemberData {
  email: string;
  role: TeamRole;
}

export class TeamService {
  /**
   * Create a new team
   */
  static async createTeam(ownerId: string, data: CreateTeamData) {
    // Check if slug is already taken
    const existing = await prisma.team.findUnique({
      where: { slug: data.slug },
    });

    if (existing) {
      throw new Error('Team slug is already taken');
    }

    const team = await prisma.team.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        avatarUrl: data.avatarUrl,
        ownerId,
        // Automatically add owner as a member with OWNER role
        members: {
          create: {
            userId: ownerId,
            role: TeamRole.OWNER,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    });

    // Log activity
    await this.logActivity(team.id, ownerId, 'team_created', 'team', team.id, {
      teamName: team.name,
    });

    return team;
  }

  /**
   * Get team by ID
   */
  static async getTeam(teamId: string, userId: string) {
    // Check if user is a member
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
      },
    });

    if (!membership) {
      throw new Error('Not a member of this team');
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
                lastSeenAt: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        _count: {
          select: {
            members: true,
            projects: true,
            invitations: true,
          },
        },
      },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    return { team, membership };
  }

  /**
   * Get all teams for a user
   */
  static async getUserTeams(userId: string) {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            owner: {
              select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: {
                members: true,
                projects: true,
              },
            },
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    return memberships.map(m => ({
      ...m.team,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  /**
   * Update team
   */
  static async updateTeam(teamId: string, userId: string, data: UpdateTeamData) {
    // Check if user has permission (must be OWNER or ADMIN)
    await this.requireRole(teamId, userId, [TeamRole.OWNER, TeamRole.ADMIN]);

    // If slug is being updated, check if it's available
    if (data.slug) {
      const existing = await prisma.team.findFirst({
        where: {
          slug: data.slug,
          NOT: { id: teamId },
        },
      });

      if (existing) {
        throw new Error('Team slug is already taken');
      }
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    });

    // Log activity
    await this.logActivity(teamId, userId, 'team_updated', 'team', teamId, {
      changes: data,
    });

    return team;
  }

  /**
   * Delete team
   */
  static async deleteTeam(teamId: string, userId: string) {
    // Only owner can delete team
    await this.requireRole(teamId, userId, [TeamRole.OWNER]);

    await prisma.team.delete({
      where: { id: teamId },
    });

    return { success: true };
  }

  /**
   * Invite member to team
   */
  static async inviteMember(teamId: string, userId: string, data: InviteMemberData) {
    // Check if user has permission (must be OWNER or ADMIN)
    await this.requireRole(teamId, userId, [TeamRole.OWNER, TeamRole.ADMIN]);

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        user: {
          email: data.email,
        },
      },
    });

    if (existingMember) {
      throw new Error('User is already a member of this team');
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        teamId,
        email: data.email,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new Error('Invitation already sent to this email');
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Create invitation
    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        email: data.email,
        role: data.role,
        token,
        invitedBy: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Log activity
    await this.logActivity(teamId, userId, 'member_invited', 'invitation', invitation.id, {
      email: data.email,
      role: data.role,
    });

    // TODO: Send email notification
    // await NotificationService.sendTeamInvitation(invitation);

    return invitation;
  }

  /**
   * Accept team invitation
   */
  static async acceptInvitation(token: string, userId: string) {
    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
      include: {
        team: true,
      },
    });

    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new Error('Invitation is no longer valid');
    }

    if (new Date() > invitation.expiresAt) {
      // Mark as expired
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new Error('Invitation has expired');
    }

    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user || user.email !== invitation.email) {
      throw new Error('Invitation email does not match your account');
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId: invitation.teamId,
        userId,
      },
    });

    if (existingMember) {
      throw new Error('You are already a member of this team');
    }

    // Add user as team member
    const member = await prisma.teamMember.create({
      data: {
        teamId: invitation.teamId,
        userId,
        role: invitation.role,
        invitedBy: invitation.invitedBy,
      },
      include: {
        team: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Mark invitation as accepted
    await prisma.teamInvitation.update({
      where: { id: invitation.id },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });

    // Log activity
    await this.logActivity(invitation.teamId, userId, 'member_joined', 'member', member.id, {
      email: user.email,
      role: invitation.role,
    });

    return { team: invitation.team, member };
  }

  /**
   * Revoke team invitation
   */
  static async revokeInvitation(invitationId: string, teamId: string, userId: string) {
    // Check if user has permission
    await this.requireRole(teamId, userId, [TeamRole.OWNER, TeamRole.ADMIN]);

    const invitation = await prisma.teamInvitation.update({
      where: { id: invitationId },
      data: {
        status: InvitationStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    // Log activity
    await this.logActivity(teamId, userId, 'invitation_revoked', 'invitation', invitationId, {
      email: invitation.email,
    });

    return invitation;
  }

  /**
   * Get team invitations
   */
  static async getTeamInvitations(teamId: string, userId: string) {
    // Check if user has permission
    await this.requireRole(teamId, userId, [TeamRole.OWNER, TeamRole.ADMIN]);

    const invitations = await prisma.teamInvitation.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
    });

    return invitations;
  }

  /**
   * Remove team member
   */
  static async removeMember(teamId: string, userId: string, targetUserId: string) {
    // Check if user has permission
    const userMembership = await this.requireRole(teamId, userId, [TeamRole.OWNER, TeamRole.ADMIN]);

    // Get target member
    const targetMembership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: targetUserId,
      },
    });

    if (!targetMembership) {
      throw new Error('User is not a member of this team');
    }

    // Can't remove owner
    if (targetMembership.role === TeamRole.OWNER) {
      throw new Error('Cannot remove team owner');
    }

    // Admins can't remove other admins, only owner can
    if (targetMembership.role === TeamRole.ADMIN && userMembership.role !== TeamRole.OWNER) {
      throw new Error('Only team owner can remove admins');
    }

    await prisma.teamMember.delete({
      where: { id: targetMembership.id },
    });

    // Log activity
    await this.logActivity(teamId, userId, 'member_removed', 'member', targetMembership.id, {
      targetUserId,
      role: targetMembership.role,
    });

    return { success: true };
  }

  /**
   * Update member role
   */
  static async updateMemberRole(teamId: string, userId: string, targetUserId: string, newRole: TeamRole) {
    // Only owner can change roles
    await this.requireRole(teamId, userId, [TeamRole.OWNER]);

    // Can't change owner role
    const targetMembership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: targetUserId,
      },
    });

    if (!targetMembership) {
      throw new Error('User is not a member of this team');
    }

    if (targetMembership.role === TeamRole.OWNER) {
      throw new Error('Cannot change owner role');
    }

    // Can't set role to OWNER
    if (newRole === TeamRole.OWNER) {
      throw new Error('Cannot assign owner role to another member');
    }

    const updated = await prisma.teamMember.update({
      where: { id: targetMembership.id },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Log activity
    await this.logActivity(teamId, userId, 'role_changed', 'member', targetMembership.id, {
      targetUserId,
      oldRole: targetMembership.role,
      newRole,
    });

    return updated;
  }

  /**
   * Add project to team
   */
  static async addProjectToTeam(
    teamId: string,
    userId: string,
    projectId: string,
    accessLevel: TeamProjectAccess = TeamProjectAccess.ALL_MEMBERS
  ) {
    // Check if user has permission
    await this.requireRole(teamId, userId, [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.MEMBER]);

    // Check if project exists and belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
      },
    });

    if (!project) {
      throw new Error('Project not found or you do not have access');
    }

    // Check if project is already in team
    const existingTeamProject = await prisma.teamProject.findFirst({
      where: {
        teamId,
        projectId,
      },
    });

    if (existingTeamProject) {
      throw new Error('Project is already part of this team');
    }

    const teamProject = await prisma.teamProject.create({
      data: {
        teamId,
        projectId,
        accessLevel,
      },
      include: {
        project: true,
      },
    });

    // Log activity
    await this.logActivity(teamId, userId, 'project_added', 'project', projectId, {
      projectName: project.name,
      accessLevel,
    });

    return teamProject;
  }

  /**
   * Remove project from team
   */
  static async removeProjectFromTeam(teamId: string, userId: string, projectId: string) {
    // Check if user has permission
    await this.requireRole(teamId, userId, [TeamRole.OWNER, TeamRole.ADMIN]);

    const teamProject = await prisma.teamProject.findFirst({
      where: {
        teamId,
        projectId,
      },
      include: {
        project: true,
      },
    });

    if (!teamProject) {
      throw new Error('Project is not part of this team');
    }

    await prisma.teamProject.delete({
      where: { id: teamProject.id },
    });

    // Log activity
    await this.logActivity(teamId, userId, 'project_removed', 'project', projectId, {
      projectName: teamProject.project.name,
    });

    return { success: true };
  }

  /**
   * Get team projects
   */
  static async getTeamProjects(teamId: string, userId: string) {
    // Check if user is a member
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
      },
    });

    if (!membership) {
      throw new Error('Not a member of this team');
    }

    const teamProjects = await prisma.teamProject.findMany({
      where: { teamId },
      include: {
        project: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: {
                sessions: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter based on access level and member role
    const filtered = teamProjects.filter(tp => {
      if (tp.accessLevel === TeamProjectAccess.ALL_MEMBERS) {
        return true;
      }
      if (tp.accessLevel === TeamProjectAccess.ADMINS_ONLY) {
        return membership.role === TeamRole.OWNER || membership.role === TeamRole.ADMIN;
      }
      return false;
    });

    return filtered;
  }

  /**
   * Get team activity log
   */
  static async getTeamActivity(teamId: string, userId: string, limit = 50) {
    // Check if user is a member
    await this.requireRole(teamId, userId);

    const activities = await prisma.activityLog.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return activities;
  }

  /**
   * Helper: Require specific role(s)
   */
  private static async requireRole(teamId: string, userId: string, roles?: TeamRole[]) {
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId,
      },
    });

    if (!membership) {
      throw new Error('Not a member of this team');
    }

    if (roles && !roles.includes(membership.role)) {
      throw new Error('Insufficient permissions');
    }

    return membership;
  }

  /**
   * Helper: Log team activity
   */
  private static async logActivity(
    teamId: string,
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    metadata: Record<string, any> = {}
  ) {
    await prisma.activityLog.create({
      data: {
        teamId,
        userId,
        action,
        resource,
        resourceId,
        metadata,
      },
    });
  }
}

export default TeamService;
