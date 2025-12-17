/**
 * Onboarding-related types and interfaces
 */

/**
 * Onboarding step names
 */
export enum OnboardingStep {
  PROFILE_SETUP = 1,
  DOWNLOAD_AGENT = 2,
  CONNECT_AGENT = 3,
  CREATE_PROJECT = 4,
  TUTORIAL = 5,
  COMPLETE = 6,
}

/**
 * User role types
 */
export type UserRole =
  | 'developer'
  | 'team_lead'
  | 'engineering_manager'
  | 'product_manager'
  | 'designer'
  | 'student'
  | 'other';

/**
 * Platform types for desktop agent
 */
export type Platform = 'windows' | 'macos' | 'linux';

/**
 * Onboarding state interface
 */
export interface OnboardingState {
  /** Whether onboarding is completed */
  completed: boolean;
  /** Current step number (1-6) */
  currentStep: number;
  /** Whether user skipped onboarding */
  skipped: boolean;
  /** Array of completed step numbers */
  stepsCompleted: number[];
  /** User's selected role */
  role?: UserRole;
}

/**
 * Onboarding step metadata
 */
export interface OnboardingStepData {
  /** Step number */
  step: OnboardingStep;
  /** Internal name */
  name: string;
  /** Display title */
  title: string;
  /** Description of the step */
  description: string;
  /** Whether this step can be skipped */
  optional: boolean;
  /** Estimated time to complete in minutes */
  estimatedTime?: number;
}

/**
 * Profile setup data (Step 1)
 */
export interface ProfileSetupData {
  /** Display name */
  name: string;
  /** Profile picture URL */
  avatarUrl?: string;
  /** User role */
  role: UserRole;
}

/**
 * Download agent data (Step 2)
 */
export interface DownloadAgentData {
  /** Platform user is downloading for */
  platform: Platform;
  /** Whether download was completed */
  downloaded: boolean;
  /** Whether user skipped this step */
  skipped?: boolean;
}

/**
 * Connect agent data (Step 3)
 */
export interface ConnectAgentData {
  /** Agent ID that was connected */
  agentId?: string;
  /** Connection code used */
  connectionCode?: string;
  /** Whether connection was successful */
  connected: boolean;
  /** Whether user skipped this step */
  skipped?: boolean;
}

/**
 * Create project data (Step 4)
 */
export interface CreateProjectData {
  /** Project ID created */
  projectId?: string;
  /** Project name */
  projectName?: string;
  /** Whether project was created */
  created: boolean;
  /** Whether user imported from GitHub */
  importedFromGitHub?: boolean;
  /** Whether user skipped this step */
  skipped?: boolean;
}

/**
 * Tutorial completion data (Step 5)
 */
export interface TutorialData {
  /** Whether user completed the tutorial */
  completed: boolean;
  /** Features the user interacted with */
  featuresViewed?: string[];
  /** Whether user skipped this step */
  skipped?: boolean;
}

/**
 * Complete onboarding step payload
 */
export interface CompleteStepPayload {
  /** Step number to complete */
  step: number;
  /** Optional data for the step */
  data?:
    | ProfileSetupData
    | DownloadAgentData
    | ConnectAgentData
    | CreateProjectData
    | TutorialData
    | Record<string, any>;
}

/**
 * Update onboarding state payload
 */
export interface UpdateOnboardingPayload {
  /** Mark onboarding as completed */
  onboardingCompleted?: boolean;
  /** Update current step */
  onboardingStep?: number;
  /** Mark as skipped */
  onboardingSkipped?: boolean;
  /** Update user role */
  role?: UserRole;
}

/**
 * Onboarding progress response
 */
export interface OnboardingProgress {
  /** Current onboarding state */
  state: OnboardingState;
  /** Available onboarding steps */
  steps: OnboardingStepData[];
  /** Next recommended step */
  nextStep?: OnboardingStepData;
  /** Progress percentage (0-100) */
  progressPercentage: number;
}

/**
 * Desktop agent download links
 */
export interface AgentDownloadLinks {
  windows: {
    x64: string;
    arm64: string;
  };
  macos: {
    intel: string;
    apple_silicon: string;
    universal: string;
  };
  linux: {
    deb: string;
    rpm: string;
    appimage: string;
  };
}

/**
 * Onboarding analytics event
 */
export interface OnboardingAnalyticsEvent {
  /** Event type */
  type:
    | 'step_started'
    | 'step_completed'
    | 'step_skipped'
    | 'onboarding_completed'
    | 'onboarding_abandoned';
  /** Step number */
  step?: number;
  /** Time spent in seconds */
  timeSpent?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}
