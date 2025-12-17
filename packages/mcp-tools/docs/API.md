# MCP Tools API Documentation

Complete API reference for all available tools.

## Table of Contents

- [Screen Capture](#screen-capture)
- [Screen Recording](#screen-recording)
- [Browser Automation](#browser-automation)
- [Terminal Capture](#terminal-capture)
- [File Preview](#file-preview)
- [Notifications](#notifications)
- [Video Tools](#video-tools)
- [Code Runner](#code-runner)

---

## Screen Capture

### `capture_screenshot`

Capture screenshot of entire screen or specific display.

**Parameters:**
```typescript
{
  display?: number;        // Display number (0 for primary)
  format?: 'png' | 'jpeg' | 'webp';  // Default: 'png'
  quality?: number;        // 1-100, default: 90
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    base64: string;
    mimeType: string;
    width: number;
    height: number;
    size: number;
  };
  message?: string;
}
```

**Example:**
```typescript
const result = await captureScreenshot({
  display: 0,
  format: 'png',
  quality: 90
});
```

### `capture_region`

Capture specific region of the screen.

**Parameters:**
```typescript
{
  x: number;              // X coordinate
  y: number;              // Y coordinate
  width: number;          // Width
  height: number;         // Height
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
}
```

**Example:**
```typescript
const result = await captureRegion({
  x: 100,
  y: 100,
  width: 800,
  height: 600,
  format: 'jpeg'
});
```

### `list_displays`

List all available displays.

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    count: number;
    displays: number[];
  };
}
```

---

## Screen Recording

### `start_recording`

Start screen recording.

**Parameters:**
```typescript
{
  display?: number;
  fps?: number;           // 1-60, default: 30
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  audio?: boolean;        // Default: false
  maxDuration?: number;   // Max duration in seconds
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    recordingId: string;
    outputPath: string;
  };
}
```

**Example:**
```typescript
const result = await startRecording({
  fps: 30,
  quality: 'high',
  audio: false,
  maxDuration: 300
});
```

### `stop_recording`

Stop current screen recording.

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    path: string;
    duration: number;
    size: number;
    format: string;
    resolution: { width: number; height: number };
    fps: number;
  };
}
```

### `get_recording_status`

Get status of current recording.

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    isRecording: boolean;
    duration: number;
    startTime?: Date;
    outputPath?: string;
  };
}
```

---

## Browser Automation

### `open_browser`

Open browser and navigate to URL.

**Parameters:**
```typescript
{
  url: string;
  browser?: 'chromium' | 'firefox' | 'webkit';  // Default: 'chromium'
  headless?: boolean;     // Default: true
  viewport?: {
    width: number;        // Default: 1920
    height: number;       // Default: 1080
  };
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    url: string;
    title: string;
  };
}
```

**Example:**
```typescript
await openBrowser({
  url: 'https://example.com',
  browser: 'chromium',
  headless: false,
  viewport: { width: 1920, height: 1080 }
});
```

### `click_element`

Click element in browser.

**Parameters:**
```typescript
{
  selector: string;       // CSS selector
  button?: 'left' | 'right' | 'middle';  // Default: 'left'
  clickCount?: number;    // Default: 1
  timeout?: number;       // Default: 30000
}
```

**Example:**
```typescript
await clickElement({
  selector: 'button.submit',
  button: 'left',
  clickCount: 1
});
```

### `type_text`

Type text into element.

**Parameters:**
```typescript
{
  selector: string;
  text: string;
  delay?: number;         // Delay between keystrokes in ms
  clear?: boolean;        // Clear existing text first
}
```

**Example:**
```typescript
await typeText({
  selector: 'input[name="email"]',
  text: 'user@example.com',
  delay: 50,
  clear: true
});
```

### `take_browser_screenshot`

Take screenshot of browser page.

**Parameters:**
```typescript
{
  fullPage?: boolean;     // Default: false
  selector?: string;      // Element selector to screenshot
  format?: 'png' | 'jpeg';
  quality?: number;       // 0-100, for JPEG only
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    base64: string;
    mimeType: string;
    width: number;
    height: number;
    size: number;
  };
}
```

### `close_browser`

Close browser.

---

## Terminal Capture

### `capture_terminal`

Capture terminal screenshot or output.

**Parameters:**
```typescript
{
  format?: 'png' | 'jpeg' | 'text';  // Default: 'png'
  includePrompt?: boolean;           // Default: true
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: ImageData;
}
```

### `record_terminal`

Record terminal session.

**Parameters:**
```typescript
{
  duration: number;       // Duration in seconds
  command?: string;       // Command to execute and record
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    sessionId: string;
    outputPath: string;
  };
}
```

### `get_terminal_output`

Get recent terminal output.

**Parameters:**
```typescript
{
  lines?: number;         // Default: 100
  format?: 'text' | 'json' | 'html';  // Default: 'text'
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: string | object;
}
```

---

## File Preview

### `preview_file`

Preview file (image, text, or code).

**Parameters:**
```typescript
{
  path: string;
  format?: 'image' | 'text' | 'base64';
  maxLines?: number;      // For text files
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: ImageData | string;
}
```

### `preview_directory`

Preview directory structure.

**Parameters:**
```typescript
{
  path: string;
  depth?: number;         // Default: 3
  includeHidden?: boolean;  // Default: false
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: string;          // Tree representation
}
```

### `preview_diff`

Preview diff between two files.

**Parameters:**
```typescript
{
  oldPath: string;
  newPath: string;
  format?: 'unified' | 'split' | 'visual';
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: string;          // Diff output
}
```

---

## Notifications

### `send_notification`

Send push notification.

**Parameters:**
```typescript
{
  title: string;
  message: string;
  priority?: 'low' | 'normal' | 'high';  // Default: 'normal'
  sound?: boolean;        // Default: true
  actions?: Array<{
    label: string;
    action: string;
  }>;
}
```

**Example:**
```typescript
await sendNotification({
  title: 'Build Complete',
  message: 'Your project has been built successfully',
  priority: 'normal',
  sound: true
});
```

### `send_progress`

Send progress update notification.

**Parameters:**
```typescript
{
  taskId: string;
  progress: number;       // 0-100
  message?: string;
  status?: 'running' | 'completed' | 'failed';
}
```

**Example:**
```typescript
await sendProgress({
  taskId: 'build-123',
  progress: 75,
  message: 'Building project...',
  status: 'running'
});
```

### `request_feedback`

Request feedback from user.

**Parameters:**
```typescript
{
  question: string;
  options?: string[];
  timeout?: number;       // Default: 60000
  requireResponse?: boolean;  // Default: false
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    response: string;
    timestamp: Date;
  };
}
```

---

## Video Tools

### `compress_video`

Compress video file.

**Parameters:**
```typescript
{
  inputPath: string;
  outputPath?: string;
  quality?: 'low' | 'medium' | 'high';
  resolution?: string;    // e.g., "1280x720"
  targetSize?: number;    // Target size in MB
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: VideoData;
}
```

### `create_thumbnail`

Create thumbnail from video.

**Parameters:**
```typescript
{
  videoPath: string;
  timestamp?: number;     // Default: 0
  format?: 'png' | 'jpeg';
  width?: number;
  height?: number;
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: ImageData;
}
```

### `trim_video`

Trim video to specific time range.

**Parameters:**
```typescript
{
  inputPath: string;
  outputPath?: string;
  start: number;          // Start time in seconds
  end: number;            // End time in seconds
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: VideoData;
}
```

### `add_timestamp`

Add timestamp overlay to video.

**Parameters:**
```typescript
{
  inputPath: string;
  outputPath?: string;
  format?: string;        // Default: 'HH:mm:ss'
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}
```

---

## Code Runner

### `run_code`

Execute code in sandbox.

**Parameters:**
```typescript
{
  code: string;
  language: 'javascript' | 'typescript' | 'python' | 'bash';
  timeout?: number;       // Default: 30000
  sandbox?: boolean;      // Default: true
  env?: Record<string, string>;
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: {
    exitCode: number;
    stdout: string;
    stderr: string;
    duration: number;
    error?: string;
  };
}
```

**Example:**
```typescript
const result = await runCode({
  code: 'console.log("Hello, World!")',
  language: 'javascript',
  timeout: 5000
});
```

### `run_tests`

Run test suite.

**Parameters:**
```typescript
{
  path: string;
  framework?: 'jest' | 'mocha' | 'pytest' | 'vitest';
  coverage?: boolean;     // Default: false
  watch?: boolean;        // Default: false
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: ExecutionResult;
}
```

### `run_build`

Run build command.

**Parameters:**
```typescript
{
  command?: string;       // Default: 'npm run build'
  cwd?: string;
  env?: Record<string, string>;
}
```

**Returns:**
```typescript
{
  success: boolean;
  data?: ExecutionResult;
}
```

### `lint_code`

Run linter on code.

**Parameters:**
```typescript
{
  path: string;
  fix?: boolean;          // Default: false
  config?: string;
}
```

### `format_code`

Format code.

**Parameters:**
```typescript
{
  path: string;
  formatter?: 'prettier' | 'black' | 'rustfmt';
  write?: boolean;        // Default: true
}
```

### `type_check`

Run type checking.

**Parameters:**
```typescript
{
  path: string;
  config?: string;
}
```

---

## Common Types

### `ToolResponse<T>`
```typescript
interface ToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

### `ImageData`
```typescript
interface ImageData {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
}
```

### `VideoData`
```typescript
interface VideoData {
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
```

### `ExecutionResult`
```typescript
interface ExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  error?: string;
}
```

---

## Error Handling

All tools return a standardized response with `success` boolean. When `success` is `false`, the `error` and `message` fields provide details:

```typescript
{
  success: false,
  error: "Error type or message",
  message: "Detailed error description"
}
```

Example error handling:
```typescript
const result = await captureScreenshot({ display: 0 });

if (!result.success) {
  console.error('Screenshot failed:', result.error);
  console.error('Details:', result.message);
  return;
}

// Use result.data
console.log('Screenshot size:', result.data.size);
```
