# Project Structure

Complete directory structure for the MCP Tools package.

```
packages/mcp-tools/
├── .env.example              # Environment variables template
├── .eslintrc.json           # ESLint configuration
├── .gitignore               # Git ignore rules
├── .prettierrc              # Prettier configuration
├── CHANGELOG.md             # Version history and changes
├── LICENSE                  # MIT License
├── README.md                # Main documentation
├── STRUCTURE.md             # This file
├── mcp-config.json          # MCP server configuration
├── package.json             # Package dependencies and scripts
├── tsconfig.json            # TypeScript configuration
│
├── docs/                    # Documentation
│   ├── API.md              # Complete API reference
│   └── QUICKSTART.md       # Quick start guide
│
├── examples/                # Usage examples
│   └── usage.ts            # Comprehensive usage examples
│
└── src/                    # Source code
    ├── index.ts            # Package exports
    ├── server.ts           # MCP server implementation
    ├── types.ts            # TypeScript type definitions
    │
    ├── tools/              # Tool implementations
    │   ├── browserAutomation.ts    # Browser control tools
    │   ├── codeRunner.ts           # Code execution tools
    │   ├── filePreview.ts          # File preview tools
    │   ├── notification.ts         # Notification tools
    │   ├── screenCapture.ts        # Screen capture tools
    │   ├── screenRecord.ts         # Screen recording tools
    │   ├── terminalCapture.ts      # Terminal capture tools
    │   └── videoTools.ts           # Video processing tools
    │
    └── utils/              # Utility functions
        ├── ffmpeg.ts       # FFmpeg wrapper
        ├── playwright.ts   # Playwright utilities
        └── sandbox.ts      # Code execution sandbox
```

## File Descriptions

### Root Configuration Files

- **`.env.example`** - Template for environment variables (recordings dir, timeouts, etc.)
- **`.eslintrc.json`** - ESLint rules for TypeScript
- **`.prettierrc`** - Code formatting rules
- **`.gitignore`** - Excludes node_modules, dist, recordings, logs
- **`mcp-config.json`** - MCP server configuration (tools, security, storage)
- **`package.json`** - Dependencies, scripts, package metadata
- **`tsconfig.json`** - TypeScript compiler options

### Documentation

- **`README.md`** - Main documentation with features, installation, usage
- **`CHANGELOG.md`** - Version history and feature additions
- **`LICENSE`** - MIT License
- **`STRUCTURE.md`** - This file, project structure overview
- **`docs/API.md`** - Complete API reference for all tools
- **`docs/QUICKSTART.md`** - Quick start guide with examples

### Source Code

#### Core Files

- **`src/index.ts`** - Main entry point, exports all tools and utilities
- **`src/server.ts`** - MCP server implementation, tool registration, request handling
- **`src/types.ts`** - TypeScript type definitions, schemas, interfaces

#### Tools (`src/tools/`)

Each tool file implements a category of related functionality:

1. **`screenCapture.ts`** (5 functions)
   - `captureScreenshot` - Capture full screen or display
   - `captureRegion` - Capture screen region
   - `listDisplays` - List available displays
   - `captureAllDisplays` - Capture all displays
   - `captureToFile` - Save screenshot to file

2. **`screenRecord.ts`** (5 functions)
   - `startRecording` - Start screen recording
   - `stopRecording` - Stop and save recording
   - `getRecordingStatus` - Get recording status
   - `pauseRecording` - Pause recording (placeholder)
   - `cancelRecording` - Cancel without saving

3. **`browserAutomation.ts`** (11 functions)
   - `openBrowser` - Launch and navigate browser
   - `clickElement` - Click elements
   - `typeText` - Type into inputs
   - `takeScreenshot` - Screenshot page
   - `recordBrowser` - Record browser session
   - `closeBrowserTool` - Close browser
   - `navigate` - Navigate to URL
   - `getPageContent` - Get page HTML/text
   - `executeJavaScript` - Run scripts
   - `fillFormFields` - Fill form
   - `getElementTextContent` - Get element text

4. **`terminalCapture.ts`** (5 functions)
   - `captureTerminal` - Screenshot terminal
   - `recordTerminal` - Record session
   - `getTerminalOutput` - Get recent output
   - `stopTerminalRecording` - Stop recording
   - `listTerminalSessions` - List sessions

5. **`filePreview.ts`** (4 functions)
   - `previewFile` - Preview images/text
   - `previewDiff` - Generate file diffs
   - `previewDirectory` - Directory tree
   - `getFileMetadata` - File info

6. **`notification.ts`** (6 functions)
   - `sendNotification` - Send notification
   - `sendProgress` - Progress update
   - `requestFeedback` - Request input
   - `cancelFeedbackRequest` - Cancel request
   - `sendWebhook` - Webhook notification
   - `sendBatchNotifications` - Batch send

7. **`videoTools.ts`** (8 functions)
   - `compressVideo` - Compress video
   - `createThumbnail` - Extract frames
   - `trimVideo` - Trim segments
   - `addTimestamp` - Add overlay
   - `convertVideoFormat` - Format conversion
   - `mergeVideos` - Merge videos
   - `extractVideoAudio` - Extract audio
   - `getVideoInfo` - Video metadata

