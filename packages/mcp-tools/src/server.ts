/**
 * MCP Server Implementation
 * Registers and handles all tool requests
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Import tools
import {
  captureScreenshot,
  captureRegion,
  listDisplays,
  captureAllDisplays,
} from './tools/screenCapture.js';

import {
  startRecording,
  stopRecording,
  getRecordingStatus,
  cancelRecording,
} from './tools/screenRecord.js';

import {
  openBrowser,
  clickElement,
  typeText,
  takeScreenshot,
  recordBrowser,
  closeBrowserTool,
  navigate,
  getPageContent,
  executeJavaScript,
  fillFormFields,
  getElementTextContent,
} from './tools/browserAutomation.js';

import {
  captureTerminal,
  recordTerminal,
  getTerminalOutput,
  stopTerminalRecording,
  listTerminalSessions,
} from './tools/terminalCapture.js';

import {
  previewFile,
  previewDiff,
  previewDirectory,
  getFileMetadata,
} from './tools/filePreview.js';

import {
  sendNotification,
  sendProgress,
  requestFeedback,
  cancelFeedbackRequest,
  sendWebhook,
  sendBatchNotifications,
} from './tools/notification.js';

import {
  compressVideo,
  createThumbnail,
  trimVideo,
  addTimestamp,
  convertVideoFormat,
  mergeVideos,
  extractVideoAudio,
  getVideoInfo,
} from './tools/videoTools.js';

import {
  runCode,
  runTests,
  runBuild,
  getOutput,
  installDeps,
  lintCode,
  formatCode,
  checkRuntime,
  typeCheck,
} from './tools/codeRunner.js';

import {
  CaptureScreenshotSchema,
  CaptureRegionSchema,
  StartRecordingSchema,
  OpenBrowserSchema,
  ClickElementSchema,
  TypeTextSchema,
  TakeScreenshotSchema,
  RecordBrowserSchema,
  CaptureTerminalSchema,
  RecordTerminalSchema,
  GetTerminalOutputSchema,
  PreviewFileSchema,
  PreviewDiffSchema,
  PreviewDirectorySchema,
  SendNotificationSchema,
  SendProgressSchema,
  RequestFeedbackSchema,
  CompressVideoSchema,
  CreateThumbnailSchema,
  TrimVideoSchema,
  AddTimestampSchema,
  RunCodeSchema,
  RunTestsSchema,
  RunBuildSchema,
} from './types.js';

/**
 * Define all available tools
 */
