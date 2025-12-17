/**
 * Zod validation schemas for message-related types
 */

import { z } from 'zod';
import { MessageRole, AttachmentType } from '../types/session';

/**
 * Create message attachment schema
 */
export const createMessageAttachmentSchema = z.object({
  type: z.nativeEnum(AttachmentType),
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().url(),
  fileSizeBytes: z.number().min(0),
  mimeType: z.string()
});

/**
 * Create message payload schema
 */
export const createMessageSchema = z.object({
  sessionId: z.string().uuid(),
  role: z.nativeEnum(MessageRole),
  content: z.string().min(1),
  parentMessageId: z.string().uuid().optional(),
  attachments: z.array(createMessageAttachmentSchema).optional()
});

/**
 * Update message payload schema
 */
export const updateMessageSchema = z.object({
  content: z.string().min(1).optional(),
  isPinned: z.boolean().optional()
});

/**
 * Message filter schema
 */
export const messageFilterSchema = z.object({
  sessionId: z.string().uuid(),
  role: z.nativeEnum(MessageRole).optional(),
  userId: z.string().uuid().optional(),
  parentMessageId: z.string().uuid().optional(),
  isPinned: z.boolean().optional(),
  hasAttachments: z.boolean().optional(),
  hasToolCalls: z.boolean().optional(),
  searchQuery: z.string().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional()
});