8. **`codeRunner.ts`** (9 functions)
   - `runCode` - Execute code
   - `runTests` - Run tests
   - `runBuild` - Run build
   - `getOutput` - Get output (placeholder)
   - `installDeps` - Install dependencies
   - `lintCode` - Run linter
   - `formatCode` - Format code
   - `checkRuntime` - Check runtime
   - `typeCheck` - Type checking

#### Utilities (`src/utils/`)

1. **`ffmpeg.ts`** - FFmpeg wrapper for video processing
   - Quality presets
   - Compression, thumbnails, trimming
   - Timestamp overlays
   - Format conversion
   - Video merging
   - Audio extraction
   - Metadata retrieval

2. **`playwright.ts`** - Browser automation utilities
   - Browser launch/close
   - Navigation
   - Element interaction
   - Screenshots
   - Video recording
   - Script execution
   - Form filling

3. **`sandbox.ts`** - Code execution sandbox
   - Multi-language execution
   - Test running
   - Build execution
   - Dependency installation
   - Runtime checking
   - Command execution

### Examples

- **`examples/usage.ts`** - Comprehensive examples for all tools
  - 9 example functions covering all major features
  - Complete workflow examples
  - Error handling patterns
  - Best practices

## Build Output

After running `npm run build`:

```
dist/
├── index.js
├── index.d.ts
├── server.js
├── server.d.ts
├── types.js
├── types.d.ts
├── tools/
│   ├── *.js
│   └── *.d.ts
└── utils/
    ├── *.js
    └── *.d.ts
```

## Runtime Directories

Created during operation:

```
recordings/          # Screen/browser recordings
logs/               # Application logs
tmp/                # Temporary files
```

## Total Files

- **Configuration:** 9 files
- **Documentation:** 5 files
- **Source Code:** 16 TypeScript files
- **Examples:** 1 file
- **Total:** 27+ files

## Dependencies

### Production
- `@anthropic-ai/sdk` - Anthropic SDK
- `@modelcontextprotocol/sdk` - MCP SDK
- `playwright` - Browser automation
- `fluent-ffmpeg` - Video processing
- `sharp` - Image processing
- `ws` - WebSockets
- `zod` - Schema validation
- `node-notifier` - Notifications
- `screenshot-desktop` - Screen capture
- `dotenv` - Environment variables

### Development
- `typescript` - TypeScript compiler
- `@types/*` - Type definitions
- `eslint` - Linting
- `prettier` - Formatting
- `jest` - Testing (optional)

## Size Estimates

- **Source code:** ~50KB (minified)
- **Dependencies:** ~150MB (with Playwright browsers)
- **Build output:** ~100KB
- **Documentation:** ~50KB

## Key Features by File

| File | Lines | Functions | Key Features |
|------|-------|-----------|--------------|
| screenCapture.ts | ~250 | 5 | Multi-display, regions, formats |
| screenRecord.ts | ~300 | 5 | FFmpeg recording, auto-stop |
| browserAutomation.ts | ~400 | 11 | Playwright wrapper, full control |
| terminalCapture.ts | ~300 | 5 | Session management |
| filePreview.ts | ~400 | 4 | Diffs, trees, previews |
| notification.ts | ~300 | 6 | Push, progress, feedback |
| videoTools.ts | ~350 | 8 | Compression, editing |
| codeRunner.ts | ~400 | 9 | Multi-language, sandboxed |
| ffmpeg.ts | ~350 | 10 | Video processing |
| playwright.ts | ~400 | 15 | Browser utilities |
| sandbox.ts | ~350 | 8 | Execution utilities |
| server.ts | ~400 | - | MCP server |
| types.ts | ~500 | - | Type definitions |

**Total:** ~4,700 lines of TypeScript

## Extensibility

Easy to add new tools:

1. Create tool file in `src/tools/`
2. Add types to `src/types.ts`
3. Export from `src/index.ts`
4. Register in `src/server.ts`
5. Add to `mcp-config.json`
6. Update documentation

## Architecture

```
┌─────────────────┐
│   Claude Code   │
└────────┬────────┘
         │ MCP Protocol
         │
┌────────▼────────┐
│   MCP Server    │
│   (server.ts)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │  Tools  │
    └────┬────┘
         │
    ┌────┴────┐
    │  Utils  │
    └─────────┘
```

## Security Layers

1. **Input Validation:** Zod schemas
2. **Sandboxing:** Code execution isolation
3. **Timeouts:** All operations timeout-protected
4. **File Size Limits:** Enforced limits
5. **Domain Filtering:** Browser automation
6. **Confirmation:** Sensitive operations

## Performance

- **Screen Capture:** < 1s
- **Screen Recording:** Real-time 30fps
- **Browser Launch:** 1-3s
- **Code Execution:** Variable (timeout: 30s)
- **Video Compression:** 0.5x - 2x real-time

## Testing Strategy

- Unit tests for utilities
- Integration tests for tools
- E2E tests for workflows
- Performance benchmarks
- Security audits
