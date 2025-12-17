/**
 * Project-related types and interfaces
 */

/**
 * Project status
 */
export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
  TEMPLATE = 'TEMPLATE'
}

/**
 * Project visibility
 */
export enum ProjectVisibility {
  PRIVATE = 'PRIVATE',
  TEAM = 'TEAM',
  PUBLIC = 'PUBLIC'
}

/**
 * Project member role
 */
export enum ProjectRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER'
}

/**
 * Project settings
 */
export interface ProjectSettings {
  /** Default AI model to use */
  defaultModel: string;
  /** Allowed AI models */
  allowedModels: string[];
  /** Enable terminal recording */
  enableTerminalRecording: boolean;
  /** Enable screen recording */
  enableScreenRecording: boolean;
  /** Enable browser automation */
  enableBrowserAutomation: boolean;
  /** Auto-save interval in seconds */
  autoSaveInterval: number;
  /** Session timeout in minutes */
  sessionTimeout: number;
  /** Maximum concurrent sessions */
  maxConcurrentSessions: number;
  /** Enable version control integration */
  enableGitIntegration: boolean;
  /** Git repository URL */
  gitRepositoryUrl: string | null;
  /** Git branch */
  gitBranch: string | null;
  /** Enable Slack notifications */
  enableSlackNotifications: boolean;
  /** Slack webhook URL */
  slackWebhookUrl: string | null;
  /** Custom environment variables */
  environmentVariables: Record<string, string>;
  /** Allowed file extensions */
  allowedFileExtensions: string[];
  /** Maximum file size in bytes */
  maxFileSizeBytes: number;
}

/**
 * Project statistics
 */
export interface ProjectStats {
  /** Total number of sessions */
  totalSessions: number;
  /** Number of active sessions */
  activeSessions: number;
  /** Total recording time in minutes */
  totalRecordingMinutes: number;
  /** Total storage used in bytes */
  storageUsedBytes: number;
  /** Number of files */
  filesCount: number;
  /** Number of team members */
  membersCount: number;
  /** Last activity timestamp */
  lastActivityAt: Date | null;
  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * Project member
 */
export interface ProjectMember {
  /** User ID */
  userId: string;
  /** Project ID */
  projectId: string;
  /** User name */
  userName: string;
  /** User email */
  userEmail: string;
  /** User avatar URL */
  userAvatarUrl: string | null;
  /** Member role */
  role: ProjectRole;
  /** Date joined */
  joinedAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date | null;
  /** Invitation status (for pending invites) */
  invitationStatus: 'pending' | 'accepted' | 'declined' | null;
}

/**
 * Project interface
 */
export interface Project {
  /** Unique project ID */
  id: string;
  /** Project name */
  name: string;
  /** Project description */
  description: string | null;
  /** Project icon/emoji */
  icon: string | null;
  /** Project owner user ID */
  ownerId: string;
  /** Owner name */
  ownerName: string;
  /** Project status */
  status: ProjectStatus;
  /** Project visibility */
  visibility: ProjectVisibility;
  /** Project creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Last accessed timestamp */
  lastAccessedAt: Date | null;
  /** Project settings */
  settings: ProjectSettings;
  /** Project statistics */
  stats: ProjectStats;
  /** Project tags */
  tags: string[];
  /** Project technology stack */
  techStack: string[];
  /** Project repository URL */
  repositoryUrl: string | null;
  /** Is template project */
  isTemplate: boolean;
  /** Template source project ID */
  templateSourceId: string | null;
}

/**
 * Project creation payload
 */
export interface CreateProjectPayload {
  name: string;
  description?: string;
  icon?: string;
  visibility?: ProjectVisibility;
  settings?: Partial<ProjectSettings>;
  tags?: string[];
  techStack?: string[];
  repositoryUrl?: string;
  isTemplate?: boolean;
  templateSourceId?: string;
}

/**
 * Project update payload
 */
export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  icon?: string;
  visibility?: ProjectVisibility;
  status?: ProjectStatus;
  settings?: Partial<ProjectSettings>;
  tags?: string[];
  techStack?: string[];
  repositoryUrl?: string;
}

/**
 * Project invitation
 */
export interface ProjectInvitation {
  /** Invitation ID */
  id: string;
  /** Project ID */
  projectId: string;
  /** Project name */
  projectName: string;
  /** Inviter user ID */
  inviterId: string;
  /** Inviter name */
  inviterName: string;
  /** Invitee email */
  inviteeEmail: string;
  /** Invited user ID (null if not registered) */
  inviteeUserId: string | null;
  /** Assigned role */
  role: ProjectRole;
  /** Invitation token */
  token: string;
  /** Invitation status */
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  /** Invitation created timestamp */
  createdAt: Date;
  /** Invitation expires timestamp */
  expiresAt: Date;
  /** Invitation accepted/declined timestamp */
  respondedAt: Date | null;
}

/**
 * Project summary (for lists)
 */
export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  ownerName: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  updatedAt: Date;
  stats: {
    totalSessions: number;
    activeSessions: number;
    membersCount: number;
  };
  tags: string[];
}
