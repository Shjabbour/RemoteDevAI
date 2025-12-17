# Quick Start Guide

Get up and running with MCP Tools in minutes.

## Installation

### Prerequisites

1. **Node.js** >= 18.0.0
2. **FFmpeg** - Required for video processing
3. **Platform-specific requirements:**
   - **Windows:** Visual Studio Build Tools
   - **macOS:** Xcode Command Line Tools
   - **Linux:** `libgbm1`, `libasound2`

### Install FFmpeg

**Windows (with Chocolatey):**
```bash
choco install ffmpeg
```

**macOS (with Homebrew):**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg libgbm1 libasound2
```

### Install Package

```bash
cd packages/mcp-tools
npm install
```

## Build

```bash
npm run build
```

## Quick Examples

### 1. Screen Capture (30 seconds)

```typescript
import { captureScreenshot } from '@remotedevai/mcp-tools';

// Capture full screen
const screenshot = await captureScreenshot({
  display: 0,
  format: 'png',
  quality: 90
});

if (screenshot.success) {
  console.log('Screenshot captured!');
  console.log('Size:', screenshot.data.width, 'x', screenshot.data.height);
}
```

### 2. Browser Automation (2 minutes)

```typescript
import {
  openBrowser,
  clickElement,
  typeText,
  takeScreenshot,
  closeBrowserTool
} from '@remotedevai/mcp-tools';

// Open browser
await openBrowser({
  url: 'https://github.com',
  browser: 'chromium',
  headless: false
});

// Search
await clickElement({ selector: 'input[name="q"]' });
await typeText({
  selector: 'input[name="q"]',
  text: 'RemoteDevAI',
  delay: 100
});

// Screenshot
const screenshot = await takeScreenshot({ fullPage: true });

// Close
await closeBrowserTool();
```

### 3. Screen Recording (1 minute)

```typescript
import { startRecording, stopRecording } from '@remotedevai/mcp-tools';

// Start recording
const recording = await startRecording({
  fps: 30,
  quality: 'high',
  maxDuration: 60
});

console.log('Recording started:', recording.data.outputPath);

// Do work...
await new Promise(resolve => setTimeout(resolve, 10000));

// Stop recording
const video = await stopRecording();
console.log('Video saved:', video.data.path);
```

### 4. Run Code (1 minute)

```typescript
import { runCode } from '@remotedevai/mcp-tools';

// Execute JavaScript
const result = await runCode({
  code: `
    const sum = (a, b) => a + b;
    console.log(sum(5, 3));
    return sum(10, 20);
  `,
  language: 'javascript',
  timeout: 5000
});

console.log('Output:', result.data.stdout);
console.log('Exit code:', result.data.exitCode);
```

### 5. Notifications (30 seconds)

```typescript
import { sendNotification, sendProgress } from '@remotedevai/mcp-tools';

// Send notification
await sendNotification({
  title: 'Task Complete',
  message: 'Your build finished successfully!',
  priority: 'normal'
});

// Send progress
await sendProgress({
  taskId: 'build-123',
  progress: 100,
  status: 'completed'
});
```

## Running as MCP Server

Start the MCP server to use with Claude Code:

```bash
npm start
```

The server will listen for MCP tool requests via stdio.

### Configure Claude Code

Add to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "remotedevai-tools": {
      "command": "node",
      "args": ["./packages/mcp-tools/dist/server.js"],
      "cwd": "/path/to/RemoteDevAI"
    }
  }
}
```

## Common Tasks

### Capture and Compress Screen Recording

```typescript
import { startRecording, stopRecording, compressVideo } from '@remotedevai/mcp-tools';

// Record
await startRecording({ fps: 30, quality: 'high' });
await new Promise(resolve => setTimeout(resolve, 30000));
const video = await stopRecording();

// Compress
if (video.data) {
  const compressed = await compressVideo({
    inputPath: video.data.path,
    quality: 'medium',
    resolution: '1280x720'
  });
  console.log('Compressed:', compressed.data.path);
}
```

### Automated Testing

```typescript
import { runTests, sendNotification } from '@remotedevai/mcp-tools';

// Run tests
const result = await runTests({
  path: './tests',
  framework: 'jest',
  coverage: true
});

// Notify
await sendNotification({
  title: result.success ? 'Tests Passed' : 'Tests Failed',
  message: result.success ? 'All tests passed!' : 'Some tests failed',
  priority: result.success ? 'normal' : 'high'
});
```

### Browser Testing with Recording

```typescript
import {
  startRecording,
  openBrowser,
  clickElement,
  typeText,
  stopRecording,
  closeBrowserTool
} from '@remotedevai/mcp-tools';

// Start recording
await startRecording({ fps: 30, quality: 'high' });

// Browser automation
await openBrowser({ url: 'https://example.com', headless: false });
await clickElement({ selector: 'button.login' });
await typeText({ selector: 'input[name="username"]', text: 'testuser' });

// Stop
await closeBrowserTool();
const video = await stopRecording();

console.log('Test recording:', video.data.path);
```

### File Processing Pipeline

```typescript
import {
  previewDirectory,
  previewFile,
  lintCode,
  formatCode,
  runBuild
} from '@remotedevai/mcp-tools';

// Preview structure
const tree = await previewDirectory({ path: './src', depth: 3 });
console.log(tree.data);

// Lint and format
await lintCode({ path: './src', fix: true });
await formatCode({ path: './src', formatter: 'prettier' });

// Build
const build = await runBuild({ command: 'npm run build' });
console.log('Build:', build.success ? 'Success' : 'Failed');
```

## Troubleshooting

### FFmpeg not found
```bash
# Check if FFmpeg is installed
ffmpeg -version

# If not, install using package manager
# Windows: choco install ffmpeg
# macOS: brew install ffmpeg
# Linux: sudo apt install ffmpeg
```

### Playwright browser download
```bash
# Install browsers
npx playwright install chromium
```

### TypeScript errors
```bash
# Rebuild
npm run build
```

### Permission errors (Linux/macOS)
```bash
# Make sure recordings directory is writable
chmod 755 ./recordings
```

## Next Steps

1. **Explore Examples:** Check `examples/usage.ts` for more examples
2. **Read API Docs:** See `docs/API.md` for complete API reference
3. **Configure:** Customize settings in `mcp-config.json` and `.env`
4. **Integrate:** Add to your Claude Code workflow

## Getting Help

- **Documentation:** `docs/` directory
- **Examples:** `examples/` directory
- **Issues:** GitHub Issues
- **API Reference:** `docs/API.md`

## Best Practices

1. **Always handle errors:**
   ```typescript
   const result = await tool();
   if (!result.success) {
     console.error(result.error);
     return;
   }
   ```

2. **Set timeouts:**
   ```typescript
   await runCode({ code, language: 'javascript', timeout: 5000 });
   ```

3. **Clean up resources:**
   ```typescript
   try {
     await openBrowser({ url });
     // Do work
   } finally {
     await closeBrowserTool();
   }
   ```

4. **Use sandboxing:**
   ```typescript
   await runCode({ code, language: 'javascript', sandbox: true });
   ```

5. **Monitor recording duration:**
   ```typescript
   await startRecording({ maxDuration: 300 }); // 5 minutes max
   ```

Happy coding!
