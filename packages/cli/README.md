# @remotedevai/cli

Official CLI tool for managing RemoteDevAI desktop agent - AI-powered remote development made simple.

## Features

- **Easy Installation** - Install globally via npm
- **Interactive Setup** - Guided project initialization
- **Agent Management** - Start, stop, and monitor desktop agent
- **Auto Updates** - Keep your agent up-to-date
- **Diagnostics** - Built-in troubleshooting tools
- **Beautiful UI** - Colorful output with spinners and progress bars

## Installation

### Global Installation (Recommended)

```bash
npm install -g @remotedevai/cli
```

### Using npx (No Installation)

```bash
npx @remotedevai/cli <command>
```

### Verify Installation

```bash
remotedevai --version
```

## Quick Start

### 1. Login to RemoteDevAI

```bash
remotedevai login
```

You'll be prompted for your email and password. Alternatively, use an API key:

```bash
remotedevai login --api-key YOUR_API_KEY
```

### 2. Initialize Your Project

```bash
remotedevai init
```

This will:
- Connect to your RemoteDevAI account
- Let you select or create a project
- Download and install the desktop agent

### 3. Start the Agent

```bash
remotedevai start
```

The agent will start in the background. To run in foreground mode:

```bash
remotedevai start --foreground
```

### 4. Check Status

```bash
remotedevai status
```

## Commands

### Authentication

#### `remotedevai login`

Authenticate with RemoteDevAI cloud.

```bash
# Interactive login
remotedevai login

# Login with email
remotedevai login --email user@example.com

# Login with API key
remotedevai login --api-key YOUR_API_KEY
```

**Options:**
- `-e, --email <email>` - Email address
- `-k, --api-key <key>` - API key (skip password prompt)

#### `remotedevai logout`

Clear authentication credentials.

```bash
remotedevai logout
```

---

### Project Setup

#### `remotedevai init`

Initialize RemoteDevAI project connection.

```bash
# Interactive initialization
remotedevai init

# Initialize with specific project
remotedevai init --project-id PROJECT_ID

# Skip agent download
remotedevai init --skip-download
```

**Options:**
- `-p, --project-id <id>` - Project ID to connect to
- `--skip-download` - Skip agent download

---

### Agent Management

#### `remotedevai start`

Start the desktop agent.

```bash
# Start in background (default)
remotedevai start

# Start in foreground
remotedevai start --foreground

# Alias for background mode
remotedevai start --detached
```

**Options:**
- `-d, --detached` - Run agent in background (default: true)
- `-f, --foreground` - Run agent in foreground

#### `remotedevai stop`

Stop the desktop agent.

```bash
remotedevai stop
```

#### `remotedevai restart`

Restart the desktop agent.

```bash
# Restart in background
remotedevai restart

# Restart in foreground
remotedevai restart --foreground
```

**Options:**
- `-d, --detached` - Run agent in background (default: true)
- `-f, --foreground` - Run agent in foreground

#### `remotedevai status`

Check desktop agent status.

```bash
# Human-readable status
remotedevai status

# JSON output
remotedevai status --json
```

**Options:**
- `-j, --json` - Output in JSON format

---

### Logs

#### `remotedevai logs`

View agent logs.

```bash
# Show last 50 lines
remotedevai logs

# Show last 100 lines
remotedevai logs --lines 100

# Follow logs (like tail -f)
remotedevai logs --follow

# Filter by log level
remotedevai logs --level error

# Search logs
remotedevai logs --grep "connection"

# View CLI logs
remotedevai logs --cli
```

**Options:**
- `-f, --follow` - Follow log output (tail -f)
- `-n, --lines <number>` - Number of lines to show (default: 50)
- `--level <level>` - Filter by log level (debug|info|warn|error)
- `--grep <pattern>` - Filter logs by pattern
- `--cli` - Show CLI logs instead of agent logs

---

### Updates

#### `remotedevai update`

Update desktop agent to latest version.

```bash
# Update to latest version
remotedevai update

# Check for updates without installing
remotedevai update --check

# Force update even if on latest version
remotedevai update --force
```

**Options:**
- `--check` - Check for updates without installing
- `--force` - Force update even if already on latest version

---

### Configuration

#### `remotedevai config`

Configure RemoteDevAI settings.

```bash
# Interactive configuration
remotedevai config

# List all settings
remotedevai config --list

# Get specific setting
remotedevai config --get apiUrl

# Set specific setting
remotedevai config --set logLevel debug

# Reset all configuration
remotedevai config --reset
```

**Options:**
- `-l, --list` - List all configuration values
- `-g, --get <key>` - Get a specific configuration value
- `-s, --set <key> <value>` - Set a configuration value
- `--reset` - Reset all configuration

