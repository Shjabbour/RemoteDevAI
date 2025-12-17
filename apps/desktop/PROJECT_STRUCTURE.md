# Desktop Agent Project Structure

Complete file structure for the RemoteDevAI Desktop Agent.

## Directory Tree

```
apps/desktop/
├── .env.example                    # Environment variables template
├── .eslintrc.json                  # ESLint configuration
├── .gitignore                      # Git ignore rules
├── package.json                    # Project dependencies and scripts
├── README.md                       # Project overview
├── SETUP.md                        # Setup and installation guide
├── PROJECT_STRUCTURE.md            # This file
├── tsconfig.json                   # Base TypeScript configuration
├── tsconfig.main.json              # Main process TypeScript config
├── tsconfig.renderer.json          # Renderer process TypeScript config
│
├── assets/                         # Application assets
│   └── README.md                   # Icon guidelines
│   # Icons to be added:
│   # - icon.ico/icns/png          # Main app icon
│   # - icon-connected.*           # Tray icon states
│   # - icon-disconnected.*
│   # - icon-error.*
│   # - status-*.png               # Menu status icons
│
├── src/
│   ├── config.ts                   # Application configuration
│   │
│   ├── main/                       # Electron main process
│   │   ├── main.ts                 # Entry point, app lifecycle
│   │   ├── tray.ts                 # System tray management
│   │   └── ipc.ts                  # IPC handlers
│   │
│   ├── services/                   # Core services
│   │   ├── AuthService.ts          # Authentication & device ID
│   │   ├── ConnectionService.ts    # WebSocket connection to cloud
│   │   ├── ClaudeCodeService.ts    # Claude Code CLI management
│   │   ├── TerminalService.ts      # PTY terminal sessions
│   │   ├── RecordingService.ts     # Screen/terminal recording
│   │   ├── FileWatcherService.ts   # File system watching
│   │   ├── TunnelService.ts        # Cloudflare/ngrok tunnels
│   │   └── UpdateService.ts        # Auto-update functionality
│   │
│   ├── agents/                     # Local agent implementations
│   │   ├── BaseAgent.ts            # Base agent class
│   │   └── README.md               # Agent documentation
│   │   # Additional agents to be implemented:
│   │   # - SystemAgent.ts          # File system operations
│   │   # - CodeAgent.ts            # Build, test, git ops
│   │   # - BrowserAgent.ts         # Browser automation
│   │   # - TerminalAgent.ts        # Command execution
│   │
│   ├── preload/                    # Electron preload scripts
│   │   └── preload.ts              # IPC bridge (contextBridge)
│   │
│   ├── renderer/                   # UI (settings window)
│   │   ├── index.html              # Main HTML
│   │   ├── renderer.ts             # UI logic
│   │   └── styles.css              # Styles
│   │
│   └── utils/                      # Utility modules
│       └── logger.ts               # Winston logger setup
│
└── dist/                           # Compiled output (generated)
    ├── main/
    ├── renderer/
    └── preload/
```

## File Descriptions

### Root Configuration Files

- **package.json**: Dependencies, scripts, Electron Builder config
- **tsconfig.json**: Base TypeScript settings
- **tsconfig.main.json**: Main process compilation settings
- **tsconfig.renderer.json**: Renderer process compilation settings
- **.eslintrc.json**: Linting rules for TypeScript
- **.env.example**: Environment variable template
- **.gitignore**: Files to exclude from git

### Documentation

- **README.md**: Project overview, features, development guide
- **SETUP.md**: Complete setup and installation instructions
- **PROJECT_STRUCTURE.md**: This file

### Main Process (src/main/)

**main.ts** (425 lines)
- Application entry point
- Initializes all services
- Creates system tray
- Handles app lifecycle events
- Single instance lock
- Auto-launch setup
- Cleanup on exit

**tray.ts** (172 lines)
- Creates system tray icon
- Builds context menu
- Handles tray events
- Updates status indicator
- Platform-specific icon handling

**ipc.ts** (208 lines)
- Registers IPC handlers
- Exposes service methods to renderer
- Handles authentication
- Service control endpoints
- App info endpoints
- Log management

### Services (src/services/)

**ConnectionService.ts** (206 lines)
- WebSocket connection to cloud
- Auto-reconnection logic
- Message queuing
- Connection statistics
- Event forwarding
- Command routing

**ClaudeCodeService.ts** (283 lines)
- Spawns Claude Code CLI
- Process lifecycle management
- Input/output streaming
- Command execution
- Output buffering
- Remote control

**TerminalService.ts** (245 lines)
- Creates PTY terminals
- Multiple terminal support
- Terminal resizing
- Data streaming
- Cross-platform shell detection
- Terminal cleanup

**RecordingService.ts** (320 lines)
- Screen recording (Playwright)
- Terminal recording
- Video compression
- Chunked upload
- Recording management
- File cleanup

