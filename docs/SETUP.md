# RemoteDevAI Setup Guide

This comprehensive guide will walk you through installing and configuring all components of RemoteDevAI.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Cloud Backend Setup](#cloud-backend-setup)
- [Desktop Agent Setup](#desktop-agent-setup)
- [Mobile App Setup](#mobile-app-setup)
- [Configuration](#configuration)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js**: Version 18.x or higher ([Download](https://nodejs.org/))
- **PostgreSQL**: Version 14.x or higher ([Download](https://www.postgresql.org/download/))
- **Redis**: Version 6.x or higher ([Download](https://redis.io/download))
- **Git**: Latest version ([Download](https://git-scm.com/downloads))

### Required Accounts

- **Anthropic API**: For Claude AI ([Sign up](https://console.anthropic.com/))
- **GitHub**: For repository management (optional)
- **Cloud Provider**: AWS, GCP, or Azure for production (optional)

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4GB | 8GB+ |
| Storage | 10GB | 50GB+ |
| OS | Windows 10, macOS 10.15, Ubuntu 20.04 | Latest |

## Quick Start

For a rapid setup using default configurations:

```bash
# 1. Clone the repository
git clone https://github.com/Shjabbour/RemoteDevAI.git
cd RemoteDevAI

# 2. Run quick setup script
npm run quick-setup

# 3. Start all services
npm run dev
```

This will:
- Install all dependencies
- Set up local database
- Configure environment variables
- Start backend, frontend, and desktop agent

For detailed setup, continue reading below.

## Cloud Backend Setup

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/Shjabbour/RemoteDevAI.git
cd RemoteDevAI

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 2. Database Setup

#### PostgreSQL

```bash
# Create database
createdb remotedevai

# Create user
psql -c "CREATE USER remotedevai WITH PASSWORD 'your_password';"

# Grant privileges
psql -c "GRANT ALL PRIVILEGES ON DATABASE remotedevai TO remotedevai;"

# Run migrations
npm run migrate
```

**Migration File Structure:**
```
migrations/
├── 001_initial_schema.sql
├── 002_add_agents.sql
├── 003_add_projects.sql
└── ...
```

#### Redis

```bash
# Start Redis server
redis-server

# Or as a service (Linux)
sudo systemctl start redis

# Or using Docker
docker run -d -p 6379:6379 redis:latest
```

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### 3. Environment Configuration

Create `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# Server Configuration
NODE_ENV=development
PORT=3001
API_URL=http://localhost:3001

# Database
DATABASE_URL=postgresql://remotedevai:your_password@localhost:5432/remotedevai
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# Authentication
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your_super_secret_refresh_key_min_32_chars
REFRESH_TOKEN_EXPIRES_IN=7d

# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=4096

# File Storage (S3-compatible)
STORAGE_TYPE=local
# For S3:
# STORAGE_TYPE=s3
# AWS_ACCESS_KEY_ID=your_access_key
# AWS_SECRET_ACCESS_KEY=your_secret_key
# AWS_REGION=us-east-1
# S3_BUCKET=remotedevai-files

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Agent Configuration
AGENT_TIMEOUT_MS=300000
AGENT_MAX_RETRIES=3
AGENT_CONCURRENCY=5

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring (optional)
SENTRY_DSN=
PROMETHEUS_PORT=9090
```

### 4. Start Backend Services

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

The backend will start on `http://localhost:3001`

### 5. Start Frontend Dashboard

```bash
cd client
npm run dev
```

The frontend will start on `http://localhost:5173`

## Desktop Agent Setup

### 1. Install Desktop Agent

#### Option A: Install from NPM (Production)

```bash
npm install -g @remotedevai/desktop-agent
```

#### Option B: Build from Source (Development)

```bash
cd desktop-agent
npm install
npm run build

# Link globally
npm link
```

### 2. Configure Desktop Agent

```bash
# Initialize configuration
remotedevai init

# This creates ~/.remotedevai/config.json
```

Edit configuration file:

```json
{
  "cloudUrl": "https://api.remotedevai.com",
  "apiKey": "your_api_key_here",
  "localPort": 3002,
  "syncEnabled": true,
  "watchPaths": [
    "~/Projects"
  ],
  "excludePatterns": [
    "node_modules",
    ".git",
    "dist",
    "build"
  ],
  "claudeCode": {
    "enabled": true,
    "mcpPort": 3003
  },
  "autoUpdate": true,
  "logLevel": "info"
}
```

### 3. Authenticate Desktop Agent

```bash
# Login with cloud account
remotedevai login

# Or use API key directly
remotedevai auth --api-key YOUR_API_KEY
```

### 4. Start Desktop Agent

```bash
# Start in foreground
remotedevai start

# Start in background
remotedevai start --daemon

# Start with system tray
remotedevai start --tray
```

Verify agent is running:
```bash
remotedevai status
```

### 5. Connect to Claude Code

The desktop agent automatically provides MCP tools to Claude Code. Ensure Claude Code is configured:

**Claude Code Config** (`~/.claude/config.json`):
```json
{
  "mcpServers": {
    "remotedevai": {
      "command": "remotedevai",
      "args": ["mcp"],
      "env": {}
    }
  }
}
```

Restart Claude Code to load the MCP server.

## Mobile App Setup

### iOS

1. **Download from App Store**
   - Search for "RemoteDevAI"
   - Install the app

2. **First Launch Setup**
   - Open the app
   - Tap "Get Started"
   - Sign in with your account or create new

3. **Permissions**
   - Grant microphone access for voice input
   - Grant notifications for real-time updates

4. **Connect to Desktop Agent** (optional)
   - Go to Settings → Desktop Agent
   - Scan QR code from desktop agent
   - Or enter connection code manually

### Android

1. **Download from Google Play Store**
   - Search for "RemoteDevAI"
   - Install the app

2. **First Launch Setup**
   - Same as iOS above

3. **Permissions**
   - Same as iOS above

### Development Build

For developers wanting to build from source:

```bash
cd mobile-app

# Install dependencies
npm install

# iOS
npx pod-install
npx react-native run-ios

# Android
npx react-native run-android
```

## Configuration

### Agent Configuration

Configure individual agents in `config/agents.json`:

```json
{
  "agents": [
    {
      "id": "code-generation",
      "name": "Code Generation Agent",
      "enabled": true,
      "model": "claude-3-5-sonnet-20241022",
      "maxTokens": 4096,
      "temperature": 0.7,
      "systemPrompt": "You are an expert software engineer...",
      "tools": ["read_file", "write_file", "execute_command"],
      "timeout": 300000,
      "maxRetries": 3
    },
    {
      "id": "code-review",
      "name": "Code Review Agent",
      "enabled": true,
      "model": "claude-3-5-sonnet-20241022",
      "maxTokens": 8192,
      "temperature": 0.3,
      "systemPrompt": "You are a senior code reviewer...",
      "tools": ["read_file", "search_code", "analyze_complexity"],
      "timeout": 300000,
      "maxRetries": 2
    }
    // ... other agents
  ]
}
```

### WebSocket Configuration

Configure real-time features in `config/websocket.json`:

```json
{
  "cors": {
    "origin": ["http://localhost:5173", "https://app.remotedevai.com"],
    "credentials": true
  },
  "pingInterval": 25000,
  "pingTimeout": 60000,
  "maxHttpBufferSize": 1e8,
  "transports": ["websocket", "polling"],
  "allowUpgrades": true
}
```

### Storage Configuration

#### Local Storage

```bash
# .env
STORAGE_TYPE=local
STORAGE_PATH=/var/remotedevai/storage
```

#### S3 Storage

```bash
# .env
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=remotedevai-files
S3_PREFIX=projects/
```

#### MinIO (Self-hosted S3)

```bash
# .env
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=remotedevai
S3_FORCE_PATH_STYLE=true
```

## Verification

### 1. Check Backend Health

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "agents": "ready"
  }
}
```

### 2. Check Database Connection

```bash
npm run db:test
```

### 3. Check Redis Connection

```bash
redis-cli -h localhost -p 6379 ping
```

### 4. Test Agent Execution

```bash
# Using curl
curl -X POST http://localhost:3001/api/agents/code-generation/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "task": "Create a hello world function in JavaScript",
    "context": {}
  }'
```

### 5. Test Desktop Agent

```bash
# Check status
remotedevai status

# Test sync
remotedevai sync test

# Test MCP tools
remotedevai mcp list-tools
```

### 6. Test Mobile App

1. Open the app
2. Tap microphone icon
3. Say "Create a new React project"
4. Verify response appears

## Troubleshooting

### Common Issues

#### Backend won't start

**Error**: `Port 3001 already in use`

**Solution**:
```bash
# Find process using port
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill process or change port in .env
PORT=3002
```

#### Database connection fails

**Error**: `ECONNREFUSED` or `authentication failed`

**Solution**:
```bash
# Check PostgreSQL is running
pg_isready

# Check credentials in .env
# Verify database exists
psql -l | grep remotedevai
```

#### Redis connection fails

**Error**: `Redis connection refused`

**Solution**:
```bash
# Start Redis
redis-server

# Or check if running
redis-cli ping
```

#### Desktop Agent authentication fails

**Error**: `Invalid API key`

**Solution**:
```bash
# Generate new API key from web dashboard
# Update config
remotedevai auth --api-key NEW_KEY

# Or re-login
remotedevai logout
remotedevai login
```

#### Claude API errors

**Error**: `429 Too Many Requests`

**Solution**:
- Check your Anthropic API quota
- Reduce `AGENT_CONCURRENCY` in `.env`
- Implement request throttling

**Error**: `Invalid API key`

**Solution**:
- Verify `ANTHROPIC_API_KEY` in `.env`
- Ensure no extra spaces or newlines
- Generate new key from Anthropic console

#### Mobile app won't connect

**Issue**: App shows "Unable to connect"

**Solution**:
1. Check backend is running and accessible
2. Verify `API_URL` in mobile app settings
3. Check firewall/network settings
4. For development: ensure mobile device on same network

#### MCP tools not showing in Claude Code

**Issue**: Claude Code doesn't see RemoteDevAI tools

**Solution**:
```bash
# Restart desktop agent
remotedevai restart

# Verify MCP server is running
remotedevai mcp status

# Check Claude Code config
cat ~/.claude/config.json

# Restart Claude Code
```

### Performance Issues

#### Slow agent responses

**Possible causes**:
1. High API latency
2. Large context size
3. Insufficient resources

**Solutions**:
```bash
# Monitor agent performance
npm run agent:monitor

# Reduce context size
# Edit config/agents.json
"maxTokens": 2048  # Instead of 4096

# Increase agent timeout
AGENT_TIMEOUT_MS=600000  # 10 minutes
```

#### High memory usage

**Solutions**:
```bash
# Limit job queue concurrency
# In .env
AGENT_CONCURRENCY=2  # Instead of 5

# Clear Redis cache
redis-cli FLUSHDB

# Restart services
npm run restart
```

### Logs and Debugging

#### View Backend Logs

```bash
# Real-time logs
npm run logs

# Last 100 lines
npm run logs -- --tail 100

# Specific service
npm run logs:agents
```

#### View Desktop Agent Logs

```bash
# View logs
remotedevai logs

# Last 50 lines
remotedevai logs --tail 50

# Follow logs
remotedevai logs --follow
```

#### Enable Debug Mode

```bash
# .env
LOG_LEVEL=debug
DEBUG=remotedevai:*

# Restart services
npm run restart
```

#### Database Debugging

```bash
# Enable query logging
# In .env
DB_LOGGING=true

# View slow queries
npm run db:analyze
```

### Getting Help

If you're still experiencing issues:

1. **Check Documentation**: Review [docs/README.md](README.md)
2. **Search Issues**: [GitHub Issues](https://github.com/Shjabbour/RemoteDevAI/issues)
3. **Community Discord**: [discord.gg/remotedevai](https://discord.gg/remotedevai)
4. **Create Issue**: Include logs, error messages, and steps to reproduce

## Next Steps

After successful setup:

1. **Read API Documentation**: [API.md](API.md)
2. **Explore Agents**: [AGENTS.md](AGENTS.md)
3. **Configure MCP Tools**: [MCP-TOOLS.md](MCP-TOOLS.md)
4. **Mobile App Guide**: [MOBILE-APP.md](MOBILE-APP.md)
5. **Production Deployment**: [DEPLOYMENT.md](DEPLOYMENT.md)

## Development Setup

For contributors and developers:

```bash
# Install development dependencies
npm install --include=dev

# Set up pre-commit hooks
npm run prepare

# Run tests
npm test

# Run linting
npm run lint

# Run type checking
npm run type-check

# Start in development mode with debugging
npm run dev:debug
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development guidelines.

---

**Congratulations!** You've successfully set up RemoteDevAI. Start building with AI!
