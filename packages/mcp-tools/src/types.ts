/**
 * Type definitions for MCP Tools
 */

import { z } from 'zod';

// ============================================================================
// Common Types
// ============================================================================

export interface ToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ImageData {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
}

export interface VideoData {
  path: string;
  duration: number;
  size: number;
  format: string;
  resolution: {
    width: number;
    height: number;
  };
  fps: number;
}

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// Screen Capture Types
// ============================================================================

export const CaptureScreenshotSchema = z.object({
  display: z.number().optional().describe('Display number (0 for primary)'),
  format: z.enum(['png', 'jpeg', 'webp']).default('png'),
  quality: z.number().min(1).max(100).default(90),
  region: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),
});

export type CaptureScreenshotParams = z.infer<typeof CaptureScreenshotSchema>;

export const CaptureRegionSchema = z.object({
  x: z.number().describe('X coordinate of top-left corner'),
  y: z.number().describe('Y coordinate of top-left corner'),
  width: z.number().describe('Width of region'),
  height: z.number().describe('Height of region'),
  format: z.enum(['png', 'jpeg', 'webp']).default('png'),
  quality: z.number().min(1).max(100).default(90),
});

export type CaptureRegionParams = z.infer<typeof CaptureRegionSchema>;

// ============================================================================
// Screen Recording Types
// ============================================================================

export const StartRecordingSchema = z.object({
  display: z.number().optional().describe('Display number'),
  fps: z.number().min(1).max(60).default(30),
  quality: z.enum(['low', 'medium', 'high', 'ultra']).default('high'),
  region: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }).optional(),
  audio: z.boolean().default(false),
  maxDuration: z.number().max(600).optional().describe('Max duration in seconds'),
});

export type StartRecordingParams = z.infer<typeof StartRecordingSchema>;

export interface RecordingStatus {
  isRecording: boolean;
  duration: number;
  startTime?: Date;
  outputPath?: string;
}

// ============================================================================
// Browser Automation Types
// ============================================================================

export const OpenBrowserSchema = z.object({
  url: z.string().url(),
  browser: z.enum(['chromium', 'firefox', 'webkit']).default('chromium'),
  headless: z.boolean().default(true),
  viewport: z.object({
    width: z.number().default(1920),
    height: z.number().default(1080),
  }).optional(),
});

export type OpenBrowserParams = z.infer<typeof OpenBrowserSchema>;

export const ClickElementSchema = z.object({
  selector: z.string().describe('CSS selector'),
  button: z.enum(['left', 'right', 'middle']).default('left'),
  clickCount: z.number().default(1),
  timeout: z.number().default(30000),
});

export type ClickElementParams = z.infer<typeof ClickElementSchema>;

export const TypeTextSchema = z.object({
  selector: z.string().describe('CSS selector'),
  text: z.string(),
  delay: z.number().default(0).describe('Delay between keystrokes in ms'),
  clear: z.boolean().default(false).describe('Clear existing text first'),
});

export type TypeTextParams = z.infer<typeof TypeTextSchema>;

export const TakeScreenshotSchema = z.object({
  fullPage: z.boolean().default(false),
  selector: z.string().optional().describe('Selector to screenshot'),
  format: z.enum(['png', 'jpeg']).default('png'),
  quality: z.number().min(0).max(100).optional(),
});

export type TakeScreenshotParams = z.infer<typeof TakeScreenshotSchema>;

export const RecordBrowserSchema = z.object({
  duration: z.number().max(300).describe('Duration in seconds'),
  fps: z.number().min(1).max(60).default(30),
  quality: z.enum(['low', 'medium', 'high']).default('high'),
});

export type RecordBrowserParams = z.infer<typeof RecordBrowserSchema>;

// ============================================================================
// Terminal Capture Types
// ============================================================================

export const CaptureTerminalSchema = z.object({
  format: z.enum(['png', 'jpeg', 'text']).default('png'),
  includePrompt: z.boolean().default(true),
});

export type CaptureTerminalParams = z.infer<typeof CaptureTerminalSchema>;

export const RecordTerminalSchema = z.object({
  duration: z.number().max(300).describe('Duration in seconds'),
  command: z.string().optional().describe('Command to execute and record'),
});

export type RecordTerminalParams = z.infer<typeof RecordTerminalSchema>;

export const GetTerminalOutputSchema = z.object({
  lines: z.number().default(100).describe('Number of recent lines'),
  format: z.enum(['text', 'json', 'html']).default('text'),
});

export type GetTerminalOutputParams = z.infer<typeof GetTerminalOutputSchema>;

