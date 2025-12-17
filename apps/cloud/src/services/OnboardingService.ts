import { PrismaClient } from '@prisma/client';
import {
  OnboardingState,
  OnboardingStepData,
  OnboardingStep,
  OnboardingProgress,
  CompleteStepPayload,
  UpdateOnboardingPayload,
  UserRole,
} from '@remotedevai/shared';

const prisma = new PrismaClient();

/**
 * Onboarding steps configuration
 */
const ONBOARDING_STEPS: OnboardingStepData[] = [
  {
    step: OnboardingStep.PROFILE_SETUP,
    name: 'profile-setup',
    title: 'Welcome! Let\'s set up your profile',
    description: 'Tell us about yourself to personalize your experience',
    optional: false,
    estimatedTime: 2,
  },
  {
    step: OnboardingStep.DOWNLOAD_AGENT,
    name: 'download-agent',
    title: 'Download Desktop Agent',
    description: 'Install the desktop agent to control your local development environment',
    optional: true,
    estimatedTime: 3,
  },
  {
    step: OnboardingStep.CONNECT_AGENT,
    name: 'connect-agent',
    title: 'Connect Your Desktop Agent',
    description: 'Link your desktop agent to start coding remotely',
    optional: true,
    estimatedTime: 2,
  },
  {
    step: OnboardingStep.CREATE_PROJECT,
    name: 'create-project',
    title: 'Create Your First Project',
    description: 'Set up a project to organize your AI coding sessions',
    optional: false,
    estimatedTime: 3,
  },
  {
    step: OnboardingStep.TUTORIAL,
    name: 'tutorial',
    title: 'Quick Tutorial',
    description: 'Learn the basics: voice commands, screen recording, and more',
    optional: true,
    estimatedTime: 5,
  },
];

export class OnboardingService {
  /**
   * Get user's onboarding progress
   */
  static async getProgress(userId: string): Promise<OnboardingProgress> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboardingCompleted: true,
        onboardingStep: true,
        onboardingSkipped: true,
        role: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const state: OnboardingState = {
      completed: user.onboardingCompleted,
      currentStep: user.onboardingStep,
      skipped: user.onboardingSkipped,
      stepsCompleted: this.getCompletedSteps(user.onboardingStep),
      role: user.role as UserRole | undefined,
    };

    const nextStep = ONBOARDING_STEPS.find(
      (step) => step.step === user.onboardingStep + 1
    );

    const progressPercentage = user.onboardingCompleted
      ? 100
      : Math.round((user.onboardingStep / ONBOARDING_STEPS.length) * 100);

