/**
 * Session-related types and interfaces
 */

/**
 * Session status
 */
export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED'
}

/**
 * Message role in conversation
 */
export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
  TOOL = 'TOOL'
}

/**
 * Message attachment type
 */
export enum AttachmentType {
  IMAGE = 'IMAGE',
  FILE = 'FILE',
  CODE = 'CODE',
  SCREENSHOT = 'SCREENSHOT',
  RECORDING = 'RECORDING'
}

/**
 * Message attachment
 */
export interface MessageAttachment {
  /** Attachment ID */
  id: string;
  /** Attachment type */
  type: AttachmentType;
  /** File name */
  fileName: string;
  /** File URL */
  fileUrl: string;
  /** File size in bytes */
  fileSizeBytes: number;
  /** MIME type */
  mimeType: string;
  /** Thumbnail URL (for images/videos) */
  thumbnailUrl: string | null;
  /** Upload timestamp */
  uploadedAt: Date;
}

/**
 * Tool call in message
 */
export interface ToolCall {
  /** Tool call ID */
  id: string;
  /** Tool name */
  toolName: string;
  /** Tool arguments */
  arguments: Record<string, any>;
  /** Tool result */
  result: any;
  /** Execution status */
  status: 'pending' | 'success' | 'error';
  /** Error message if failed */
  error: string | null;
  /** Execution start timestamp */
  startedAt: Date;
  /** Execution end timestamp */
  completedAt: Date | null;
}

/**
 * Session message
 */
export interface SessionMessage {
  /** Message ID */
  id: string;
  /** Session ID */
  sessionId: string;
  /** Message role */
  role: MessageRole;
  /** Message content */
  content: string;
  /** Raw content (before processing) */
  rawContent: string | null;
  /** Message metadata */
  metadata: {
    /** Model used */
    model: string | null;
    /** Tokens used in prompt */
    promptTokens: number | null;
    /** Tokens used in completion */
    completionTokens: number | null;
    /** Total tokens used */
    totalTokens: number | null;
    /** Response time in milliseconds */
    responseTimeMs: number | null;
    /** Temperature setting */
    temperature: number | null;
    /** Top-p setting */
    topP: number | null;
  };
  /** Message attachments */
  attachments: MessageAttachment[];
  /** Tool calls made in this message */
  toolCalls: ToolCall[];
  /** Parent message ID (for threaded conversations) */
  parentMessageId: string | null;
  /** User ID who sent the message */
  userId: string;
  /** User name */
  userName: string;
  /** Message creation timestamp */
  createdAt: Date;
  /** Message edit timestamp */
  editedAt: Date | null;
  /** Message deleted status */
  isDeleted: boolean;
  /** Message pinned status */
  isPinned: boolean;
}

/**
 * Session participant
 */
export interface SessionParticipant {
  /** User ID */
  userId: string;
  /** User name */
  userName: string;
  /** User avatar URL */
  userAvatarUrl: string | null;
  /** Role in session */
  role: 'owner' | 'collaborator' | 'viewer';
  /** Joined timestamp */
  joinedAt: Date;
  /** Left timestamp (null if still active) */
  leftAt: Date | null;
  /** Is currently online */
  isOnline: boolean;
  /** Last activity timestamp */
  lastActivityAt: Date | null;
  /** Cursor position (for collaborative editing) */
  cursorPosition: {
    file: string | null;
    line: number | null;
    column: number | null;
  } | null;
}

/**
 * Session statistics
 */
export interface SessionStats {
  /** Total messages count */
  totalMessages: number;
  /** User messages count */
  userMessages: number;
  /** Assistant messages count */
  assistantMessages: number;
  /** Total tokens used */
  totalTokens: number;
  /** Total cost in USD */
  totalCostUsd: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Number of tool calls */
  toolCallsCount: number;
  /** Number of attachments */
  attachmentsCount: number;
  /** Number of participants */
  participantsCount: number;
  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * Session interface
 */
export interface Session {
  /** Unique session ID */
  id: string;
  /** Project ID */
  projectId: string;
  /** Project name */
  projectName: string;
  /** Session title */
  title: string;
  /** Session description */
  description: string | null;
  /** Session owner user ID */
  ownerId: string;
  /** Owner name */
  ownerName: string;
  /** Session status */
  status: SessionStatus;
  /** AI model being used */
  model: string;
  /** System prompt */
  systemPrompt: string | null;
  /** Session creation timestamp */
  createdAt: Date;
  /** Session start timestamp */
  startedAt: Date | null;
  /** Session end timestamp */
  endedAt: Date | null;
  /** Last update timestamp */
  updatedAt: Date;
  /** Last activity timestamp */
  lastActivityAt: Date | null;
  /** Session statistics */
  stats: SessionStats;
  /** Session tags */
  tags: string[];
  /** Is recording enabled */
  isRecording: boolean;
  /** Recording IDs */
  recordingIds: string[];
  /** Session participants */
  participants: SessionParticipant[];
  /** Session settings */
  settings: {
    /** Temperature (0-2) */
    temperature: number;
    /** Top-p (0-1) */
    topP: number;
    /** Max tokens */
    maxTokens: number;
    /** Enable streaming */
    streaming: boolean;
    /** Enable tool use */
    enableToolUse: boolean;
    /** Enabled tools */
    enabledTools: string[];
  };
  /** Shared with users */
  sharedWith: string[];
  /** Is public session */
  isPublic: boolean;
}

/**
 * Session creation payload
 */
export interface CreateSessionPayload {
  projectId: string;
  title: string;
  description?: string;
  model: string;
  systemPrompt?: string;
  tags?: string[];
  settings?: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    streaming?: boolean;
    enableToolUse?: boolean;
    enabledTools?: string[];
  };
  isRecording?: boolean;
}

/**
 * Session update payload
 */
export interface UpdateSessionPayload {
  title?: string;
  description?: string;
  status?: SessionStatus;
  systemPrompt?: string;
  tags?: string[];
  settings?: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    streaming?: boolean;
    enableToolUse?: boolean;
    enabledTools?: string[];
  };
  isRecording?: boolean;
}

/**
 * Message creation payload
 */
export interface CreateMessagePayload {
  sessionId: string;
  role: MessageRole;
  content: string;
  parentMessageId?: string;
  attachments?: {
    type: AttachmentType;
    fileName: string;
    fileUrl: string;
    fileSizeBytes: number;
    mimeType: string;
  }[];
}

/**
 * Session summary (for lists)
 */
export interface SessionSummary {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  ownerName: string;
  status: SessionStatus;
  model: string;
  createdAt: Date;
  lastActivityAt: Date | null;
  stats: {
    totalMessages: number;
    totalTokens: number;
    durationMs: number;
    participantsCount: number;
  };
  tags: string[];
  isRecording: boolean;
}
