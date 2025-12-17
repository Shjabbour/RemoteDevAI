import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Middleware to validate request body against a Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Invalid request body',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
};

/**
 * Middleware to validate query parameters against a Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Invalid query parameters',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
};

/**
 * Middleware to validate route parameters against a Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: 'Invalid route parameters',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
};

// Common validation schemas
export const schemas = {
  // ID parameter
  id: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  // Pagination query
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
  }),

  // Email
  email: z.string().email('Invalid email address'),

  // Password (minimum 8 characters)
  password: z.string().min(8, 'Password must be at least 8 characters'),

  // Project creation
  createProject: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    settings: z.record(z.any()).optional(),
  }),

  // Project update
  updateProject: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    settings: z.record(z.any()).optional(),
    isActive: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  }),

  // User registration
  register: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(1).max(100).optional(),
  }),

  // User login
  login: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),

  // User profile update
  updateProfile: z.object({
    name: z.string().min(1).max(100).optional(),
    avatarUrl: z.string().url('Invalid URL').optional(),
  }),

  // Session creation
  createSession: z.object({
    projectId: z.string().uuid('Invalid project ID'),
    title: z.string().max(100).optional(),
  }),

  // Session update
  updateSession: z.object({
    title: z.string().max(100).optional(),
    summary: z.string().max(1000).optional(),
    status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
    messages: z.array(z.any()).optional(),
  }),

  // Recording creation
  createRecording: z.object({
    sessionId: z.string().uuid('Invalid session ID'),
    title: z.string().max(100).optional(),
    duration: z.number().int().positive().optional(),
    fileSize: z.number().int().positive().optional(),
    mimeType: z.string().default('video/webm'),
  }),

  // Recording update
  updateRecording: z.object({
    title: z.string().max(100).optional(),
    status: z.enum(['UPLOADING', 'PROCESSING', 'READY', 'FAILED']).optional(),
    url: z.string().url().optional(),
    thumbnailUrl: z.string().url().optional(),
  }),

  // Agent registration
  registerAgent: z.object({
    name: z.string().max(100).optional(),
    version: z.string().max(50).optional(),
    platform: z.string().max(50).optional(),
  }),

  // Relay message
  relayMessage: z.object({
    type: z.string().min(1),
    payload: z.any(),
  }),
};

export default {
  validateBody,
  validateQuery,
  validateParams,
  schemas,
};