**FileWatcherService.ts** (237 lines)
- Chokidar-based file watching
- Multi-path support
- Ignore patterns
- Debounced notifications
- Change buffering
- Path management

**TunnelService.ts** (266 lines)
- Cloudflare Tunnel support
- ngrok support
- URL extraction
- Process management
- Auto-reconnection
- Provider detection

**AuthService.ts** (130 lines)
- Keytar secure storage
- Device ID generation
- Token management
- Device info collection
- Persistent device ID

**UpdateService.ts** (156 lines)
- electron-updater integration
- Periodic update checks
- Background downloads
- Install on quit
- Update notifications

### Agents (src/agents/)

**BaseAgent.ts** (124 lines)
- Base class for agents
- Command handling
- Result reporting
- Progress updates
- Logging
- Enable/disable control

**README.md**
- Agent documentation
- Creating custom agents
- Security considerations

### Preload (src/preload/)

**preload.ts** (161 lines)
- Context bridge setup
- Safe IPC exposure
- Type-safe API
- Security boundaries

### Renderer (src/renderer/)

**index.html** (231 lines)
- Settings UI structure
- Tabs for different sections
- Connection status
- Service controls
- Logs viewer

**renderer.ts** (436 lines)
- UI event handlers
- State management
- Status polling
- Service control actions
- Log display

**styles.css** (381 lines)
- Modern UI styling
- Responsive design
- Dark theme support
- Button states
- Status indicators

### Utilities (src/utils/)

**logger.ts** (48 lines)
- Winston logger configuration
- Console and file logging
- Log rotation
- Structured logging
- Per-module loggers

### Config (src/)

**config.ts** (108 lines)
- Centralized configuration
- Environment variable loading
- Path management
- Default values
- Type-safe config object

## Build Output

After compilation, the `dist/` directory contains:

```
dist/
├── main/
│   ├── main.js
│   ├── tray.js
│   ├── ipc.js
│   └── ...
├── renderer/
│   ├── index.html
│   ├── renderer.js
│   └── styles.css
└── preload/
    └── preload.js
```

## Release Output

After running `npm run dist`, the `release/` directory contains:

```
release/
├── win-unpacked/              # Windows (unpacked)
├── mac/                       # macOS
├── linux-unpacked/            # Linux (unpacked)
├── RemoteDevAI-Setup-x.x.x.exe
├── RemoteDevAI-x.x.x.dmg
└── RemoteDevAI-x.x.x.AppImage
```

## Key Dependencies

### Production
- **electron**: Desktop application framework
- **socket.io-client**: WebSocket communication
- **node-pty**: Terminal/PTY support
- **playwright**: Browser automation and recording
- **chokidar**: File system watching
- **keytar**: Secure credential storage
- **auto-launch**: System startup integration
- **electron-updater**: Auto-update functionality
- **winston**: Logging framework
- **fluent-ffmpeg**: Video processing
- **uuid**: Unique ID generation

### Development
- **typescript**: Type-safe development
- **electron-builder**: Application packaging
- **eslint**: Code linting
- **concurrently**: Parallel script execution

## Code Statistics

- Total TypeScript files: 19
- Total lines of code: ~3,500
- Services: 8
- Main process files: 3
- UI files: 3
- Configuration files: 3
- Documentation files: 4

## Security Features

1. **Context Isolation**: Renderer isolated from Node.js
2. **Sandbox Mode**: Renderer runs in sandbox
3. **No Node Integration**: Disabled in renderer
4. **Content Security Policy**: Strict CSP enforced
5. **Secure Storage**: Keytar for credentials
6. **Input Validation**: All IPC inputs validated
7. **Command Validation**: Cloud commands verified
8. **Encrypted Communication**: WSS in production

## Development Workflow

1. Make changes to TypeScript files
2. Auto-compilation watches for changes
3. Electron auto-reloads on main process changes
4. Renderer refreshes on UI changes
5. Logs visible in console and files
6. DevTools available in development

## Build Workflow

1. Clean previous builds
2. Compile TypeScript (main + renderer)
3. Copy static assets
4. Package with Electron Builder
5. Generate installers for platforms
6. Sign and notarize (production)
7. Upload to release server

## Next Steps

To complete the application:

1. **Add Icons**: Create icons for all platforms
2. **Implement Agents**: Add specific agent classes
3. **Testing**: Add unit and integration tests
4. **CI/CD**: Setup GitHub Actions
5. **Documentation**: Add API docs
6. **Signing**: Setup code signing certificates
7. **Publishing**: Configure auto-update server

## Notes

- All paths are absolute to avoid cwd issues
- Services are event-driven for real-time updates
- Error handling at every service level
- Comprehensive logging throughout
- Platform-agnostic where possible
- Security-first design
