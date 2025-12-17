/**
 * Zod validation schemas for user-related types
 */

import { z } from 'zod';
import { SubscriptionTier, SubscriptionStatus } from '../types/user';

/**
 * User preferences schema
 */
export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  language: z.string().min(2).max(10),
  notifications: z.object({
    email: z.boolean(),
    browser: z.boolean(),
    sessionUpdates: z.boolean(),
    projectUpdates: z.boolean(),
    marketingEmails: z.boolean()
  }),
  editor: z.object({
    fontSize: z.number().min(8).max(32),
    tabSize: z.number().min(2).max(8),
    wordWrap: z.boolean(),
    minimap: z.boolean(),
    lineNumbers: z.boolean(),
    theme: z.string()
  }),
  terminal: z.object({
    fontSize: z.number().min(8).max(32),
    fontFamily: z.string(),
    cursorStyle: z.enum(['block', 'underline', 'bar']),
    cursorBlink: z.boolean()
  }),
  recording: z.object({
    defaultQuality: z.enum(['low', 'medium', 'high', 'ultra']),
    autoSave: z.boolean(),
    autoDelete: z.boolean(),
    autoDeleteAfterDays: z.number().min(1).max(365)
  })
});

/**
 * Subscription schema
 */
export const subscriptionSchema = z.object({
  tier: z.nativeEnum(SubscriptionTier),
  status: z.nativeEnum(SubscriptionStatus),
  startDate: z.date(),
  endDate: z.date().nullable(),
  trialEndDate: z.date().nullable(),
  currentPeriodStart: z.date().nullable(),
  currentPeriodEnd: z.date().nullable(),
  stripeCustomerId: z.string().nullable(),
  stripeSubscriptionId: z.string().nullable(),
  limits: z.object({
    maxProjects: z.number().min(1),
    maxSessionsPerMonth: z.number().min(1),
    maxStorageGB: z.number().min(1),
    maxRecordingMinutes: z.number().min(1),
    maxTeamMembers: z.number().min(1),
    hasPrioritySupport: z.boolean(),
    hasAdvancedAnalytics: z.boolean(),
    hasCustomBranding: z.boolean()
  })
});

/**
 * Usage stats schema
 */
export const usageStatsSchema = z.object({
  projectsCount: z.number().min(0),
  sessionsThisMonth: z.number().min(0),
  storageUsedBytes: z.number().min(0),
  recordingMinutesThisMonth: z.number().min(0),
  lastUpdated: z.date()
});

/**
 * User schema
 */
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  avatarUrl: z.string().url().nullable(),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/).nullable(), // E.164 format
  bio: z.string().max(500).nullable(),
  company: z.string().max(255).nullable(),
  jobTitle: z.string().max(255).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().nullable(),
  emailVerified: z.boolean(),
  isActive: z.boolean(),
  preferences: userPreferencesSchema,
  subscription: subscriptionSchema,
  usage: usageStatsSchema,
  roles: z.array(z.string()),
  authProvider: z.string().nullable(),
  authProviderId: z.string().nullable(),
  twoFactorEnabled: z.boolean()
});

/**
 * Create user payload schema
 */
export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  password: z.string().min(8).max(255).optional(),
  authProvider: z.string().optional(),
  authProviderId: z.string().optional()
});

/**
 * Update user payload schema
 */
export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  avatarUrl: z.string().url().optional(),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(),
  bio: z.string().max(500).optional(),
  company: z.string().max(255).optional(),
  jobTitle: z.string().max(255).optional(),
  preferences: userPreferencesSchema.partial().optional()
});

/**
 * User profile schema
 */
export const userProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  avatarUrl: z.string().url().nullable(),
  bio: z.string().nullable(),
  company: z.string().nullable(),
  jobTitle: z.string().nullable(),
  createdAt: z.date()
});