**Available Settings:**
- `apiUrl` - API endpoint URL
- `logLevel` - Logging level (debug, info, warn, error)
- `autoUpdate` - Enable/disable auto-updates
- `projectId` - Current project ID

---

### Diagnostics

#### `remotedevai doctor`

Diagnose RemoteDevAI installation issues.

```bash
# Run diagnostics
remotedevai doctor

# Verbose output
remotedevai doctor --verbose
```

**Options:**
- `--verbose` - Show detailed diagnostic information

**Checks:**
- System compatibility
- Node.js version
- Authentication status
- Configuration
- Agent installation
- Agent status
- API connectivity
- Disk space
- File permissions

---

## Configuration

Configuration is stored in `~/.remotedevai/config.json`.

### Default Configuration

```json
{
  "apiUrl": "https://api.remotedevai.com",
  "logLevel": "info",
  "autoUpdate": true
}
```

### Configuration Locations

- **Config File:** `~/.remotedevai/config.json`
- **Agent Directory:** `~/.remotedevai/agent/`
- **Logs Directory:** `~/.remotedevai/logs/`

## Environment Variables

You can override configuration using environment variables:

```bash
# API URL
export REMOTEDEVAI_API_URL=https://api.remotedevai.com

# Log level
export REMOTEDEVAI_LOG_LEVEL=debug
```

## Troubleshooting

### Agent Won't Start

```bash
# Run diagnostics
remotedevai doctor

# Check logs
remotedevai logs

# Try reinstalling
remotedevai update --force
```

### Connection Issues

```bash
# Check status
remotedevai status

# Verify authentication
remotedevai config --get apiKey

# Test API connectivity
remotedevai doctor
```

### Permission Errors

```bash
# Check file permissions
remotedevai doctor --verbose

# On Unix systems, ensure config directory is writable
chmod -R u+w ~/.remotedevai
```

### Update Issues

```bash
# Force update
remotedevai update --force

# Clear old installation
rm -rf ~/.remotedevai/agent
remotedevai update
```

## Examples

### Complete Setup Flow

```bash
# Install CLI
npm install -g @remotedevai/cli

# Login
remotedevai login

# Initialize project
remotedevai init

# Start agent
remotedevai start

# Check status
remotedevai status

# View logs
remotedevai logs --follow
```

### Daily Workflow

```bash
# Start agent in the morning
remotedevai start

# Check status
remotedevai status

# View logs if needed
remotedevai logs

# Stop agent at end of day
remotedevai stop
```

### Debugging

```bash
# Run diagnostics
remotedevai doctor --verbose

# View detailed logs
remotedevai logs --level debug --lines 200

# Follow logs in real-time
remotedevai logs --follow
```

## Updating the CLI

To update the CLI itself:

```bash
npm update -g @remotedevai/cli
```

Or reinstall:

```bash
npm install -g @remotedevai/cli@latest
```

## Uninstalling

### Uninstall CLI

```bash
npm uninstall -g @remotedevai/cli
```

### Remove All Data

```bash
# Remove configuration and agent
rm -rf ~/.remotedevai
```

## System Requirements

- **Node.js:** 18.0.0 or higher
- **Platforms:** macOS, Linux, Windows
- **Architecture:** x64, arm64
- **Disk Space:** At least 1GB free

## Support

- **Documentation:** https://docs.remotedevai.com
- **Issues:** https://github.com/Shjabbour/RemoteDevAI/issues
- **Discord:** https://discord.gg/remotedevai

## Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/Shjabbour/RemoteDevAI.git
cd RemoteDevAI/packages/cli

# Install dependencies
npm install

# Build
npm run build

# Link locally
npm link

# Test
remotedevai --version
```

### Project Structure

```
packages/cli/
├── src/
│   ├── commands/        # CLI commands
│   │   ├── init.ts
│   │   ├── auth.ts
│   │   ├── agent.ts
│   │   ├── logs.ts
│   │   ├── update.ts
│   │   ├── config.ts
│   │   └── doctor.ts
│   ├── services/        # Business logic
│   │   ├── AgentManager.ts
│   │   ├── Downloader.ts
│   │   └── Updater.ts
│   ├── utils/           # Utilities
│   │   ├── banner.ts
│   │   ├── config.ts
│   │   ├── logger.ts
│   │   ├── spinner.ts
│   │   ├── prompts.ts
│   │   └── api.ts
│   └── index.ts         # Entry point
├── dist/                # Built files
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT License - see LICENSE file for details

## Contributing

We welcome contributions! Please see CONTRIBUTING.md for guidelines.

---

**Made with ❤️ by the RemoteDevAI team**