// ============================================================================
// File Preview Types
// ============================================================================

export const PreviewFileSchema = z.object({
  path: z.string().describe('File path'),
  format: z.enum(['image', 'text', 'base64']).default('image'),
  maxLines: z.number().optional().describe('Max lines for text files'),
});

export type PreviewFileParams = z.infer<typeof PreviewFileSchema>;

export const PreviewDiffSchema = z.object({
  oldPath: z.string().describe('Original file path'),
  newPath: z.string().describe('Modified file path'),
  format: z.enum(['unified', 'split', 'visual']).default('unified'),
});

export type PreviewDiffParams = z.infer<typeof PreviewDiffSchema>;

export const PreviewDirectorySchema = z.object({
  path: z.string().describe('Directory path'),
  depth: z.number().default(3).describe('Max depth'),
  includeHidden: z.boolean().default(false),
});

export type PreviewDirectoryParams = z.infer<typeof PreviewDirectorySchema>;

// ============================================================================
// Notification Types
// ============================================================================

export const SendNotificationSchema = z.object({
  title: z.string(),
  message: z.string(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  sound: z.boolean().default(true),
  actions: z.array(z.object({
    label: z.string(),
    action: z.string(),
  })).optional(),
});

export type SendNotificationParams = z.infer<typeof SendNotificationSchema>;

export const SendProgressSchema = z.object({
  taskId: z.string(),
  progress: z.number().min(0).max(100),
  message: z.string().optional(),
  status: z.enum(['running', 'completed', 'failed']).default('running'),
});

export type SendProgressParams = z.infer<typeof SendProgressSchema>;

export const RequestFeedbackSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).optional(),
  timeout: z.number().default(60000).describe('Timeout in ms'),
  requireResponse: z.boolean().default(false),
});

export type RequestFeedbackParams = z.infer<typeof RequestFeedbackSchema>;

// ============================================================================
// Video Tools Types
// ============================================================================

export const CompressVideoSchema = z.object({
  inputPath: z.string(),
  outputPath: z.string().optional(),
  quality: z.enum(['low', 'medium', 'high']).default('medium'),
  resolution: z.string().optional().describe('e.g., "1280x720"'),
  targetSize: z.number().optional().describe('Target size in MB'),
});

export type CompressVideoParams = z.infer<typeof CompressVideoSchema>;

export const CreateThumbnailSchema = z.object({
  videoPath: z.string(),
  timestamp: z.number().default(0).describe('Timestamp in seconds'),
  format: z.enum(['png', 'jpeg']).default('jpeg'),
  width: z.number().optional(),
  height: z.number().optional(),
});

export type CreateThumbnailParams = z.infer<typeof CreateThumbnailSchema>;

export const TrimVideoSchema = z.object({
  inputPath: z.string(),
  outputPath: z.string().optional(),
  start: z.number().describe('Start time in seconds'),
  end: z.number().describe('End time in seconds'),
});

export type TrimVideoParams = z.infer<typeof TrimVideoSchema>;

export const AddTimestampSchema = z.object({
  inputPath: z.string(),
  outputPath: z.string().optional(),
  format: z.string().default('HH:mm:ss'),
  position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']).default('top-right'),
});

export type AddTimestampParams = z.infer<typeof AddTimestampSchema>;

// ============================================================================
// Code Runner Types
// ============================================================================

export const RunCodeSchema = z.object({
  code: z.string(),
  language: z.enum(['javascript', 'typescript', 'python', 'bash']),
  timeout: z.number().default(30000).describe('Timeout in ms'),
  sandbox: z.boolean().default(true),
  env: z.record(z.string()).optional().describe('Environment variables'),
});

export type RunCodeParams = z.infer<typeof RunCodeSchema>;

export const RunTestsSchema = z.object({
  path: z.string().describe('Test file or directory path'),
  framework: z.enum(['jest', 'mocha', 'pytest', 'vitest']).optional(),
  coverage: z.boolean().default(false),
  watch: z.boolean().default(false),
});

export type RunTestsParams = z.infer<typeof RunTestsSchema>;

export const RunBuildSchema = z.object({
  command: z.string().default('npm run build'),
  cwd: z.string().optional().describe('Working directory'),
  env: z.record(z.string()).optional(),
});

export type RunBuildParams = z.infer<typeof RunBuildSchema>;

export interface ExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  error?: string;
}

// ============================================================================
// MCP Server Types
// ============================================================================

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  handler: (params: any) => Promise<ToolResponse>;
}

export interface MCPServerConfig {
  name: string;
  version: string;
  tools: MCPTool[];
}
