/**
 * User-related types and interfaces
 */

/**
 * Subscription tier levels
 */
export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
  TEAM = 'TEAM'
}

/**
 * Subscription status
 */
export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TRIALING = 'TRIALING',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  EXPIRED = 'EXPIRED'
}

/**
 * User preferences and settings
 */
export interface UserPreferences {
  /** Preferred theme (light/dark/system) */
  theme: 'light' | 'dark' | 'system';
  /** Preferred language code (e.g., 'en', 'es', 'fr') */
  language: string;
  /** Email notification settings */
  notifications: {
    email: boolean;
    browser: boolean;
    sessionUpdates: boolean;
    projectUpdates: boolean;
    marketingEmails: boolean;
  };
  /** Editor preferences */
  editor: {
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
    lineNumbers: boolean;
    theme: string;
  };
  /** Terminal preferences */
  terminal: {
    fontSize: number;
    fontFamily: string;
    cursorStyle: 'block' | 'underline' | 'bar';
    cursorBlink: boolean;
  };
  /** Recording preferences */
  recording: {
    defaultQuality: 'low' | 'medium' | 'high' | 'ultra';
    autoSave: boolean;
    autoDelete: boolean;
    autoDeleteAfterDays: number;
  };
}

/**
 * Subscription details
 */
export interface Subscription {
  /** Subscription tier */
  tier: SubscriptionTier;
  /** Subscription status */
  status: SubscriptionStatus;
  /** Subscription start date */
  startDate: Date;
  /** Subscription end date (null for active subscriptions) */
  endDate: Date | null;
  /** Trial end date (null if not on trial) */
  trialEndDate: Date | null;
  /** Current billing period start */
  currentPeriodStart: Date | null;
  /** Current billing period end */
  currentPeriodEnd: Date | null;
  /** Stripe customer ID */
  stripeCustomerId: string | null;
  /** Stripe subscription ID */
  stripeSubscriptionId: string | null;
  /** Usage limits based on tier */
  limits: {
    maxProjects: number;
    maxSessionsPerMonth: number;
    maxStorageGB: number;
    maxRecordingMinutes: number;
    maxTeamMembers: number;
    hasPrioritySupport: boolean;
    hasAdvancedAnalytics: boolean;
    hasCustomBranding: boolean;
  };
}

/**
 * Usage statistics
 */
export interface UsageStats {
  /** Number of projects created */
  projectsCount: number;
  /** Number of sessions this month */
  sessionsThisMonth: number;
  /** Total storage used in bytes */
  storageUsedBytes: number;
  /** Recording minutes used this month */
  recordingMinutesThisMonth: number;
  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * User interface
 */
export interface User {
  /** Unique user ID */
  id: string;
  /** User email address */
  email: string;
  /** Display name */
  name: string;
  /** Profile picture URL */
  avatarUrl: string | null;
  /** Phone number (E.164 format) */
  phoneNumber: string | null;
  /** User bio/description */
  bio: string | null;
  /** Company/organization name */
  company: string | null;
  /** Job title */
  jobTitle: string | null;
  /** Account creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Last login timestamp */
  lastLoginAt: Date | null;
  /** Email verification status */
  emailVerified: boolean;
  /** Account active status */
  isActive: boolean;
  /** User preferences */
  preferences: UserPreferences;
  /** Subscription details */
  subscription: Subscription;
  /** Usage statistics */
  usage: UsageStats;
  /** User roles (admin, user, etc.) */
  roles: string[];
  /** OAuth provider (google, github, etc.) */
  authProvider: string | null;
  /** OAuth provider user ID */
  authProviderId: string | null;
  /** Two-factor authentication enabled */
  twoFactorEnabled: boolean;
}

/**
 * User creation payload
 */
export interface CreateUserPayload {
  email: string;
  name: string;
  password?: string;
  authProvider?: string;
  authProviderId?: string;
}

/**
 * User update payload
 */
export interface UpdateUserPayload {
  name?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  bio?: string;
  company?: string;
  jobTitle?: string;
  preferences?: Partial<UserPreferences>;
}

/**
 * User profile (public view)
 */
export interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  company: string | null;
  jobTitle: string | null;
  createdAt: Date;
}