    return {
      state,
      steps: ONBOARDING_STEPS,
      nextStep,
      progressPercentage,
    };
  }

  /**
   * Get completed steps array based on current step
   */
  private static getCompletedSteps(currentStep: number): number[] {
    const completed: number[] = [];
    for (let i = 1; i <= currentStep; i++) {
      completed.push(i);
    }
    return completed;
  }

  /**
   * Complete an onboarding step
   */
  static async completeStep(
    userId: string,
    payload: CompleteStepPayload
  ): Promise<OnboardingProgress> {
    const { step, data } = payload;

    // Validate step
    if (step < 1 || step > ONBOARDING_STEPS.length) {
      throw new Error(`Invalid step number: ${step}`);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboardingStep: true,
        onboardingCompleted: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if already completed
    if (user.onboardingCompleted) {
      return this.getProgress(userId);
    }

    // Update based on step type
    const updateData: any = {
      onboardingStep: Math.max(step, user.onboardingStep),
      updatedAt: new Date(),
    };

    // Handle step-specific data
    if (step === OnboardingStep.PROFILE_SETUP && data) {
      const profileData = data as { name?: string; avatarUrl?: string; role?: string };
      if (profileData.name) updateData.name = profileData.name;
      if (profileData.avatarUrl) updateData.avatarUrl = profileData.avatarUrl;
      if (profileData.role) updateData.role = profileData.role;
    }

    // Mark as completed if last step
    if (step === ONBOARDING_STEPS.length) {
      updateData.onboardingCompleted = true;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Track analytics
    await this.trackStepCompletion(userId, step, data);

    return this.getProgress(userId);
  }

  /**
   * Skip an onboarding step
   */
  static async skipStep(
    userId: string,
    step: number
  ): Promise<OnboardingProgress> {
    const stepData = ONBOARDING_STEPS.find((s) => s.step === step);

    if (!stepData) {
      throw new Error(`Invalid step number: ${step}`);
    }

    if (!stepData.optional) {
      throw new Error(`Step ${step} cannot be skipped - it is required`);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingStep: step,
        updatedAt: new Date(),
      },
    });

    // Track analytics
    await this.trackStepSkipped(userId, step);

    return this.getProgress(userId);
  }

  /**
   * Skip entire onboarding
   */
  static async skipOnboarding(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingSkipped: true,
        onboardingCompleted: true,
        onboardingStep: ONBOARDING_STEPS.length,
        updatedAt: new Date(),
      },
    });

    // Track analytics
    await this.trackOnboardingAbandoned(userId);
  }

  /**
   * Update onboarding state
   */
  static async updateOnboarding(
    userId: string,
    payload: UpdateOnboardingPayload
  ): Promise<OnboardingProgress> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (payload.onboardingCompleted !== undefined) {
      updateData.onboardingCompleted = payload.onboardingCompleted;
    }
    if (payload.onboardingStep !== undefined) {
      updateData.onboardingStep = payload.onboardingStep;
    }
    if (payload.onboardingSkipped !== undefined) {
      updateData.onboardingSkipped = payload.onboardingSkipped;
    }
    if (payload.role !== undefined) {
      updateData.role = payload.role;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return this.getProgress(userId);
  }

  /**
   * Get onboarding steps configuration
   */
  static getSteps(): OnboardingStepData[] {
    return ONBOARDING_STEPS;
  }

  /**
   * Get specific step data
   */
  static getStep(step: number): OnboardingStepData | undefined {
    return ONBOARDING_STEPS.find((s) => s.step === step);
  }

  /**
   * Reset onboarding (for testing or re-onboarding)
   */
  static async resetOnboarding(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompleted: false,
        onboardingStep: 0,
        onboardingSkipped: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Track step completion in analytics
   */
  private static async trackStepCompletion(
    userId: string,
    step: number,
    data?: any
  ): Promise<void> {
    try {
      await prisma.analyticsEvent.create({
        data: {
          eventType: 'onboarding_step_completed',
          eventName: `Onboarding Step ${step} Completed`,
          category: 'USER',
          userId,
          metadata: {
            step,
            stepName: ONBOARDING_STEPS.find((s) => s.step === step)?.name,
            stepData: data,
          },
        },
      });
    } catch (error) {
      console.error('Failed to track onboarding step completion:', error);
    }
  }

  /**
   * Track step skipped in analytics
   */
  private static async trackStepSkipped(
    userId: string,
    step: number
  ): Promise<void> {
    try {
      await prisma.analyticsEvent.create({
        data: {
          eventType: 'onboarding_step_skipped',
          eventName: `Onboarding Step ${step} Skipped`,
          category: 'USER',
          userId,
          metadata: {
            step,
            stepName: ONBOARDING_STEPS.find((s) => s.step === step)?.name,
          },
        },
      });
    } catch (error) {
      console.error('Failed to track onboarding step skipped:', error);
    }
  }

  /**
   * Track onboarding abandoned
   */
  private static async trackOnboardingAbandoned(userId: string): Promise<void> {
    try {
      await prisma.analyticsEvent.create({
        data: {
          eventType: 'onboarding_abandoned',
          eventName: 'Onboarding Abandoned',
          category: 'USER',
          userId,
          metadata: {
            reason: 'user_skipped',
          },
        },
      });
    } catch (error) {
      console.error('Failed to track onboarding abandoned:', error);
    }
  }

  /**
   * Get onboarding statistics (admin only)
   */
  static async getStatistics(dateFrom?: Date, dateTo?: Date) {
    const where: any = {
      eventType: {
        in: [
          'onboarding_step_completed',
          'onboarding_step_skipped',
          'onboarding_abandoned',
        ],
      },
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const events = await prisma.analyticsEvent.findMany({
      where,
      select: {
        eventType: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Calculate statistics
    const stats = {
      totalStarted: 0,
      totalCompleted: 0,
      totalAbandoned: 0,
      stepCompletion: {} as Record<number, number>,
      stepSkipped: {} as Record<number, number>,
      averageCompletionTime: 0,
      completionRate: 0,
    };

    // Process events
    const userCompletions = new Map<string, any>();

    events.forEach((event) => {
      const metadata = event.metadata as any;

      if (event.eventType === 'onboarding_step_completed') {
        const step = metadata.step;
        stats.stepCompletion[step] = (stats.stepCompletion[step] || 0) + 1;

        if (step === ONBOARDING_STEPS.length) {
          stats.totalCompleted++;
        }
      } else if (event.eventType === 'onboarding_step_skipped') {
        const step = metadata.step;
        stats.stepSkipped[step] = (stats.stepSkipped[step] || 0) + 1;
      } else if (event.eventType === 'onboarding_abandoned') {
        stats.totalAbandoned++;
      }
    });

    // Calculate completion rate
    const totalUsers = await prisma.user.count({
      where: {
        createdAt: dateFrom ? { gte: dateFrom } : undefined,
      },
    });

    stats.totalStarted = totalUsers;
    stats.completionRate =
      totalUsers > 0 ? (stats.totalCompleted / totalUsers) * 100 : 0;

    return stats;
  }
}

export default OnboardingService;
