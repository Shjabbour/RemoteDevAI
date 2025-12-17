/**
 * Zod validation schemas for project-related types
 */

import { z } from 'zod';
import { ProjectStatus, ProjectVisibility, ProjectRole } from '../types/project';

/**
 * Project settings schema
 */
export const projectSettingsSchema = z.object({
  defaultModel: z.string().min(1),
  allowedModels: z.array(z.string()),
  enableTerminalRecording: z.boolean(),
  enableScreenRecording: z.boolean(),
  enableBrowserAutomation: z.boolean(),
  autoSaveInterval: z.number().min(0),
  sessionTimeout: z.number().min(1),
  maxConcurrentSessions: z.number().min(1),
  enableGitIntegration: z.boolean(),
  gitRepositoryUrl: z.string().url().nullable(),
  gitBranch: z.string().nullable(),
  enableSlackNotifications: z.boolean(),
  slackWebhookUrl: z.string().url().nullable(),
  environmentVariables: z.record(z.string()),
  allowedFileExtensions: z.array(z.string()),
  maxFileSizeBytes: z.number().min(1)
});

/**
 * Project stats schema
 */
export const projectStatsSchema = z.object({
  totalSessions: z.number().min(0),
  activeSessions: z.number().min(0),
  totalRecordingMinutes: z.number().min(0),
  storageUsedBytes: z.number().min(0),
  filesCount: z.number().min(0),
  membersCount: z.number().min(0),
  lastActivityAt: z.date().nullable(),
  lastUpdated: z.date()
});

/**
 * Project member schema
 */
export const projectMemberSchema = z.object({
  userId: z.string().uuid(),
  projectId: z.string().uuid(),
  userName: z.string(),
  userEmail: z.string().email(),
  userAvatarUrl: z.string().url().nullable(),
  role: z.nativeEnum(ProjectRole),
  joinedAt: z.date(),
  lastActivityAt: z.date().nullable(),
  invitationStatus: z.enum(['pending', 'accepted', 'declined']).nullable()
});

/**
 * Project schema
 */
export const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable(),
  icon: z.string().max(50).nullable(),
  ownerId: z.string().uuid(),
  ownerName: z.string(),
  status: z.nativeEnum(ProjectStatus),
  visibility: z.nativeEnum(ProjectVisibility),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastAccessedAt: z.date().nullable(),
  settings: projectSettingsSchema,
  stats: projectStatsSchema,
  tags: z.array(z.string()),
  techStack: z.array(z.string()),
  repositoryUrl: z.string().url().nullable(),
  isTemplate: z.boolean(),
  templateSourceId: z.string().uuid().nullable()
});

/**
 * Create project payload schema
 */
export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  visibility: z.nativeEnum(ProjectVisibility).optional(),
  settings: projectSettingsSchema.partial().optional(),
  tags: z.array(z.string()).optional(),
  techStack: z.array(z.string()).optional(),
  repositoryUrl: z.string().url().optional(),
  isTemplate: z.boolean().optional(),
  templateSourceId: z.string().uuid().optional()
});

/**
 * Update project payload schema
 */
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  visibility: z.nativeEnum(ProjectVisibility).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  settings: projectSettingsSchema.partial().optional(),
  tags: z.array(z.string()).optional(),
  techStack: z.array(z.string()).optional(),
  repositoryUrl: z.string().url().optional()
});

/**
 * Project invitation schema
 */
export const projectInvitationSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  projectName: z.string(),
  inviterId: z.string().uuid(),
  inviterName: z.string(),
  inviteeEmail: z.string().email(),
  inviteeUserId: z.string().uuid().nullable(),
  role: z.nativeEnum(ProjectRole),
  token: z.string(),
  status: z.enum(['pending', 'accepted', 'declined', 'expired']),
  createdAt: z.date(),
  expiresAt: z.date(),
  respondedAt: z.date().nullable()
});

/**
 * Project summary schema
 */
export const projectSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  ownerName: z.string(),
  status: z.nativeEnum(ProjectStatus),
  visibility: z.nativeEnum(ProjectVisibility),
  updatedAt: z.date(),
  stats: z.object({
    totalSessions: z.number(),
    activeSessions: z.number(),
    membersCount: z.number()
  }),
  tags: z.array(z.string())
});