const tools: Tool[] = [
  // Screen Capture Tools
  {
    name: 'capture_screenshot',
    description: 'Capture screenshot of entire screen or specific display',
    inputSchema: {
      type: 'object',
      properties: {
        display: { type: 'number', description: 'Display number (0 for primary)' },
        format: { type: 'string', enum: ['png', 'jpeg', 'webp'], default: 'png' },
        quality: { type: 'number', minimum: 1, maximum: 100, default: 90 },
        region: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            width: { type: 'number' },
            height: { type: 'number' },
          },
        },
      },
    },
  },
  {
    name: 'capture_region',
    description: 'Capture specific region of the screen',
    inputSchema: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X coordinate' },
        y: { type: 'number', description: 'Y coordinate' },
        width: { type: 'number', description: 'Width' },
        height: { type: 'number', description: 'Height' },
        format: { type: 'string', enum: ['png', 'jpeg', 'webp'], default: 'png' },
        quality: { type: 'number', minimum: 1, maximum: 100, default: 90 },
      },
      required: ['x', 'y', 'width', 'height'],
    },
  },
  {
    name: 'list_displays',
    description: 'List all available displays',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // Screen Recording Tools
  {
    name: 'start_recording',
    description: 'Start screen recording',
    inputSchema: {
      type: 'object',
      properties: {
        display: { type: 'number', description: 'Display number' },
        fps: { type: 'number', minimum: 1, maximum: 60, default: 30 },
        quality: { type: 'string', enum: ['low', 'medium', 'high', 'ultra'], default: 'high' },
        region: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            width: { type: 'number' },
            height: { type: 'number' },
          },
        },
        audio: { type: 'boolean', default: false },
        maxDuration: { type: 'number', description: 'Max duration in seconds' },
      },
    },
  },
  {
    name: 'stop_recording',
    description: 'Stop current screen recording',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_recording_status',
    description: 'Get status of current recording',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // Browser Automation Tools
  {
    name: 'open_browser',
    description: 'Open browser and navigate to URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', format: 'uri' },
        browser: { type: 'string', enum: ['chromium', 'firefox', 'webkit'], default: 'chromium' },
        headless: { type: 'boolean', default: true },
        viewport: {
          type: 'object',
          properties: {
            width: { type: 'number', default: 1920 },
            height: { type: 'number', default: 1080 },
          },
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'click_element',
    description: 'Click element in browser',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector' },
        button: { type: 'string', enum: ['left', 'right', 'middle'], default: 'left' },
        clickCount: { type: 'number', default: 1 },
        timeout: { type: 'number', default: 30000 },
      },
      required: ['selector'],
    },
  },
  {
    name: 'type_text',
    description: 'Type text into element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector' },
        text: { type: 'string' },
        delay: { type: 'number', default: 0 },
        clear: { type: 'boolean', default: false },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'take_browser_screenshot',
    description: 'Take screenshot of browser page',
    inputSchema: {
      type: 'object',
      properties: {
        fullPage: { type: 'boolean', default: false },
        selector: { type: 'string', description: 'Element selector to screenshot' },
        format: { type: 'string', enum: ['png', 'jpeg'], default: 'png' },
        quality: { type: 'number', minimum: 0, maximum: 100 },
      },
    },
  },
  {
    name: 'close_browser',
    description: 'Close browser',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // Terminal Capture Tools
  {
    name: 'capture_terminal',
    description: 'Capture terminal screenshot or output',
    inputSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['png', 'jpeg', 'text'], default: 'png' },
        includePrompt: { type: 'boolean', default: true },
      },
    },
  },
  {
    name: 'get_terminal_output',
    description: 'Get recent terminal output',
    inputSchema: {
      type: 'object',
      properties: {
        lines: { type: 'number', default: 100 },
        format: { type: 'string', enum: ['text', 'json', 'html'], default: 'text' },
      },
    },
  },

  // File Preview Tools
  {
    name: 'preview_file',
    description: 'Preview file (image, text, or code)',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path' },
        format: { type: 'string', enum: ['image', 'text', 'base64'], default: 'image' },
        maxLines: { type: 'number', description: 'Max lines for text files' },
      },
      required: ['path'],
    },
  },
  {
    name: 'preview_directory',
    description: 'Preview directory structure',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path' },
        depth: { type: 'number', default: 3 },
        includeHidden: { type: 'boolean', default: false },
      },
      required: ['path'],
    },
  },

  // Notification Tools
  {
    name: 'send_notification',
    description: 'Send push notification',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        message: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'normal', 'high'], default: 'normal' },
        sound: { type: 'boolean', default: true },
      },
      required: ['title', 'message'],
    },
  },
  {
    name: 'send_progress',
    description: 'Send progress update notification',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        progress: { type: 'number', minimum: 0, maximum: 100 },
        message: { type: 'string' },
        status: { type: 'string', enum: ['running', 'completed', 'failed'], default: 'running' },
      },
      required: ['taskId', 'progress'],
    },
  },

  // Video Tools
  {
    name: 'compress_video',
    description: 'Compress video file',
    inputSchema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string' },
        outputPath: { type: 'string' },
        quality: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
        resolution: { type: 'string', description: 'e.g., "1280x720"' },
        targetSize: { type: 'number', description: 'Target size in MB' },
      },
      required: ['inputPath'],
    },
  },
  {
    name: 'create_thumbnail',
    description: 'Create thumbnail from video',
    inputSchema: {
      type: 'object',
      properties: {
        videoPath: { type: 'string' },
        timestamp: { type: 'number', default: 0 },
        format: { type: 'string', enum: ['png', 'jpeg'], default: 'jpeg' },
        width: { type: 'number' },
        height: { type: 'number' },
      },
      required: ['videoPath'],
    },
  },

  // Code Runner Tools
  {
    name: 'run_code',
    description: 'Execute code in sandbox',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string' },
        language: { type: 'string', enum: ['javascript', 'typescript', 'python', 'bash'] },
        timeout: { type: 'number', default: 30000 },
        sandbox: { type: 'boolean', default: true },
        env: { type: 'object', additionalProperties: { type: 'string' } },
      },
      required: ['code', 'language'],
    },
  },
  {
    name: 'run_tests',
    description: 'Run test suite',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        framework: { type: 'string', enum: ['jest', 'mocha', 'pytest', 'vitest'] },
        coverage: { type: 'boolean', default: false },
        watch: { type: 'boolean', default: false },
      },
      required: ['path'],
    },
  },
  {
    name: 'run_build',
    description: 'Run build command',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', default: 'npm run build' },
        cwd: { type: 'string' },
        env: { type: 'object', additionalProperties: { type: 'string' } },
      },
    },
  },
];

/**
 * Tool handler mapping
 */
const toolHandlers: Record<string, (args: any) => Promise<any>> = {
  // Screen Capture
  capture_screenshot: captureScreenshot,
  capture_region: captureRegion,
  list_displays: listDisplays,

  // Screen Recording
  start_recording: startRecording,
  stop_recording: stopRecording,
  get_recording_status: getRecordingStatus,

  // Browser Automation
  open_browser: openBrowser,
  click_element: clickElement,
  type_text: typeText,
  take_browser_screenshot: takeScreenshot,
  close_browser: closeBrowserTool,

  // Terminal Capture
  capture_terminal: captureTerminal,
  get_terminal_output: getTerminalOutput,

  // File Preview
  preview_file: previewFile,
  preview_directory: previewDirectory,

  // Notifications
  send_notification: sendNotification,
  send_progress: sendProgress,

  // Video Tools
  compress_video: compressVideo,
  create_thumbnail: createThumbnail,

  // Code Runner
  run_code: runCode,
  run_tests: runTests,
  run_build: runBuild,
};

/**
 * Create and start MCP server
 */
export async function startMCPServer() {
  const server = new Server(
    {
      name: 'RemoteDevAI MCP Tools',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools,
    };
  });

  // Handle call tool request
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    console.error(`[MCP] Tool called: ${name}`);

    const handler = toolHandlers[name];

    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const result = await handler(args || {});

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`[MCP] Tool error:`, error);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              message: 'Tool execution failed',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[MCP] Server started');

  return server;
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMCPServer().catch((error) => {
    console.error('[MCP] Server error:', error);
    process.exit(1);
  });
}
