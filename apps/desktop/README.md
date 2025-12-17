# RemoteDevAI Desktop Agent

The desktop agent is an Electron application that runs on the user's PC and provides remote access to Claude Code CLI and local system resources.

## Features

- **System Tray Integration**: Runs in the background with a system tray icon
- **WebSocket Connection**: Real-time communication with the cloud platform
- **Claude Code CLI Integration**: Spawn and control Claude Code CLI sessions
- **Terminal Access**: Create and manage remote terminal sessions using PTY
- **Screen Recording**: Record screen and terminal sessions using Playwright
- **File Watching**: Monitor file system changes with Chokidar
- **Tunnel Support**: Expose local servers via Cloudflare or ngrok tunnels
- **Secure Storage**: Store auth tokens securely using Keytar
- **Auto-launch**: Start automatically on system boot
- **Auto-update**: Automatically check and install updates

## Architecture

```
apps/desktop/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # Application entry point
│   │   ├── tray.ts     # System tray management
│   │   └── ipc.ts      # IPC handlers
│   ├── services/       # Core services
│   │   ├── ConnectionService.ts    # WebSocket connection
│   │   ├── ClaudeCodeService.ts    # Claude Code CLI
│   │   ├── TerminalService.ts      # PTY terminals
│   │   ├── RecordingService.ts     # Screen recording
│   │   ├── FileWatcherService.ts   # File watching
│   │   ├── TunnelService.ts        # Tunnel management
│   │   ├── AuthService.ts          # Authentication
│   │   └── UpdateService.ts        # Auto-updates
│   ├── agents/         # Local agent implementations
│   ├── preload/        # Preload scripts
│   ├── renderer/       # UI
│   ├── utils/          # Utilities
│   └── config.ts       # Configuration
└── assets/             # Icons and resources
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Claude Code CLI installed and configured

### Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment template:
```bash
cp .env.example .env
```

3. Configure environment variables:
```bash
# Edit .env with your settings
CLOUD_API_URL=http://localhost:3000
CLOUD_WS_URL=ws://localhost:3000
ANTHROPIC_API_KEY=your_key_here
```

4. Start development:
```bash
npm run dev
```

This will:
- Compile TypeScript (watch mode)
- Start Electron

### Build

Build for current platform:
```bash
npm run dist
```

Build for specific platform:
```bash
npm run dist:win   # Windows
npm run dist:mac   # macOS
npm run dist:linux # Linux
```

Output will be in the `release/` directory.

## Services

### ConnectionService
Manages WebSocket connection to the cloud platform. Handles:
- Auto-reconnection
- Message queuing
- Connection statistics
- Event forwarding

### ClaudeCodeService
Spawns and manages Claude Code CLI process. Features:
- Command execution
- Output streaming
- Process lifecycle management
- Remote control

### TerminalService
Creates and manages PTY-based terminal sessions. Supports:
- Multiple concurrent terminals
- Terminal resizing
- Data streaming
- Shell detection

### RecordingService
Records screen and terminal sessions. Uses:
- Playwright for screen recording
- Video compression
- Chunked upload for large files

### FileWatcherService
Monitors file system changes. Features:
- Multi-path watching
- Ignore patterns
- Debounced notifications
- Change buffering

### TunnelService
Exposes local services via public URLs. Supports:
- Cloudflare Tunnels
- ngrok
- URL extraction
- Auto-reconnect

### AuthService
Manages authentication and device identity. Provides:
- Secure token storage (Keytar)
- Device ID generation
- Credential management

### UpdateService
Handles application updates. Features:
- Auto-update checking
- Background downloads
- Install on quit
- Update notifications

## Security

### Electron Security Best Practices

1. **Context Isolation**: Renderer processes are isolated from Node.js
2. **Preload Scripts**: Safe IPC exposure via contextBridge
3. **Sandbox**: Renderer processes run in sandbox mode
4. **CSP**: Content Security Policy enforced
5. **No Node Integration**: Node.js disabled in renderer

### Secure Storage

- Auth tokens stored in system keychain via Keytar
- No credentials in localStorage or config files
- Device ID stored locally, not transmitted

### Network Security

- WebSocket connection with authentication
- TLS/SSL for production
- Token-based authentication
- Command validation

## Configuration

See `.env.example` for all available options.

Key settings:
- `CLOUD_API_URL`: Cloud platform URL
- `CLOUD_WS_URL`: WebSocket server URL
- `CLAUDE_CODE_PATH`: Path to Claude CLI
- `TUNNEL_PROVIDER`: Tunnel service (cloudflare/ngrok/none)
- `AUTO_LAUNCH_ENABLED`: Start on system boot
- `AUTO_UPDATE_ENABLED`: Auto-update checks

## Troubleshooting

### Connection Issues

1. Check cloud server is running
2. Verify `CLOUD_WS_URL` is correct
3. Check auth token is set
4. Review logs in settings UI

### Claude Code Not Starting

1. Verify `CLAUDE_CODE_PATH` points to Claude CLI
2. Check `ANTHROPIC_API_KEY` is set
3. Ensure workspace exists
4. Check logs for errors

### Recording Not Working

1. Install Playwright browsers: `npx playwright install`
2. Check screen recording permissions (macOS)
3. Verify disk space available
4. Check `MAX_RECORDING_SIZE` setting

### Tunnel Issues

1. Install tunnel provider (cloudflared/ngrok)
2. Set auth token if required
3. Check firewall settings
4. Verify port is available

## Logs

Logs are stored in:
- Windows: `%APPDATA%\RemoteDevAI\logs\`
- macOS: `~/Library/Application Support/RemoteDevAI/logs/`
- Linux: `~/.config/RemoteDevAI/logs/`

View logs in the Settings UI under the "Logs" tab.

## Contributing

1. Follow TypeScript best practices
2. Add error handling for all operations
3. Log important events
4. Update documentation
5. Test on all platforms

## License

MIT
