# RemoteDevAI Documentation

Welcome to the RemoteDevAI documentation. This guide will help you understand, set up, and use the RemoteDevAI platform.

## What is RemoteDevAI?

RemoteDevAI is an AI-powered development platform that enables developers to build, test, and deploy software from anywhere using natural language and voice commands. The system combines mobile apps, desktop agents, cloud infrastructure, and AI agents to provide a seamless development experience.

## Documentation Index

### Getting Started

- **[Setup Guide](SETUP.md)** - Installation and configuration instructions
- **[Quick Start](#quick-start)** - Get up and running in 5 minutes

### Core Documentation

- **[Architecture](ARCHITECTURE.md)** - System design and component overview
- **[API Reference](API.md)** - Complete REST API and WebSocket documentation
- **[Agents Guide](AGENTS.md)** - Detailed documentation of all 10 AI agents
- **[MCP Tools](MCP-TOOLS.md)** - Model Context Protocol tools reference

### Platform-Specific Guides

- **[Mobile App](MOBILE-APP.md)** - Mobile application features and usage
- **[Desktop Agent](DESKTOP-AGENT.md)** - Desktop agent setup and integration
- **[Deployment](DEPLOYMENT.md)** - Production deployment guide

### Development

- **[Contributing](CONTRIBUTING.md)** - How to contribute to RemoteDevAI
- **[Security](SECURITY.md)** - Security model and best practices

## Quick Start

### 1. Install the Desktop Agent

```bash
# Download and install
npm install -g @remotedevai/desktop-agent

# Configure
remotedevai configure --api-key YOUR_API_KEY
```

### 2. Install Mobile App

- **iOS**: Download from App Store
- **Android**: Download from Google Play Store

### 3. Connect and Start Coding

```bash
# Start the desktop agent
remotedevai start

# Use voice or text to create a project
"Create a new React app called my-project"
```

## Key Features

### Voice-Powered Development

- Use natural language to write code
- Voice commands for git operations
- Hands-free coding experience

### 10 Specialized AI Agents

1. **Code Generation Agent** - Write code from descriptions
2. **Code Review Agent** - Automated code reviews
3. **Testing Agent** - Generate and run tests
4. **Debugging Agent** - Find and fix bugs
5. **Refactoring Agent** - Improve code quality
6. **Documentation Agent** - Generate documentation
7. **DevOps Agent** - Deploy and manage infrastructure
8. **Database Agent** - Design and manage databases
9. **API Agent** - Create and test APIs
10. **Security Agent** - Security scanning and fixes

### Cross-Platform Support

- **Mobile Apps** (iOS/Android) - Voice input, project management
- **Desktop Agent** - Local development, Claude Code integration
- **Web Dashboard** - Cloud management, collaboration
- **CLI Tools** - Command-line interface

### Claude Code Integration

- Seamless integration with Anthropic's Claude Code
- MCP tools for extended capabilities
- Context-aware AI assistance

## Architecture Overview

```
┌─────────────────┐
│   Mobile App    │
│  (iOS/Android)  │
└────────┬────────┘
         │
         │ HTTPS/WSS
         │
┌────────▼────────────────────────────────────┐
│         Cloud Backend (Node.js)             │
│  ┌──────────────────────────────────────┐  │
│  │     API Gateway + WebSocket Server   │  │
│  └────────┬─────────────────────────────┘  │
│           │                                 │
│  ┌────────▼─────────┐  ┌─────────────────┐ │
│  │   AI Agents      │  │   Job Queue     │ │
│  │   (10 agents)    │  │   (Bull/Redis)  │ │
│  └──────────────────┘  └─────────────────┘ │
│                                             │
│  ┌──────────────────┐  ┌─────────────────┐ │
│  │   PostgreSQL     │  │   Redis Cache   │ │
│  └──────────────────┘  └─────────────────┘ │
└────────┬────────────────────────────────────┘
         │
         │ HTTPS/WSS
         │
┌────────▼────────┐
│ Desktop Agent   │
│ + Claude Code   │
│ + MCP Tools     │
└─────────────────┘
```

## System Requirements

### Desktop Agent

- **OS**: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)
- **Node.js**: 18.x or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB for agent + project space

### Mobile App

- **iOS**: iOS 14.0 or higher
- **Android**: Android 8.0 (API level 26) or higher
- **Internet**: Required for AI features

### Cloud Backend

- **Node.js**: 18.x or higher
- **PostgreSQL**: 14.x or higher
- **Redis**: 6.x or higher
- **RAM**: 2GB minimum, 4GB+ recommended

## Support

- **Documentation**: [docs.remotedevai.com](https://docs.remotedevai.com)
- **GitHub Issues**: [github.com/Shjabbour/RemoteDevAI/issues](https://github.com/Shjabbour/RemoteDevAI/issues)
- **Discord**: [discord.gg/remotedevai](https://discord.gg/remotedevai)
- **Email**: support@remotedevai.com

## License

RemoteDevAI is open-source software licensed under the MIT License. See [LICENSE](../LICENSE) for details.

## Next Steps

1. Read the [Setup Guide](SETUP.md) to install RemoteDevAI
2. Review the [Architecture](ARCHITECTURE.md) to understand the system
3. Explore the [Agents Guide](AGENTS.md) to learn about AI capabilities
4. Check out [Examples](../examples/) for sample projects

---

**Happy Coding with AI!**
