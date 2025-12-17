/**
 * API request and response types
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  /** Success status */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error information */
  error?: ApiError;
  /** Response message */
  message?: string;
  /** Response metadata */
  meta?: {
    /** Request ID for tracking */
    requestId: string;
    /** Response timestamp */
    timestamp: Date;
    /** API version */
    version: string;
  };
}

/**
 * API error
 */
export interface ApiError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Detailed error description */
  details?: string;
  /** Field-specific errors (for validation) */
  fieldErrors?: {
    field: string;
    message: string;
  }[];
  /** Stack trace (development only) */
  stack?: string;
  /** HTTP status code */
  statusCode: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  /** Array of items */
  items: T[];
  /** Pagination metadata */
  pagination: {
    /** Current page number (1-indexed) */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of items */
    total: number;
    /** Total number of pages */
    totalPages: number;
    /** Has next page */
    hasNext: boolean;
    /** Has previous page */
    hasPrev: boolean;
  };
}

/**
 * Pagination query parameters
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search query parameters
 */
export interface SearchParams extends PaginationParams {
  /** Search query */
  q?: string;
  /** Filter by fields */
  filters?: Record<string, any>;
  /** Date range filter */
  dateRange?: {
    field: string;
    start?: Date;
    end?: Date;
  };
}

// User API types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: import('./user').User;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface RegisterResponse {
  user: import('./user').User;
  token: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// Project API types
export interface CreateProjectRequest {
  name: string;
  description?: string;
  icon?: string;
  visibility?: import('./project').ProjectVisibility;
  settings?: Partial<import('./project').ProjectSettings>;
  tags?: string[];
  techStack?: string[];
  repositoryUrl?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  icon?: string;
  visibility?: import('./project').ProjectVisibility;
  status?: import('./project').ProjectStatus;
  settings?: Partial<import('./project').ProjectSettings>;
  tags?: string[];
  techStack?: string[];
}

export interface InviteProjectMemberRequest {
  email: string;
  role: import('./project').ProjectRole;
}

export interface UpdateProjectMemberRequest {
  role: import('./project').ProjectRole;
}

export interface ListProjectsParams extends PaginationParams {
  status?: import('./project').ProjectStatus;
  visibility?: import('./project').ProjectVisibility;
  tags?: string[];
}

// Session API types
export interface CreateSessionRequest {
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

export interface UpdateSessionRequest {
  title?: string;
  description?: string;
  status?: import('./session').SessionStatus;
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
}

export interface SendMessageRequest {
  content: string;
  parentMessageId?: string;
  attachments?: {
    type: import('./session').AttachmentType;
    fileName: string;
    fileUrl: string;
    fileSizeBytes: number;
    mimeType: string;
  }[];
}

export interface ListSessionsParams extends PaginationParams {
  projectId?: string;
  status?: import('./session').SessionStatus;
  model?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Recording API types
export interface CreateRecordingRequest {
  sessionId: string;
  name: string;
  description?: string;
  type: import('./recording').RecordingType;
  quality?: import('./recording').VideoQuality;
  format?: import('./recording').RecordingFormat;
  tags?: string[];
}

export interface UpdateRecordingRequest {
  name?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  isDownloadable?: boolean;
}

export interface AddAnnotationRequest {
  timestampMs: number;
  text: string;
  type: 'comment' | 'highlight' | 'issue' | 'question';
  position?: {
    x: number;
    y: number;
  };
}

export interface ListRecordingsParams extends PaginationParams {
  sessionId?: string;
  projectId?: string;
  type?: import('./recording').RecordingType;
  status?: import('./recording').RecordingStatus;
  tags?: string[];
}

// Agent API types
export interface ExecuteAgentRequest {
  agentType: import('./agent').AgentType;
  prompt: string;
  sessionId: string;
  configOverrides?: Partial<import('./agent').AgentConfig>;
  streaming?: boolean;
}

export interface ListAgentExecutionsParams extends PaginationParams {
  sessionId?: string;
  agentType?: import('./agent').AgentType;
  status?: import('./agent').AgentStatus;
}

// Analytics API types
export interface AnalyticsParams {
  /** Time range */
  timeRange: {
    start: Date;
    end: Date;
  };
  /** Granularity (hour, day, week, month) */
  granularity?: 'hour' | 'day' | 'week' | 'month';
  /** Project filter */
  projectId?: string;
  /** User filter */
  userId?: string;
}

export interface UsageAnalytics {
  /** Time period */
  period: {
    start: Date;
    end: Date;
  };
  /** Total sessions */
  totalSessions: number;
  /** Total messages */
  totalMessages: number;
  /** Total tokens used */
  totalTokens: number;
  /** Total cost in USD */
  totalCostUsd: number;
  /** Total recording time in minutes */
  totalRecordingMinutes: number;
  /** Total storage used in bytes */
  totalStorageBytes: number;
  /** Daily breakdown */
  dailyBreakdown: {
    date: Date;
    sessions: number;
    messages: number;
    tokens: number;
    costUsd: number;
  }[];
  /** Agent usage */
  agentUsage: {
    agentType: import('./agent').AgentType;
    executions: number;
    successRate: number;
    averageDurationMs: number;
    totalTokens: number;
  }[];
  /** Model usage */
  modelUsage: {
    model: string;
    requests: number;
    tokens: number;
    costUsd: number;
  }[];
}

// File upload types
export interface FileUploadRequest {
  file: File | Blob;
  fileName: string;
  mimeType: string;
  metadata?: Record<string, any>;
}

export interface FileUploadResponse {
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface PresignedUrlRequest {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  fileId: string;
  expiresIn: number;
}

// Webhook types
export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  signature: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  url: string;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttemptAt: Date | null;
  nextRetryAt: Date | null;
  response: {
    statusCode: number;
    body: string;
  } | null;
}
