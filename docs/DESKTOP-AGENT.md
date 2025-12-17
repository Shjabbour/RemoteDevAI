# RemoteDevAI Desktop Agent Guide

Complete guide for installing, configuring, and using the RemoteDevAI Desktop Agent.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Configuration](#configuration)
- [Connecting to Cloud](#connecting-to-cloud)
- [Claude Code Integration](#claude-code-integration)
- [File Synchronization](#file-synchronization)
- [Commands Reference](#commands-reference)
- [Troubleshooting](#troubleshooting)

## Overview

The Desktop Agent is a local application that:
- Syncs files between your local machine and RemoteDevAI cloud
- Provides MCP tools for Claude Code integration
- Executes code locally while leveraging cloud AI agents
- Monitors file changes for real-time collaboration
- Manages deployments from your desktop

### Architecture

```
┌─────────────────────────────────────┐
│      Your Local Machine             │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Desktop Agent               │  │
│  │                               │  │
│  │  • File Watcher               │  │
│  │  • MCP Server                 │  │
│  │  • Sync Engine                │  │
│  │  • Local Executor             │  │
│  └───────┬───────────────────────┘  │
│          │                          │
│  ┌───────▼───────────────────────┐  │
│  │   Local File System           │  │
│  │   ~/Projects/my-app/          │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │   Claude Code + MCP Tools     │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
            │
            │ HTTPS/WSS
            │
┌───────────▼─────────────────────────┐
│      RemoteDevAI Cloud              │
│  • AI Agents                        │
│  • Project Storage                  │
│  • Collaboration                    │
└─────────────────────────────────────┘
```

## Installation

### Prerequisites

- **Node.js**: 18.x or higher
- **Git**: Latest version
- **Operating System**:
  - Windows 10 or higher
  - macOS 10.15 or higher
  - Linux (Ubuntu 20.04+, Debian 10+, Fedora 35+)

### Install from NPM

```bash
# Install globally
npm install -g @remotedevai/desktop-agent

# Verify installation
remotedevai --version
```

### Install from Binary (Recommended)

#### Windows

1. Download installer: [RemoteDevAI-Setup.exe](https://remotedevai.com/download/windows)
2. Run installer
3. Follow setup wizard
4. Launch RemoteDevAI from Start Menu

#### macOS

```bash
# Using Homebrew
brew install remotedevai/tap/desktop-agent

# Or download DMG
# Visit: https://remotedevai.com/download/mac
```

#### Linux

```bash
# Debian/Ubuntu
wget https://remotedevai.com/download/remotedevai_latest_amd64.deb
sudo dpkg -i remotedevai_latest_amd64.deb

# Fedora/RHEL
sudo dnf install https://remotedevai.com/download/remotedevai_latest.rpm

# Arch
yay -S remotedevai-bin
```

### Build from Source

```bash
# Clone repository
git clone https://github.com/Shjabbour/RemoteDevAI.git
cd RemoteDevAI/desktop-agent

# Install dependencies
npm install

# Build
npm run build

# Link globally
npm link

# Verify
remotedevai --version
```

## Configuration

### Initial Setup

```bash
# Initialize configuration
remotedevai init

# This creates ~/.remotedevai/config.json
```

### Configuration File

Location: `~/.remotedevai/config.json`

```json
{
  "version": "1.0.0",
  "cloudUrl": "https://api.remotedevai.com",
  "apiKey": "",
  "localPort": 3002,
  "mcpPort": 3003,
  "sync": {
    "enabled": true,
    "autoSync": true,
    "interval": 5000,
    "watchPaths": [
      "~/Projects"
    ],
    "excludePatterns": [
      "node_modules",
      ".git",
      "dist",
      "build",
      ".env",
      ".env.*",
      "*.log",
      ".DS_Store"
    ]
  },
  "claudeCode": {
    "enabled": true,
    "autoStart": true
  },
  "execution": {
    "allowLocal": true,
    "sandbox": true,
    "timeout": 300000,
    "maxMemory": "2GB"
  },
  "ui": {
    "systemTray": true,
    "notifications": true,
    "theme": "auto"
  },
  "logging": {
    "level": "info",
    "file": "~/.remotedevai/logs/agent.log",
    "maxSize": "10MB",
    "maxFiles": 5
  },
  "updates": {
    "autoCheck": true,
    "autoInstall": false,
    "channel": "stable"
  }
}
```

### Environment Variables

Alternatively, use environment variables:

```bash
# Add to ~/.bashrc or ~/.zshrc
export REMOTEDEVAI_API_KEY="your_api_key"
export REMOTEDEVAI_CLOUD_URL="https://api.remotedevai.com"
export REMOTEDEVAI_AUTO_SYNC="true"
export REMOTEDEVAI_LOG_LEVEL="info"
```

## Connecting to Cloud

### Authentication

#### Method 1: Web Login (Recommended)

```bash
remotedevai login
```

This will:
1. Open browser to login page
2. Sign in with your account
3. Authorize desktop agent
4. Automatically save credentials

#### Method 2: API Key

```bash
# Generate API key from https://app.remotedevai.com/settings/api-keys
remotedevai auth --api-key YOUR_API_KEY
```

#### Method 3: Environment Variable

```bash
export REMOTEDEVAI_API_KEY="your_api_key"
remotedevai start
```

### Verify Connection

```bash
# Test connection
remotedevai test-connection

# Output:
# ✓ Connected to RemoteDevAI Cloud
# ✓ Authentication successful
# ✓ User: john@example.com
# ✓ Plan: Pro
# ✓ Latency: 45ms
```

### Connection Status

```bash
remotedevai status

# Output:
# Desktop Agent Status
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Status:        Running
# Cloud:         Connected
# Uptime:        2h 34m
# Projects:      3 syncing
# MCP Server:    Active (port 3003)
# Version:       1.2.0
```

## Claude Code Integration

### Setup

1. **Install Claude Code** (if not already installed)

   Follow instructions at [claude.ai/code](https://claude.ai/code)

2. **Configure MCP**

   Edit `~/.claude/config.json`:

   ```json
   {
     "mcpServers": {
       "remotedevai": {
         "command": "remotedevai",
         "args": ["mcp"],
         "env": {
           "REMOTEDEVAI_API_KEY": "${REMOTEDEVAI_API_KEY}"
         }
       }
     }
   }
   ```

3. **Start Desktop Agent**

   ```bash
   remotedevai start
   ```

4. **Restart Claude Code**

   The MCP tools will now be available.

### Verify Integration

In Claude Code:

```
List my RemoteDevAI projects
```

You should see your projects listed.

### Using MCP Tools

Claude Code can now:

```
# Create a project
"Using RemoteDevAI, create a new React app called my-portfolio"

# Generate code
"Generate a login component in my-app project"

# Review code
"Review the authentication code for security issues"

# Deploy
"Deploy my-app to staging"
```

See [MCP-TOOLS.md](MCP-TOOLS.md) for complete tool reference.

## File Synchronization

### How Sync Works

```
Local Change → Desktop Agent → Cloud Backend → Other Devices
     ↓
Broadcast to team members in real-time
```

### Sync Modes

#### Two-Way Sync (Default)

Changes sync in both directions:
- Local changes → Cloud
- Cloud changes → Local

```bash
remotedevai sync --mode=both
```

#### Upload Only

Local changes → Cloud only:

```bash
remotedevai sync --mode=up
```

#### Download Only

Cloud → Local only:

```bash
remotedevai sync --mode=down
```

### Watch Directories

Add directories to watch:

```bash
# Add a directory
remotedevai watch add ~/Projects/my-app

# List watched directories
remotedevai watch list

# Remove a directory
remotedevai watch remove ~/Projects/my-app
```

### Manual Sync

Force sync a project:

```bash
# Sync specific project
remotedevai sync my-project-id

# Sync all projects
remotedevai sync --all
```

### Exclude Patterns

Add patterns to exclude from sync:

```bash
# Via command
remotedevai exclude add "*.log"

# Edit config
remotedevai config edit

# Add to excludePatterns array
```

Default exclusions:
- `node_modules/`
- `.git/`
- `dist/`, `build/`
- `.env`, `.env.*`
- `*.log`
- `.DS_Store` (macOS)
- `Thumbs.db` (Windows)

### Conflict Resolution

When conflicts occur:

```bash
# List conflicts
remotedevai conflicts

# Resolve with cloud version
remotedevai resolve <file> --use=cloud

# Resolve with local version
remotedevai resolve <file> --use=local

# Attempt merge
remotedevai resolve <file> --merge
```

### Sync Status

```bash
# Real-time sync status
remotedevai sync status

# Output:
# Sync Status
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# my-app:           ✓ Synced (2 files)
# portfolio:        ↑ Uploading (1 file)
# api-backend:      ✓ Synced
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Total:           3 projects, 0 conflicts
```

## Commands Reference

### Global Commands

#### `remotedevai start`

Start the desktop agent.

```bash
# Start in foreground
remotedevai start

# Start as daemon
remotedevai start --daemon

# Start with system tray
remotedevai start --tray

# Start with custom config
remotedevai start --config=/path/to/config.json
```

---

#### `remotedevai stop`

Stop the desktop agent.

```bash
remotedevai stop
```

---

#### `remotedevai restart`

Restart the desktop agent.

```bash
remotedevai restart
```

---

#### `remotedevai status`

Show agent status.

```bash
remotedevai status

# JSON output
remotedevai status --json
```

---

### Authentication

#### `remotedevai login`

Login with browser.

```bash
remotedevai login
```

---

#### `remotedevai logout`

Logout and clear credentials.

```bash
remotedevai logout
```

---

#### `remotedevai auth`

Authenticate with API key.

```bash
remotedevai auth --api-key YOUR_KEY
```

---

### Project Management

#### `remotedevai projects`

List all projects.

```bash
# List projects
remotedevai projects

# List with details
remotedevai projects --detailed

# JSON output
remotedevai projects --json
```

---

#### `remotedevai create`

Create a new project.

```bash
remotedevai create my-app --language=javascript --framework=react
```

---

#### `remotedevai link`

Link local directory to cloud project.

```bash
remotedevai link ~/Projects/my-app --project=my-project-id
```

---

#### `remotedevai unlink`

Unlink local directory.

```bash
remotedevai unlink ~/Projects/my-app
```

---

### Sync Commands

#### `remotedevai sync`

Sync projects.

```bash
# Sync all
remotedevai sync --all

# Sync specific project
remotedevai sync my-project-id

# Sync with mode
remotedevai sync --mode=up  # or down, both
```

---

#### `remotedevai watch`

Manage watched directories.

```bash
# Add watch
remotedevai watch add ~/Projects/my-app

# Remove watch
remotedevai watch remove ~/Projects/my-app

# List watches
remotedevai watch list
```

---

### MCP Commands

#### `remotedevai mcp`

Start MCP server.

```bash
# Start MCP server
remotedevai mcp

# Start with verbose logging
remotedevai mcp --verbose

# Custom port
remotedevai mcp --port=3005
```

---

#### `remotedevai mcp list-tools`

List available MCP tools.

```bash
remotedevai mcp list-tools
```

---

#### `remotedevai mcp stats`

View MCP usage statistics.

```bash
remotedevai mcp stats
```

---

### Configuration

#### `remotedevai config`

Manage configuration.

```bash
# View config
remotedevai config show

# Edit config
remotedevai config edit

# Set value
remotedevai config set sync.interval 10000

# Get value
remotedevai config get sync.interval
```

---

### Logs

#### `remotedevai logs`

View logs.

```bash
# Tail logs
remotedevai logs --follow

# Last 100 lines
remotedevai logs --tail=100

# Filter by level
remotedevai logs --level=error

# Clear logs
remotedevai logs --clear
```

---

### Updates

#### `remotedevai update`

Update desktop agent.

```bash
# Check for updates
remotedevai update check

# Install update
remotedevai update install

# Auto-update
remotedevai update --auto
```

---

### Utilities

#### `remotedevai test-connection`

Test cloud connection.

```bash
remotedevai test-connection
```

---

#### `remotedevai diagnostics`

Run diagnostics.

```bash
remotedevai diagnostics

# Save to file
remotedevai diagnostics --output=diagnostics.json
```

---

#### `remotedevai version`

Show version.

```bash
remotedevai --version
```

---

## Troubleshooting

### Agent Won't Start

**Error**: "Port 3002 already in use"

**Solution**:
```bash
# Check what's using the port
lsof -i :3002  # macOS/Linux
netstat -ano | findstr :3002  # Windows

# Use different port
remotedevai config set localPort 3004
remotedevai start
```

---

### Authentication Failed

**Error**: "Invalid API key"

**Solution**:
```bash
# Re-authenticate
remotedevai logout
remotedevai login

# Or generate new API key and use it
remotedevai auth --api-key NEW_KEY
```

---

### Sync Not Working

**Issue**: Files not syncing

**Solutions**:
```bash
# Check sync status
remotedevai sync status

# Force sync
remotedevai sync --all --force

# Check logs
remotedevai logs --level=error

# Restart agent
remotedevai restart
```

---

### MCP Tools Not Available

**Issue**: Claude Code doesn't see tools

**Solutions**:
```bash
# Verify MCP server is running
remotedevai mcp stats

# Check Claude Code config
cat ~/.claude/config.json

# Restart both
remotedevai restart
# Then restart Claude Code
```

---

### High CPU Usage

**Issue**: Desktop agent using too much CPU

**Solutions**:
```bash
# Reduce sync frequency
remotedevai config set sync.interval 30000  # 30 seconds

# Disable auto-sync temporarily
remotedevai config set sync.autoSync false

# Check what's syncing
remotedevai sync status

# Exclude large directories
remotedevai exclude add "large-data-dir"
```

---

### File Conflicts

**Issue**: Merge conflicts during sync

**Solutions**:
```bash
# List conflicts
remotedevai conflicts

# Use cloud version
remotedevai resolve conflicted-file.js --use=cloud

# Use local version
remotedevai resolve conflicted-file.js --use=local

# Manual merge
# Edit the file manually, then:
remotedevai resolve conflicted-file.js --mark-resolved
```

---

## Advanced Features

### System Tray App

Start with system tray icon:

```bash
remotedevai start --tray
```

Features:
- Quick project access
- Sync status indicator
- Notifications
- Quick actions menu

### Auto-Start on Boot

#### macOS

```bash
# Enable
remotedevai config set autoStart true

# This creates launch agent in ~/Library/LaunchAgents/
```

#### Linux (systemd)

```bash
# Create systemd service
cat > ~/.config/systemd/user/remotedevai.service <<EOF
[Unit]
Description=RemoteDevAI Desktop Agent

[Service]
ExecStart=/usr/bin/remotedevai start

[Install]
WantedBy=default.target
EOF

# Enable service
systemctl --user enable remotedevai
systemctl --user start remotedevai
```

#### Windows

```powershell
# Run as administrator
remotedevai install-service
```

### Custom Hooks

Execute custom scripts on events:

Edit config:
```json
{
  "hooks": {
    "beforeSync": "~/scripts/pre-sync.sh",
    "afterSync": "~/scripts/post-sync.sh",
    "onConflict": "~/scripts/handle-conflict.sh"
  }
}
```

### API Server

Desktop agent exposes local API:

```bash
# Start with API enabled
remotedevai start --api

# Default: http://localhost:3002/api
```

Endpoints:
- `GET /health` - Health check
- `GET /projects` - List projects
- `POST /sync` - Trigger sync
- `GET /status` - Agent status

---

## Best Practices

1. **Keep Agent Running**: Start on boot for seamless sync
2. **Exclude Large Files**: Add to excludePatterns
3. **Monitor Logs**: Check logs regularly for issues
4. **Update Regularly**: Keep agent updated
5. **Backup Config**: Save config before major changes
6. **Use Version Control**: Git works alongside sync

---

**Next**: Learn about [Deployment](DEPLOYMENT.md) for production setup.
