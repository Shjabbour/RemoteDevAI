/**
 * Core TypeScript types and interfaces for the RemoteDevAI agents package
 */

import { z } from 'zod';

/**
 * Message types that can be passed between agents
 */
export enum MessageType {
  VOICE_INPUT = 'voice_input',
  TEXT_INPUT = 'text_input',
  INTENT_PARSED = 'intent_parsed',
  CODE_REQUEST = 'code_request',
  CODE_RESPONSE = 'code_response',
  FILE_OPERATION = 'file_operation',
  SCREEN_RECORD = 'screen_record',
  VIDEO_PROCESSED = 'video_processed',
  NOTIFICATION = 'notification',
  SECURITY_CHECK = 'security_check',
  SESSION_UPDATE = 'session_update',
  FEEDBACK = 'feedback',
  ERROR = 'error',
  COMMAND = 'command',
}

/**
 * Agent types in the system
 */
export enum AgentType {
  VOICE_TRANSCRIPTION = 'voice_transcription',
  INTENT_PARSER = 'intent_parser',
  CODE_ORCHESTRATOR = 'code_orchestrator',
  FILE_SYSTEM = 'file_system',
  SCREEN_RECORDER = 'screen_recorder',
  VIDEO_PROCESSING = 'video_processing',
  NOTIFICATION = 'notification',
  SECURITY = 'security',
  SESSION_MANAGER = 'session_manager',
  FEEDBACK_LOOP = 'feedback_loop',
}

/**
 * User intent categories
 */
export enum IntentCategory {
  NEW_FEATURE = 'new_feature',
  BUG_FIX = 'bug_fix',
  REFACTOR = 'refactor',
  QUESTION = 'question',
  REVIEW = 'review',
  DEPLOY = 'deploy',
  TEST = 'test',
  DOCUMENTATION = 'documentation',
  OTHER = 'other',
}

/**
 * Session status
 */
export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error',
  COMMAND = 'command',
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Zod schema for agent message validation
 */
export const AgentMessageSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(MessageType),
  source: z.nativeEnum(AgentType),
  target: z.nativeEnum(AgentType).optional(),
  timestamp: z.string().datetime(),
  payload: z.any(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Agent message interface
 */
export interface AgentMessage {
  id: string;
  type: MessageType;
  source: AgentType;
  target?: AgentType;
  timestamp: string;
  payload: any;
  metadata?: Record<string, any>;
}

/**
 * Agent context for processing
 */
export interface AgentContext {
  sessionId: string;
  userId: string;
  projectId: string;
  conversationHistory: ConversationMessage[];
  userPreferences: UserPreferences;
  environment: EnvironmentConfig;
  metadata?: Record<string, any>;
}

/**
 * Conversation message
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Agent response interface
 */
export interface AgentResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: Record<string, any>;
}

/**
 * Session state
 */
export interface SessionState {
  id: string;
  userId: string;
  projectId: string;
  status: SessionStatus;
  startedAt: string;
  lastActivityAt: string;
  endedAt?: string;
  conversationHistory: ConversationMessage[];
  context: Record<string, any>;
  recordings: SessionRecording[];
}

/**
 * Session recording
 */
export interface SessionRecording {
  id: string;
  sessionId: string;
  type: 'screen' | 'terminal' | 'browser' | 'desktop';
  startTime: string;
  endTime?: string;
  duration?: number;
  filePath?: string;
  url?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * User preferences
 */
export interface UserPreferences {
  voiceSettings: {
    language: string;
    accent?: string;
    speakingRate: number;
    pitch: number;
  };
  codeStyle: {
    indentSize: number;
    useTabs: boolean;
    lineWidth: number;
    semicolons: boolean;
  };
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
    quietHours?: {
      start: string;
      end: string;
    };
  };
  recording: {
    autoRecord: boolean;
    quality: 'low' | 'medium' | 'high';
    fps: number;
  };
  aiModel: {
    provider: 'anthropic' | 'openai';
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

/**
 * Environment configuration
 */
export interface EnvironmentConfig {
  nodeEnv: 'development' | 'production' | 'test';
  workspaceRoot: string;
  tempDir: string;
  storageProvider: 's3' | 'gcs' | 'local';
  apiKeys: {
    anthropic?: string;
    openai?: string;
    googleCloud?: string;
  };
}

/**
 * Parsed intent from user input
 */
export interface ParsedIntent {
  category: IntentCategory;
  confidence: number;
  entities: {
    files?: string[];
    functions?: string[];
    classes?: string[];
    variables?: string[];
    packages?: string[];
    technologies?: string[];
  };
  summary: string;
  detailedRequest: string;
  suggestedActions: string[];
}

/**
 * File operation types
 */
export enum FileOperationType {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  MOVE = 'move',
  COPY = 'copy',
  CREATE_DIR = 'create_dir',
  LIST = 'list',
}

/**
 * File operation request
 */
export interface FileOperation {
  type: FileOperationType;
  path: string;
  content?: string;
  destinationPath?: string;
  options?: {
    createBackup?: boolean;
    encoding?: string;
    recursive?: boolean;
  };
}

/**
 * Git operation types
 */
export enum GitOperationType {
  STATUS = 'status',
  DIFF = 'diff',
  ADD = 'add',
  COMMIT = 'commit',
  PUSH = 'push',
  PULL = 'pull',
  BRANCH = 'branch',
  CHECKOUT = 'checkout',
  LOG = 'log',
}

/**
 * Git operation request
 */
export interface GitOperation {
  type: GitOperationType;
  options?: Record<string, any>;
}

/**
 * Screen recording configuration
 */
export interface ScreenRecordingConfig {
  type: 'browser' | 'terminal' | 'desktop';
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  fps: number;
  quality: 'low' | 'medium' | 'high';
  audioEnabled: boolean;
}

/**
 * Video processing options
 */
export interface VideoProcessingOptions {
  compress: boolean;
  compressionQuality?: number;
  generateThumbnail: boolean;
  thumbnailTimestamp?: number;
  uploadToCloud: boolean;
  generateStreamingUrl: boolean;
}

/**
 * Notification payload
 */
export interface NotificationPayload {
  title: string;
  message: string;
  priority: NotificationPriority;
  channels: ('email' | 'push' | 'inApp')[];
  data?: Record<string, any>;
  actionUrl?: string;
}

/**
 * Security check result
 */
export interface SecurityCheckResult {
  passed: boolean;
  checks: {
    authentication: boolean;
    authorization: boolean;
    rateLimiting: boolean;
    inputValidation: boolean;
    sandboxing: boolean;
  };
  violations?: string[];
  risk: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Feedback data
 */
export interface FeedbackData {
  sessionId: string;
  messageId?: string;
  videoTimestamp?: number;
  type: 'correction' | 'approval' | 'suggestion';
  content: string;
  rating?: number;
  metadata?: Record<string, any>;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  name: string;
  type: AgentType;
  enabled: boolean;
  retryAttempts: number;
  timeout: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  metadata?: Record<string, any>;
}

/**
 * Agent event types
 */
export enum AgentEvent {
  INITIALIZED = 'initialized',
  PROCESSING_START = 'processing_start',
  PROCESSING_COMPLETE = 'processing_complete',
  PROCESSING_ERROR = 'processing_error',
  MESSAGE_RECEIVED = 'message_received',
  MESSAGE_SENT = 'message_sent',
  STATE_CHANGED = 'state_changed',
}

/**
 * Event payload interface
 */
export interface EventPayload {
  agentType: AgentType;
  event: AgentEvent;
  data: any;
  timestamp: string;
}
