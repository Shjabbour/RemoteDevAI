# RemoteDevAI CLI - Quick Start Guide

Get up and running with RemoteDevAI in under 5 minutes!

## Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- A RemoteDevAI account (sign up at https://remotedevai.com)

## Installation

### Option 1: Global Installation (Recommended)

```bash
npm install -g @remotedevai/cli
```

### Option 2: Using npx (No Installation)

```bash
npx @remotedevai/cli <command>
```

## Step-by-Step Setup

### 1. Verify Installation

```bash
remotedevai --version
```

You should see the version number printed.

### 2. Login to Your Account

```bash
remotedevai login
```

Enter your email and password when prompted.

**Alternative:** Use an API key

```bash
remotedevai login --api-key YOUR_API_KEY
```

### 3. Initialize Your First Project

```bash
remotedevai init
```

This interactive wizard will:
- Show you your existing projects
- Let you select a project or create a new one
- Download and install the desktop agent

**Example:**
```
? Select a project: (Use arrow keys)
❯ My Web App (proj_abc123)
  Mobile App (proj_def456)
  Create new project

? Enter project name: My Awesome Project
? Enter project description (optional): My first RemoteDevAI project

✓ Created project: My Awesome Project
✓ Connected to project: proj_xyz789
✓ Desktop agent already installed (version 1.0.0)

✓ Initialization complete!

Next steps:
  • Start the agent: remotedevai start
  • Check agent status: remotedevai status
  • View agent logs: remotedevai logs
```

### 4. Start the Desktop Agent

```bash
remotedevai start
```

The agent will start in the background.

**Output:**
```
✓ Agent started in background

View logs: remotedevai logs
Check status: remotedevai status
```

### 5. Verify Agent is Running

```bash
remotedevai status
```

**Output:**
```
=== RemoteDevAI Status ===

--- Authentication ---
  Email       : user@example.com
  Status      : Authenticated

--- Project ---
  Project ID  : proj_xyz789

--- Desktop Agent ---
  Status      : Running
  PID         : 12345
  Version     : 1.0.0
  Uptime      : 2m 15s

--- Configuration ---
  Config Dir  : /Users/username/.remotedevai
  Agent Dir   : /Users/username/.remotedevai/agent
  Logs Dir    : /Users/username/.remotedevai/logs
```

### 6. View Agent Logs (Optional)

```bash
remotedevai logs
```

To follow logs in real-time:

```bash
remotedevai logs --follow
```

Press `Ctrl+C` to stop following.

## Common Tasks

### Check for Updates

```bash
remotedevai update --check
```

### Update to Latest Version

```bash
remotedevai update
```

### Stop the Agent

```bash
remotedevai stop
```

### Restart the Agent

```bash
remotedevai restart
```

### View Configuration

```bash
remotedevai config --list
```

### Change Log Level

```bash
remotedevai config --set logLevel debug
```

### Run Diagnostics

```bash
remotedevai doctor
```

## Troubleshooting

### Agent Won't Start

1. Check if agent is already running:
   ```bash
   remotedevai status
   ```

2. Run diagnostics:
   ```bash
   remotedevai doctor
   ```

3. Check logs for errors:
   ```bash
   remotedevai logs --level error
   ```

### Authentication Issues

1. Verify you're logged in:
   ```bash
   remotedevai config --get email
   ```

2. If not logged in, login again:
   ```bash
   remotedevai logout
   remotedevai login
   ```

### Update Issues

1. Try force update:
   ```bash
   remotedevai update --force
   ```

2. If that fails, remove old installation:
   ```bash
   rm -rf ~/.remotedevai/agent
   remotedevai update
   ```

## Daily Workflow

### Morning Routine

```bash
# Start agent
remotedevai start

# Check status
remotedevai status
```

### During the Day

```bash
# View logs if needed
remotedevai logs

# Check for updates
remotedevai update --check
```

### End of Day

```bash
# Stop agent
remotedevai stop
```

## Advanced Usage

### Run Agent in Foreground

Useful for debugging:

```bash
remotedevai start --foreground
```

Press `Ctrl+C` to stop.

### Filter Logs

By log level:
```bash
remotedevai logs --level error
```

By pattern:
```bash
remotedevai logs --grep "connection"
```

Show more lines:
```bash
remotedevai logs --lines 200
```

### Configure API URL

For custom deployments:

```bash
remotedevai config --set apiUrl https://your-api.example.com
```

### View Detailed Diagnostics

```bash
remotedevai doctor --verbose
```

## Getting Help

### Command Help

Get help for any command:

```bash
remotedevai <command> --help
```

Examples:
```bash
remotedevai login --help
remotedevai start --help
remotedevai logs --help
```

### General Help

```bash
remotedevai --help
```

## Next Steps

Now that you have RemoteDevAI set up:

1. **Open the Web Dashboard** - Visit https://app.remotedevai.com to see your agent online
2. **Connect Your IDE** - Install the RemoteDevAI extension for VS Code or your favorite IDE
3. **Start Coding** - Begin developing remotely with AI assistance!

## Resources

- **Documentation:** https://docs.remotedevai.com
- **API Reference:** https://docs.remotedevai.com/api
- **Video Tutorials:** https://youtube.com/@remotedevai
- **Community Discord:** https://discord.gg/remotedevai
- **GitHub Issues:** https://github.com/Shjabbour/RemoteDevAI/issues

## Support

Need help? We're here for you!

- **Email:** support@remotedevai.com
- **Discord:** https://discord.gg/remotedevai
- **GitHub Discussions:** https://github.com/Shjabbour/RemoteDevAI/discussions

---

**Happy Coding with RemoteDevAI!** 🚀
