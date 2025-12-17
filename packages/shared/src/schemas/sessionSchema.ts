/**
 * Zod validation schemas for session-related types
 */

import { z } from 'zod';
import { SessionStatus, MessageRole, AttachmentType } from '../types/session';

/**
 * Message attachment schema
 */
export const messageAttachmentSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(AttachmentType),
  fileName: z.string().min(1),
  fileUrl: z.string().url(),
  fileSizeBytes: z.number().min(0),
  mimeType: z.string(),
  thumbnailUrl: z.string().url().nullable(),
  uploadedAt: z.date()
});

/**
 * Tool call schema
 */
export const toolCallSchema = z.object({
  id: z.string().uuid(),
  toolName: z.string(),
  arguments: z.record(z.any()),
  result: z.any(),
  status: z.enum(['pending', 'success', 'error']),
  error: z.string().nullable(),
  startedAt: z.date(),
  completedAt: z.date().nullable()
});

/**
 * Session message schema
 */
export const sessionMessageSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  role: z.nativeEnum(MessageRole),
  content: z.string(),
  rawContent: z.string().nullable(),
  metadata: z.object({
    model: z.string().nullable(),
    promptTokens: z.number().nullable(),
    completionTokens: z.number().nullable(),
    totalTokens: z.number().nullable(),
    responseTimeMs: z.number().nullable(),
    temperature: z.number().nullable(),
    topP: z.number().nullable()
  }),
  attachments: z.array(messageAttachmentSchema),
  toolCalls: z.array(toolCallSchema),
  parentMessageId: z.string().uuid().nullable(),
  userId: z.string().uuid(),
  userName: z.string(),
  createdAt: z.date(),
  editedAt: z.date().nullable(),
  isDeleted: z.boolean(),
  isPinned: z.boolean()
});

/**
 * Session participant schema
 */
export const sessionParticipantSchema = z.object({
  userId: z.string().uuid(),
  userName: z.string(),
  userAvatarUrl: z.string().url().nullable(),
  role: z.enum(['owner', 'collaborator', 'viewer']),
  joinedAt: z.date(),
  leftAt: z.date().nullable(),
  isOnline: z.boolean(),
  lastActivityAt: z.date().nullable(),
  cursorPosition: z.object({
    file: z.string().nullable(),
    line: z.number().nullable(),
    column: z.number().nullable()
  }).nullable()
});

/**
 * Session stats schema
 */
export const sessionStatsSchema = z.object({
  totalMessages: z.number().min(0),
  userMessages: z.number().min(0),
  assistantMessages: z.number().min(0),
  totalTokens: z.number().min(0),
  totalCostUsd: z.number().min(0),
  durationMs: z.number().min(0),
  toolCallsCount: z.number().min(0),
  attachmentsCount: z.number().min(0),
  participantsCount: z.number().min(0),
  lastUpdated: z.date()
});

/**
 * Session settings schema
 */
export const sessionSettingsSchema = z.object({
  temperature: z.number().min(0).max(2),
  topP: z.number().min(0).max(1),
  maxTokens: z.number().min(1),
  streaming: z.boolean(),
  enableToolUse: z.boolean(),
  enabledTools: z.array(z.string())
});

/**
 * Session schema
 */
export const sessionSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  projectName: z.string(),
  title: z.string().min(1).max(255),
  description: z.string().max(1000).nullable(),
  ownerId: z.string().uuid(),
  ownerName: z.string(),
  status: z.nativeEnum(SessionStatus),
  model: z.string(),
  systemPrompt: z.string().nullable(),
  createdAt: z.date(),
  startedAt: z.date().nullable(),
  endedAt: z.date().nullable(),
  updatedAt: z.date(),
  lastActivityAt: z.date().nullable(),
  stats: sessionStatsSchema,
  tags: z.array(z.string()),
  isRecording: z.boolean(),
  recordingIds: z.array(z.string().uuid()),
  participants: z.array(sessionParticipantSchema),
  settings: sessionSettingsSchema,
  sharedWith: z.array(z.string().uuid()),
  isPublic: z.boolean()
});

/**
 * Create session payload schema
 */
export const createSessionSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  model: z.string(),
  systemPrompt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  settings: sessionSettingsSchema.partial().optional(),
  isRecording: z.boolean().optional()
});

/**
 * Update session payload schema
 */
export const updateSessionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  status: z.nativeEnum(SessionStatus).optional(),
  systemPrompt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  settings: sessionSettingsSchema.partial().optional(),
  isRecording: z.boolean().optional()
});

/**
 * Session summary schema
 */
export const sessionSummarySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  projectName: z.string(),
  title: z.string(),
  ownerName: z.string(),
  status: z.nativeEnum(SessionStatus),
  model: z.string(),
  createdAt: z.date(),
  lastActivityAt: z.date().nullable(),
  stats: z.object({
    totalMessages: z.number(),
    totalTokens: z.number(),
    durationMs: z.number(),
    participantsCount: z.number()
  }),
  tags: z.array(z.string()),
  isRecording: z.boolean()
});
