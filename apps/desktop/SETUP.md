# Desktop Agent Setup Guide

Complete setup instructions for the RemoteDevAI Desktop Agent.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [First Run](#first-run)
5. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

1. **Node.js 18 or higher**
   ```bash
   # Check version
   node --version
   ```
   Download from: https://nodejs.org/

2. **Claude Code CLI**
   ```bash
   # Install via npm
   npm install -g @anthropic-ai/claude-code

   # Or use binary from Anthropic
   # Download from: https://claude.ai/code
   ```

3. **Git** (recommended)
   ```bash
   git --version
   ```

### Optional Software

4. **Cloudflare Tunnels** (for tunnel support)
   ```bash
   # macOS
   brew install cloudflare/cloudflare/cloudflared

   # Windows
   winget install cloudflare.cloudflared

   # Linux
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
   sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
   sudo chmod +x /usr/local/bin/cloudflared
   ```

5. **ngrok** (alternative to Cloudflare)
   ```bash
   # macOS
   brew install ngrok/ngrok/ngrok

   # Windows
   choco install ngrok

   # Linux
   snap install ngrok
   ```

## Installation

### Option 1: Install from Release (Recommended)

1. Download the latest release for your platform:
   - **Windows**: `RemoteDevAI-Setup-x.x.x.exe` or `RemoteDevAI-x.x.x-portable.exe`
   - **macOS**: `RemoteDevAI-x.x.x.dmg`
   - **Linux**: `RemoteDevAI-x.x.x.AppImage` or `RemoteDevAI-x.x.x.deb`

2. Install the application:
   - **Windows**: Run the installer
   - **macOS**: Open DMG and drag to Applications
   - **Linux**: Make AppImage executable or install .deb

### Option 2: Build from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/remotedevai/desktop-agent.git
   cd desktop-agent/apps/desktop
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the application:
   ```bash
   # For development
   npm run dev

   # For production build
   npm run dist
   ```

## Configuration

### 1. Environment Variables

Create a `.env` file in the app directory:

```bash
# Copy example
cp .env.example .env

# Edit with your values
nano .env
```

Required settings:

```env
# Cloud Connection (get from cloud platform)
CLOUD_API_URL=https://your-cloud-url.com
CLOUD_WS_URL=wss://your-cloud-url.com

# Claude Code
CLAUDE_CODE_PATH=claude
ANTHROPIC_API_KEY=sk-ant-...
```

Optional settings:

```env
# Workspace (default: current directory)
CLAUDE_CODE_WORKSPACE=/path/to/your/projects

# Recording
MAX_RECORDING_SIZE=100
RECORDING_QUALITY=medium

# Tunnel (if using)
TUNNEL_PROVIDER=cloudflare
TUNNEL_AUTH_TOKEN=your_token_here

# Auto-launch
AUTO_LAUNCH_ENABLED=true

# Updates
AUTO_UPDATE_ENABLED=true
UPDATE_CHECK_INTERVAL=24
```

### 2. Get Your Auth Token

1. Log in to the RemoteDevAI cloud platform
2. Go to Settings > Devices
3. Click "Add New Device"
4. Copy the generated auth token
5. Paste it in the Desktop Agent settings

### 3. Configure Claude Code

Ensure Claude Code CLI is properly configured:

```bash
# Set API key
export ANTHROPIC_API_KEY=sk-ant-...

# Test Claude Code
claude --version
```

### 4. Install Playwright Browsers (for recording)

```bash
npx playwright install
```

## First Run

### 1. Launch the Application

The application will start in the system tray:
- **Windows**: Look in the notification area (bottom-right)
- **macOS**: Look in the menu bar (top-right)
- **Linux**: Look in the system tray

### 2. Open Settings

Right-click the tray icon and select "Open Settings"

### 3. Configure Connection

In the Connection tab:
1. Your Device ID will be displayed automatically
2. Enter the auth token from the cloud platform
3. Click "Save Token"
4. Click "Connect"

The status should change to "Connected" if successful.

### 4. Test Services

Try each service to ensure it's working:

1. **Claude Code**:
   - Go to Claude Code tab
   - Click "Start"
   - Verify it shows "Running: Yes"

2. **Terminal**:
   - Go to Services tab
   - Click "Create Terminal"
   - Should create a new terminal session

3. **File Watcher**:
   - Click "Start Watching"
   - Verify status changes to "Watching"

4. **Tunnel** (optional):
   - Click "Start Tunnel"
   - Copy the public URL if successful

## Troubleshooting

### Connection Issues

**Problem**: Can't connect to cloud

**Solutions**:
1. Verify `CLOUD_WS_URL` is correct
2. Check your internet connection
3. Ensure auth token is valid
4. Check firewall settings
5. Review logs in Settings > Logs tab

### Claude Code Issues

**Problem**: Claude Code won't start

**Solutions**:
1. Verify `CLAUDE_CODE_PATH` is correct:
   ```bash
   which claude
   # or
   where claude
   ```
2. Check `ANTHROPIC_API_KEY` is set
3. Ensure workspace directory exists
4. Try running Claude manually:
   ```bash
   claude --version
   ```

### Permission Errors

**Problem**: Permission denied errors

**Solutions**:
- **Windows**: Run as administrator
- **macOS**: Grant permissions in System Preferences > Security & Privacy
- **Linux**: Check file permissions and use `chmod` if needed

### Recording Issues

**Problem**: Screen recording not working

**Solutions**:
1. Install Playwright browsers:
   ```bash
   npx playwright install
   ```
2. Grant screen recording permissions:
   - **macOS**: System Preferences > Security & Privacy > Screen Recording
   - **Windows**: Settings > Privacy > Screen Recording
3. Check available disk space
4. Lower recording quality in settings

### Tunnel Issues

**Problem**: Tunnel won't start

**Solutions**:
1. Verify tunnel provider is installed:
   ```bash
   cloudflared --version
   # or
   ngrok version
   ```
2. Check `TUNNEL_AUTH_TOKEN` if required
3. Ensure port is not already in use
4. Check firewall settings

### Auto-launch Issues

**Problem**: App doesn't start on boot

**Solutions**:
1. Check `AUTO_LAUNCH_ENABLED` is set to `true`
2. Manually add to startup:
   - **Windows**: Add shortcut to `shell:startup`
   - **macOS**: System Preferences > Users & Groups > Login Items
   - **Linux**: Add to autostart applications

### Log Files

If you encounter issues, check the log files:

**Locations**:
- Windows: `%APPDATA%\RemoteDevAI\logs\app.log`
- macOS: `~/Library/Application Support/RemoteDevAI/logs/app.log`
- Linux: `~/.config/RemoteDevAI/logs/app.log`

**View in app**: Settings > Logs tab

### Getting Help

1. Check documentation: https://docs.remotedevai.com
2. Search issues: https://github.com/remotedevai/desktop-agent/issues
3. Ask in Discord: https://discord.gg/remotedevai
4. Email support: support@remotedevai.com

## Advanced Configuration

### Custom Claude Code Path

If Claude Code is installed in a custom location:

```env
CLAUDE_CODE_PATH=/custom/path/to/claude
```

### Multiple Workspaces

To support multiple workspaces, use environment variables:

```env
CLAUDE_CODE_WORKSPACE=/path/to/workspace1
```

Or specify when starting via cloud commands.

### Proxy Configuration

If behind a corporate proxy:

```env
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1
```

### Custom Ignore Patterns

Add custom file watching ignore patterns:

Create `watch-ignore.txt`:
```
**/build/**
**/temp/**
**/*.tmp
```

### Development Mode

For development and testing:

```env
NODE_ENV=development
```

This enables:
- Verbose logging
- DevTools in settings window
- Hot reload
- Additional debug information

## Security Best Practices

1. **Protect Your Auth Token**: Never share your auth token
2. **Use Environment Variables**: Don't hardcode credentials
3. **Enable Encryption**: Keep `ENCRYPTION_ENABLED=true`
4. **Review Logs**: Regularly check logs for suspicious activity
5. **Keep Updated**: Enable auto-updates for security patches
6. **Use Secure Networks**: Avoid public WiFi when possible
7. **Firewall Rules**: Configure firewall to only allow necessary connections

## Next Steps

After successful setup:

1. Connect to the cloud platform dashboard
2. Configure remote access settings
3. Set up team members (if applicable)
4. Test remote control features
5. Configure notification preferences
6. Review security settings

## Uninstallation

### Windows
1. Control Panel > Programs > Uninstall
2. Or use installer's uninstall option

### macOS
1. Drag app to Trash from Applications
2. Delete app data: `~/Library/Application Support/RemoteDevAI`

### Linux
1. Remove AppImage or use package manager
2. Delete app data: `~/.config/RemoteDevAI`

### Clean Uninstall

To remove all data:
```bash
# Also remove logs and settings
rm -rf ~/Library/Application\ Support/RemoteDevAI  # macOS
rm -rf ~/.config/RemoteDevAI                       # Linux
rmdir /s %APPDATA%\RemoteDevAI                     # Windows
```
