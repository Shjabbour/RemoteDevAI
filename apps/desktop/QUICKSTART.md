# Quick Start Guide

Get the RemoteDevAI Desktop Agent up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)
- Anthropic API key

## Installation

### 1. Install Dependencies

```bash
cd apps/desktop
npm install
```

### 2. Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit .env file
nano .env
```

Minimum required settings:
```env
CLOUD_API_URL=http://localhost:3000
CLOUD_WS_URL=ws://localhost:3000
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3. Install Playwright (for recording)

```bash
npx playwright install
```

## Development

### Start Development Mode

```bash
npm run dev
```

This will:
1. Compile TypeScript in watch mode
2. Launch Electron application
3. Open DevTools automatically

### First Launch

1. App will appear in system tray
2. Right-click tray icon
3. Click "Open Settings"
4. Go to Connection tab
5. Copy your Device ID
6. Get auth token from cloud platform
7. Paste token and click "Save Token"
8. Click "Connect"

## Testing Services

### Test Claude Code

```bash
# In Settings window, go to Claude Code tab
# Click "Start"
# Verify status shows "Running: Yes"
```

### Test Terminal

```bash
# Go to Services tab
# Click "Create Terminal"
# Check "Active Terminals" count increases
```

### Test File Watcher

```bash
# Click "Start Watching"
# Verify status changes to "Watching"
# Make a file change in your project
# Check cloud dashboard for change notifications
```

## Building

### Build for Development

```bash
npm run build
```

### Build for Production

```bash
# Current platform
npm run dist

# Specific platform
npm run dist:win
npm run dist:mac
npm run dist:linux
```

Installers will be in `release/` directory.

## Common Issues

### Port Already in Use

If you get port errors, change the port in `.env`:
```env
CLOUD_API_URL=http://localhost:3001
CLOUD_WS_URL=ws://localhost:3001
```

### Claude Code Not Found

Ensure Claude CLI is in PATH:
```bash
which claude  # macOS/Linux
where claude  # Windows
```

Or specify full path in `.env`:
```env
CLAUDE_CODE_PATH=/usr/local/bin/claude
```

### Connection Refused

1. Make sure cloud server is running
2. Check `CLOUD_WS_URL` matches server
3. Verify firewall allows connection

## Next Steps

1. Read full [SETUP.md](./SETUP.md) for detailed configuration
2. Check [README.md](./README.md) for architecture overview
3. Review [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) for code organization
4. Explore source code in `src/` directory

## Need Help?

- Documentation: https://docs.remotedevai.com
- Issues: https://github.com/remotedevai/desktop-agent/issues
- Discord: https://discord.gg/remotedevai

## Development Tips

1. **Hot Reload**: Changes to renderer code reload automatically
2. **Main Process**: Requires restart for changes
3. **Logs**: Available in Settings > Logs tab
4. **DevTools**: Opens automatically in development
5. **Debugging**: Use VS Code debugger with Electron config

## File Locations

Development:
- Config: `apps/desktop/.env`
- Logs: `apps/desktop/logs/` (if created)
- Source: `apps/desktop/src/`

Production:
- Config: System-dependent (see SETUP.md)
- Logs: `%APPDATA%/RemoteDevAI/logs/` (Windows)
- Data: `~/Library/Application Support/RemoteDevAI/` (macOS)

## Scripts Reference

```bash
npm run dev          # Start development
npm run build        # Build TypeScript
npm run start        # Start Electron (after build)
npm run dist         # Build installer
npm run lint         # Run ESLint
npm run clean        # Remove dist/
```

That's it! You're ready to develop and test the desktop agent.
