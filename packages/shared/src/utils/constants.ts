/**
 * Shared constants across the application
 */

import { SubscriptionTier } from '../types/user';

/**
 * API version
 */
export const API_VERSION = 'v1';

/**
 * Application name
 */
export const APP_NAME = 'RemoteDevAI';

/**
 * Maximum file size for uploads (in bytes)
 * Default: 100 MB
 */
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Maximum file sizes by type (in bytes)
 */
export const MAX_FILE_SIZES = {
  IMAGE: 10 * 1024 * 1024,      // 10 MB
  VIDEO: 500 * 1024 * 1024,     // 500 MB
  AUDIO: 50 * 1024 * 1024,      // 50 MB
  DOCUMENT: 50 * 1024 * 1024,   // 50 MB
  CODE: 5 * 1024 * 1024,        // 5 MB
  OTHER: 100 * 1024 * 1024      // 100 MB
};

/**
 * Supported programming languages
 */
export const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'csharp',
  'cpp',
  'go',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'scala',
  'r',
  'sql',
  'html',
  'css',
  'json',
  'yaml',
  'markdown',
  'shell',
  'dockerfile',
  'terraform'
] as const;

/**
 * Supported file extensions for code files
 */
export const CODE_FILE_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx',
  '.py', '.pyw',
  '.java',
  '.cs',
  '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp',
  '.go',
  '.rs',
  '.rb',
  '.php',
  '.swift',
  '.kt', '.kts',
  '.scala',
  '.r',
  '.sql',
  '.html', '.htm',
  '.css', '.scss', '.sass', '.less',
  '.json',
  '.yaml', '.yml',
  '.md', '.mdx',
  '.sh', '.bash', '.zsh',
  '.dockerfile',
  '.tf', '.tfvars'
];

/**
 * Supported image file extensions
 */
export const IMAGE_FILE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'
];

/**
 * Supported video file extensions
 */
export const VIDEO_FILE_EXTENSIONS = [
  '.mp4', '.webm', '.mkv', '.avi', '.mov', '.wmv', '.flv'
];

/**
 * Supported audio file extensions
 */
export const AUDIO_FILE_EXTENSIONS = [
  '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'
];

/**
 * Supported document file extensions
 */
export const DOCUMENT_FILE_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'
];

/**
 * AI model configurations
 */
export const AI_MODELS = {
  GPT4: {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    contextWindow: 8192,
    maxTokens: 4096,
    costPer1kPromptTokens: 0.03,
    costPer1kCompletionTokens: 0.06
  },
  GPT4_TURBO: {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    maxTokens: 4096,
    costPer1kPromptTokens: 0.01,
    costPer1kCompletionTokens: 0.03
  },
  GPT35_TURBO: {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextWindow: 16385,
    maxTokens: 4096,
    costPer1kPromptTokens: 0.0005,
    costPer1kCompletionTokens: 0.0015
  },
  CLAUDE_3_OPUS: {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextWindow: 200000,
    maxTokens: 4096,
    costPer1kPromptTokens: 0.015,
    costPer1kCompletionTokens: 0.075
  },
  CLAUDE_3_SONNET: {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    maxTokens: 4096,
    costPer1kPromptTokens: 0.003,
    costPer1kCompletionTokens: 0.015
  },
  CLAUDE_3_HAIKU: {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    contextWindow: 200000,
    maxTokens: 4096,
    costPer1kPromptTokens: 0.00025,
    costPer1kCompletionTokens: 0.00125
  }
} as const;

/**
 * Default AI model
 */
export const DEFAULT_AI_MODEL = AI_MODELS.GPT4_TURBO.id;

/**
 * Subscription tier limits
 */
export const SUBSCRIPTION_LIMITS = {
  [SubscriptionTier.FREE]: {
    maxProjects: 3,
    maxSessionsPerMonth: 50,
    maxStorageGB: 5,
    maxRecordingMinutes: 100,
    maxTeamMembers: 1,
    hasPrioritySupport: false,
    hasAdvancedAnalytics: false,
    hasCustomBranding: false,
    allowedModels: [AI_MODELS.GPT35_TURBO.id, AI_MODELS.CLAUDE_3_HAIKU.id]
  },
  [SubscriptionTier.PRO]: {
    maxProjects: 20,
    maxSessionsPerMonth: 500,
    maxStorageGB: 100,
    maxRecordingMinutes: 1000,
    maxTeamMembers: 5,
    hasPrioritySupport: true,
    hasAdvancedAnalytics: true,
    hasCustomBranding: false,
    allowedModels: Object.values(AI_MODELS).map(m => m.id)
  },
  [SubscriptionTier.TEAM]: {
    maxProjects: -1, // Unlimited
    maxSessionsPerMonth: -1, // Unlimited
    maxStorageGB: 500,
    maxRecordingMinutes: -1, // Unlimited
    maxTeamMembers: 50,
    hasPrioritySupport: true,
    hasAdvancedAnalytics: true,
    hasCustomBranding: true,
    allowedModels: Object.values(AI_MODELS).map(m => m.id)
  }
} as const;

/**
 * Session timeouts (in milliseconds)
 */
export const SESSION_TIMEOUTS = {
  IDLE: 30 * 60 * 1000,           // 30 minutes
  MAX_DURATION: 8 * 60 * 60 * 1000, // 8 hours
  WARNING: 5 * 60 * 1000           // 5 minutes before timeout
} as const;

/**
 * Recording quality presets
 */
export const RECORDING_QUALITY_PRESETS = {
  LOW: {
    width: 1280,
    height: 720,
    frameRate: 15,
    videoBitrate: 500,  // kbps
    audioBitrate: 64    // kbps
  },
  MEDIUM: {
    width: 1920,
    height: 1080,
    frameRate: 30,
    videoBitrate: 1500, // kbps
    audioBitrate: 128   // kbps
  },
  HIGH: {
    width: 1920,
    height: 1080,
    frameRate: 60,
    videoBitrate: 4000, // kbps
    audioBitrate: 192   // kbps
  },
  ULTRA: {
    width: 2560,
    height: 1440,
    frameRate: 60,
    videoBitrate: 8000, // kbps
    audioBitrate: 256   // kbps
  }
} as const;

/**
 * WebSocket event prefixes
 */
export const SOCKET_EVENT_PREFIXES = {
  SESSION: 'session:',
  PROJECT: 'project:',
  AGENT: 'agent:',
  RECORDING: 'recording:',
  MESSAGE: 'message:',
  USER: 'user:'
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100
} as const;

/**
 * Date formats
 */
export const DATE_FORMATS = {
  SHORT: 'MM/DD/YYYY',
  LONG: 'MMMM DD, YYYY',
  TIME: 'HH:mm',
  DATETIME: 'MM/DD/YYYY HH:mm',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
} as const;

/**
 * Regular expressions
 */
export const REGEX = {
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  PHONE: /^\+[1-9]\d{1,14}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,30}$/
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  UNAUTHORIZED: 'UNAUTHORIZED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',

  // Permission errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',

  // External service errors
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  AI_MODEL_ERROR: 'AI_MODEL_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR'
} as const;

/**
 * Cache TTL values (in seconds)
 */
export const CACHE_TTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 3600,          // 1 hour
  DAY: 86400,          // 24 hours
  WEEK: 604800         // 7 days
} as const;
