/**
 * Tests for Zod validation schemas
 */

import { SubscriptionTier, SubscriptionStatus } from '../types/user';
import {
  userPreferencesSchema,
  subscriptionSchema,
  usageStatsSchema,
  userSchema,
  createUserSchema,
  updateUserSchema,
  userProfileSchema
} from '../schemas/userSchema';

describe('user schemas', () => {
  describe('userPreferencesSchema', () => {
    it('should validate valid user preferences', () => {
      const validPreferences = {
        theme: 'dark' as const,
        language: 'en',
        notifications: {
          email: true,
          browser: false,
          sessionUpdates: true,
          projectUpdates: true,
          marketingEmails: false
        },
        editor: {
          fontSize: 14,
          tabSize: 2,
          wordWrap: true,
          minimap: false,
          lineNumbers: true,
          theme: 'monokai'
        },
        terminal: {
          fontSize: 12,
          fontFamily: 'Monaco',
          cursorStyle: 'block' as const,
          cursorBlink: true
        },
        recording: {
          defaultQuality: 'high' as const,
          autoSave: true,
          autoDelete: false,
          autoDeleteAfterDays: 30
        }
      };

      const result = userPreferencesSchema.parse(validPreferences);
      expect(result).toEqual(validPreferences);
    });

    it('should reject invalid theme', () => {
      const invalid = {
        theme: 'invalid',
        language: 'en',
        notifications: { email: true, browser: true, sessionUpdates: true, projectUpdates: true, marketingEmails: false },
        editor: { fontSize: 14, tabSize: 2, wordWrap: true, minimap: false, lineNumbers: true, theme: 'dark' },
        terminal: { fontSize: 12, fontFamily: 'Monaco', cursorStyle: 'block', cursorBlink: true },
        recording: { defaultQuality: 'high', autoSave: true, autoDelete: false, autoDeleteAfterDays: 30 }
      };

      expect(() => userPreferencesSchema.parse(invalid)).toThrow();
    });

    it('should reject invalid font size', () => {
      const invalid = {
        theme: 'dark',
        language: 'en',
        notifications: { email: true, browser: true, sessionUpdates: true, projectUpdates: true, marketingEmails: false },
        editor: { fontSize: 100, tabSize: 2, wordWrap: true, minimap: false, lineNumbers: true, theme: 'dark' },
        terminal: { fontSize: 12, fontFamily: 'Monaco', cursorStyle: 'block', cursorBlink: true },
        recording: { defaultQuality: 'high', autoSave: true, autoDelete: false, autoDeleteAfterDays: 30 }
      };

      expect(() => userPreferencesSchema.parse(invalid)).toThrow();
    });
  });

  describe('subscriptionSchema', () => {
    it('should validate valid subscription', () => {
      const validSubscription = {
        tier: SubscriptionTier.PRO,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date('2024-01-01'),
        endDate: null,
        trialEndDate: null,
        currentPeriodStart: new Date('2024-12-01'),
        currentPeriodEnd: new Date('2025-01-01'),
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        limits: {
          maxProjects: 20,
          maxSessionsPerMonth: 500,
          maxStorageGB: 100,
          maxRecordingMinutes: 1000,
          maxTeamMembers: 5,
          hasPrioritySupport: true,
          hasAdvancedAnalytics: true,
          hasCustomBranding: false
        }
      };

      const result = subscriptionSchema.parse(validSubscription);
      expect(result.tier).toBe(SubscriptionTier.PRO);
      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it('should reject invalid tier', () => {
      const invalid = {
        tier: 'INVALID_TIER',
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: null,
        trialEndDate: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        limits: {
          maxProjects: 1,
          maxSessionsPerMonth: 1,
          maxStorageGB: 1,
          maxRecordingMinutes: 1,
          maxTeamMembers: 1,
          hasPrioritySupport: false,
          hasAdvancedAnalytics: false,
          hasCustomBranding: false
        }
      };

      expect(() => subscriptionSchema.parse(invalid)).toThrow();
    });
  });

  describe('usageStatsSchema', () => {
    it('should validate valid usage stats', () => {
      const validUsage = {
        projectsCount: 5,
        sessionsThisMonth: 25,
        storageUsedBytes: 1024 * 1024 * 100,
        recordingMinutesThisMonth: 120,
        lastUpdated: new Date()
      };

      const result = usageStatsSchema.parse(validUsage);
      expect(result.projectsCount).toBe(5);
    });

    it('should reject negative values', () => {
      const invalid = {
        projectsCount: -1,
        sessionsThisMonth: 25,
        storageUsedBytes: 1024,
        recordingMinutesThisMonth: 120,
        lastUpdated: new Date()
      };

      expect(() => usageStatsSchema.parse(invalid)).toThrow();
    });
  });

  describe('userSchema', () => {
    it('should validate complete valid user', () => {
      const validUser = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        phoneNumber: '+14155552671',
        bio: 'Software developer',
        company: 'Tech Corp',
        jobTitle: 'Senior Developer',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-12-16'),
        lastLoginAt: new Date('2024-12-16'),
        emailVerified: true,
        isActive: true,
        preferences: {
          theme: 'dark' as const,
          language: 'en',
          notifications: {
            email: true,
            browser: true,
            sessionUpdates: true,
            projectUpdates: true,
            marketingEmails: false
          },
          editor: {
            fontSize: 14,
            tabSize: 2,
            wordWrap: true,
            minimap: false,
            lineNumbers: true,
            theme: 'monokai'
          },
          terminal: {
            fontSize: 12,
            fontFamily: 'Monaco',
            cursorStyle: 'block' as const,
            cursorBlink: true
          },
          recording: {
            defaultQuality: 'high' as const,
            autoSave: true,
            autoDelete: false,
            autoDeleteAfterDays: 30
          }
        },
        subscription: {
          tier: SubscriptionTier.PRO,
          status: SubscriptionStatus.ACTIVE,
          startDate: new Date('2024-01-01'),
          endDate: null,
          trialEndDate: null,
          currentPeriodStart: new Date('2024-12-01'),
          currentPeriodEnd: new Date('2025-01-01'),
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
          limits: {
            maxProjects: 20,
            maxSessionsPerMonth: 500,
            maxStorageGB: 100,
            maxRecordingMinutes: 1000,
            maxTeamMembers: 5,
            hasPrioritySupport: true,
            hasAdvancedAnalytics: true,
            hasCustomBranding: false
          }
        },
        usage: {
          projectsCount: 5,
          sessionsThisMonth: 25,
          storageUsedBytes: 1024 * 1024 * 100,
          recordingMinutesThisMonth: 120,
          lastUpdated: new Date()
        },
        roles: ['user'],
        authProvider: null,
        authProviderId: null,
        twoFactorEnabled: false
      };

      const result = userSchema.parse(validUser);
      expect(result.email).toBe('test@example.com');
      expect(result.name).toBe('Test User');
    });

    it('should reject invalid email', () => {
      const invalid = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'invalid-email',
        name: 'Test User'
      };

      expect(() => userSchema.parse(invalid)).toThrow();
    });

    it('should reject invalid UUID', () => {
      const invalid = {
        id: 'not-a-uuid',
        email: 'test@example.com',
        name: 'Test User'
      };

      expect(() => userSchema.parse(invalid)).toThrow();
    });

    it('should reject invalid phone number', () => {
      const user = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        name: 'Test User',
        phoneNumber: '555-1234' // Invalid format
      };

      expect(() => userSchema.parse(user)).toThrow();
    });
  });

  describe('createUserSchema', () => {
    it('should validate valid create user payload', () => {
      const validPayload = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'SecureP@ss123'
      };

      const result = createUserSchema.parse(validPayload);
      expect(result.email).toBe('newuser@example.com');
      expect(result.name).toBe('New User');
    });

    it('should validate OAuth user creation', () => {
      const validPayload = {
        email: 'oauth@example.com',
        name: 'OAuth User',
        authProvider: 'google',
        authProviderId: 'google_123'
      };

      const result = createUserSchema.parse(validPayload);
      expect(result.authProvider).toBe('google');
    });

    it('should reject invalid email', () => {
      const invalid = {
        email: 'invalid',
        name: 'Test'
      };

      expect(() => createUserSchema.parse(invalid)).toThrow();
    });

    it('should reject empty name', () => {
      const invalid = {
        email: 'test@example.com',
        name: ''
      };

      expect(() => createUserSchema.parse(invalid)).toThrow();
    });
  });

  describe('updateUserSchema', () => {
    it('should validate valid update payload', () => {
      const validPayload = {
        name: 'Updated Name',
        bio: 'New bio',
        company: 'New Company'
      };

      const result = updateUserSchema.parse(validPayload);
      expect(result.name).toBe('Updated Name');
    });

    it('should validate partial updates', () => {
      const validPayload = {
        bio: 'Just updating bio'
      };

      const result = updateUserSchema.parse(validPayload);
      expect(result.bio).toBe('Just updating bio');
    });

    it('should validate empty payload', () => {
      const result = updateUserSchema.parse({});
      expect(result).toEqual({});
    });

    it('should reject invalid URL for avatarUrl', () => {
      const invalid = {
        avatarUrl: 'not-a-url'
      };

      expect(() => updateUserSchema.parse(invalid)).toThrow();
    });

    it('should reject invalid phone number', () => {
      const invalid = {
        phoneNumber: '555-1234'
      };

      expect(() => updateUserSchema.parse(invalid)).toThrow();
    });

    it('should reject bio that is too long', () => {
      const invalid = {
        bio: 'a'.repeat(501)
      };

      expect(() => updateUserSchema.parse(invalid)).toThrow();
    });
  });

  describe('userProfileSchema', () => {
    it('should validate valid user profile', () => {
      const validProfile = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        bio: 'Software developer',
        company: 'Tech Corp',
        jobTitle: 'Senior Developer',
        createdAt: new Date('2024-01-01')
      };

      const result = userProfileSchema.parse(validProfile);
      expect(result.name).toBe('John Doe');
    });

    it('should accept null values for optional fields', () => {
      const validProfile = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Jane Doe',
        avatarUrl: null,
        bio: null,
        company: null,
        jobTitle: null,
        createdAt: new Date()
      };

      const result = userProfileSchema.parse(validProfile);
      expect(result.avatarUrl).toBeNull();
      expect(result.bio).toBeNull();
    });

    it('should reject invalid UUID', () => {
      const invalid = {
        id: 'not-a-uuid',
        name: 'Test',
        avatarUrl: null,
        bio: null,
        company: null,
        jobTitle: null,
        createdAt: new Date()
      };

      expect(() => userProfileSchema.parse(invalid)).toThrow();
    });
  });
});
