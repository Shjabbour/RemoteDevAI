/**
 * RemoteDevAI Shared Package
 *
 * Shared TypeScript types, utilities, and schemas used across all apps
 */

// Types
export * from './types/user';
export * from './types/project';
export * from './types/session';
export * from './types/recording';
export * from './types/agent';
export * from './types/socket';
export * from './types/api';
export * from './types/mcp';

// Schemas
export * from './schemas/userSchema';
export * from './schemas/projectSchema';
export * from './schemas/sessionSchema';
export * from './schemas/messageSchema';

// Utilities
export * from './utils/validation';
export * from './utils/formatting';
export * from './utils/constants';
export * from './utils/errors';

// API Versions
export * as ApiV1 from './api/v1';
export * as ApiV2 from './api/v2';
