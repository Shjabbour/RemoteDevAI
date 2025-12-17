import { Router } from 'express';
import { TeamService } from '../services/TeamService';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { z } from 'zod';
import { TeamRole, TeamProjectAccess } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(TeamRole),
});

const updateRoleSchema = z.object({
  role: z.nativeEnum(TeamRole),
});

const addProjectSchema = z.object({
  projectId: z.string().uuid(),
  accessLevel: z.nativeEnum(TeamProjectAccess).optional(),
});

/**
 * POST /api/teams
 * Create a new team
 */
router.post('/', validateBody(createTeamSchema), async (req: AuthRequest, res) => {
  try {
    const team = await TeamService.createTeam(req.user!.userId, req.body);

    res.status(201).json({
      success: true,
      data: team,
      message: 'Team created successfully',
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(400).json({
      success: false,
      error: 'Team creation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/teams
 * Get all teams for the authenticated user
 */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const teams = await TeamService.getUserTeams(req.user!.userId);

    res.json({
      success: true,
      data: teams,
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get teams',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/teams/:id
 * Get team details
 */
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { team, membership } = await TeamService.getTeam(req.params.id, req.user!.userId);

    res.json({
      success: true,
      data: {
        ...team,
        userRole: membership.role,
      },
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(404).json({
      success: false,
      error: 'Team not found',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/teams/:id
 * Update team
 */
router.put('/:id', validateBody(updateTeamSchema), async (req: AuthRequest, res) => {
  try {
    const team = await TeamService.updateTeam(req.params.id, req.user!.userId, req.body);

    res.json({
      success: true,
      data: team,
      message: 'Team updated successfully',
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(400).json({
      success: false,
      error: 'Team update failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/teams/:id
 * Delete team
 */
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await TeamService.deleteTeam(req.params.id, req.user!.userId);

    res.json({
      success: true,
      message: 'Team deleted successfully',
    });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(400).json({
      success: false,
      error: 'Team deletion failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/teams/:id/invitations
 * Invite a member to the team
 */
router.post('/:id/invitations', validateBody(inviteMemberSchema), async (req: AuthRequest, res) => {
  try {
    const invitation = await TeamService.inviteMember(req.params.id, req.user!.userId, req.body);

    res.status(201).json({
      success: true,
      data: invitation,
      message: 'Invitation sent successfully',
    });
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(400).json({
      success: false,
      error: 'Invitation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/teams/:id/invitations
 * Get team invitations
 */
router.get('/:id/invitations', async (req: AuthRequest, res) => {
  try {
    const invitations = await TeamService.getTeamInvitations(req.params.id, req.user!.userId);

    res.json({
      success: true,
      data: invitations,
    });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to get invitations',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/teams/:id/invitations/:invitationId
 * Revoke a team invitation
 */
router.delete('/:id/invitations/:invitationId', async (req: AuthRequest, res) => {
  try {
    await TeamService.revokeInvitation(req.params.invitationId, req.params.id, req.user!.userId);

    res.json({
      success: true,
      message: 'Invitation revoked successfully',
    });
  } catch (error) {
    console.error('Revoke invitation error:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to revoke invitation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/teams/join/:token
 * Accept a team invitation
 */
router.post('/join/:token', async (req: AuthRequest, res) => {
  try {
    const result = await TeamService.acceptInvitation(req.params.token, req.user!.userId);

    res.json({
      success: true,
      data: result,
      message: 'Successfully joined team',
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to join team',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/teams/:id/members/:userId
 * Remove a member from the team
 */
router.delete('/:id/members/:userId', async (req: AuthRequest, res) => {
  try {
    await TeamService.removeMember(req.params.id, req.user!.userId, req.params.userId);

    res.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to remove member',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/teams/:id/members/:userId/role
 * Update a member's role
 */
router.put('/:id/members/:userId/role', validateBody(updateRoleSchema), async (req: AuthRequest, res) => {
  try {
    const member = await TeamService.updateMemberRole(
      req.params.id,
      req.user!.userId,
      req.params.userId,
      req.body.role
    );

    res.json({
      success: true,
      data: member,
      message: 'Member role updated successfully',
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to update role',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/teams/:id/projects
 * Get team projects
 */
router.get('/:id/projects', async (req: AuthRequest, res) => {
  try {
    const projects = await TeamService.getTeamProjects(req.params.id, req.user!.userId);

    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error('Get team projects error:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to get projects',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/teams/:id/projects
 * Add a project to the team
 */
router.post('/:id/projects', validateBody(addProjectSchema), async (req: AuthRequest, res) => {
  try {
    const teamProject = await TeamService.addProjectToTeam(
      req.params.id,
      req.user!.userId,
      req.body.projectId,
      req.body.accessLevel
    );

    res.status(201).json({
      success: true,
      data: teamProject,
      message: 'Project added to team successfully',
    });
  } catch (error) {
    console.error('Add project to team error:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to add project',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/teams/:id/projects/:projectId
 * Remove a project from the team
 */
router.delete('/:id/projects/:projectId', async (req: AuthRequest, res) => {
  try {
    await TeamService.removeProjectFromTeam(req.params.id, req.user!.userId, req.params.projectId);

    res.json({
      success: true,
      message: 'Project removed from team successfully',
    });
  } catch (error) {
    console.error('Remove project from team error:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to remove project',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/teams/:id/activity
 * Get team activity log
 */
router.get('/:id/activity', async (req: AuthRequest, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const activities = await TeamService.getTeamActivity(req.params.id, req.user!.userId, limit);

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error('Get team activity error:', error);
    res.status(400).json({
      success: false,
      error: 'Failed to get activity',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
