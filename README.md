# RemoteDevAI

> Control AI coding assistants from your phone - Voice-controlled development with Claude, GPT-4, and more

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

## Overview

RemoteDevAI is a revolutionary platform that lets you control AI coding assistants from your phone using voice commands. Whether you're commuting, in a meeting, or away from your desk, you can direct AI agents to write code, fix bugs, run tests, and manage your development workflow.

### Key Features

- **Voice-First Interface**: Natural voice commands to control AI coding agents
- **Multi-Agent System**: 10 specialized AI agents for different development tasks
- **Cross-Platform**: Mobile app (iOS/Android), Desktop agent, and Web dashboard
- **Real-Time Sync**: See changes in real-time as AI agents work
- **MCP Integration**: Model Context Protocol tools for advanced AI capabilities
- **Multi-LLM Support**: Works with Claude, GPT-4, Gemini, and more
- **Secure**: End-to-end encryption for code and communications

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        RemoteDevAI Platform                      │
└─────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │  Mobile App  │ (React Native + Expo)
                    │  iOS/Android │ - Voice input/output
                    │              │ - Task management
                    │              │ - Real-time monitoring
                    └──────┬───────┘
                           │
                           │ WebSocket + REST
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    │              ┌───────▼────────┐             │
    │              │  Cloud Backend │             │
    │              │   (Node.js)    │             │
    │              │                │             │
    │              │ - Auth service │             │
    │              │ - Task queue   │             │
    │              │ - WebSocket    │             │
    │              │ - LLM routing  │             │
    │              └───────┬────────┘             │
    │                      │                      │
┌───▼────┐          ┌─────▼──────┐        ┌─────▼──────┐
│  Web   │          │  Desktop   │        │  AI Agent  │
│Dashboard│         │   Agent    │        │   Fleet    │
│(Next.js)│         │(Electron)  │        │            │
│        │          │            │        │ 10 Agents: │
│- Monitor│         │- Runs on   │        │ - Coder    │
│- Config │         │  dev PC    │        │ - Debugger │
│- Logs   │         │- Executes  │        │ - Tester   │
└────────┘          │  commands  │        │ - Reviewer │
                    │- File ops  │        │ - DevOps   │
                    │- Git ops   │        │ - Designer │
                    └────────────┘        │ - Writer   │
                                          │ - Analyst  │
                                          │ - Security │
                                          │ - Manager  │
                                          └────────────┘
                                                 │
                                          ┌──────▼─────┐
                                          │ MCP Tools  │
                                          │            │
                                          │- File ops  │
                                          │- Git       │
                                          │- Terminal  │
                                          │- Search    │
                                          │- Database  │
                                          └────────────┘
```

## Project Structure

```
RemoteDevAI/
├── apps/
│   ├── mobile/          # React Native Expo app
│   │   ├── src/
│   │   ├── app.json
│   │   └── package.json
│   ├── desktop/         # Electron desktop agent
│   │   ├── src/
│   │   ├── main.js
│   │   └── package.json
│   ├── web/             # Next.js landing + dashboard
│   │   ├── src/
│   │   ├── app/
│   │   └── package.json
│   └── cloud/           # Node.js backend API
│       ├── src/
│       ├── server.js
│       └── package.json
├── packages/
│   ├── shared/          # Shared types and utilities
│   │   ├── src/
│   │   ├── types/
│   │   └── package.json
│   ├── agents/          # The 10 AI agents
│   │   ├── src/
│   │   ├── coder/
│   │   ├── debugger/
│   │   ├── tester/
│   │   └── package.json
│   └── mcp-tools/       # MCP tool implementations
│       ├── src/
│       ├── file-ops/
│       ├── git/
│       └── package.json
├── docs/                # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── AGENTS.md
│   └── SETUP.md
├── scripts/             # Build and deployment scripts
│   ├── setup.sh
│   ├── deploy.sh
│   └── test-all.sh
├── infra/               # Docker, K8s configs
│   ├── docker/
│   ├── k8s/
│   └── docker-compose.yml
├── .gitignore
├── .env.example
├── package.json         # Root monorepo config
├── turbo.json          # Turborepo configuration
└── README.md           # This file
```

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- Expo CLI (for mobile development)
- Electron (for desktop development)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Shjabbour/RemoteDevAI.git
cd RemoteDevAI
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

4. Start development servers:
```bash
# Start all services
npm run dev

# Or start individual services
npm run dev:mobile    # Mobile app
npm run dev:desktop   # Desktop agent
npm run dev:web       # Web dashboard
npm run dev:cloud     # Backend API
```

### Environment Setup

See `.env.example` for all required environment variables. You'll need:

- **Anthropic API Key** (for Claude)
- **OpenAI API Key** (for GPT-4)
- **Google AI API Key** (for Gemini)
- **Database credentials** (PostgreSQL/MongoDB)
- **Authentication secrets** (JWT, OAuth)
- **Cloud storage** (AWS S3 or Google Cloud Storage)

## The 10 AI Agents

RemoteDevAI includes 10 specialized AI agents, each designed for specific development tasks:

1. **Coder Agent** - Writes and refactors code
2. **Debugger Agent** - Identifies and fixes bugs
3. **Tester Agent** - Creates and runs tests
4. **Reviewer Agent** - Code review and quality checks
5. **DevOps Agent** - Deployment and infrastructure
6. **Designer Agent** - UI/UX and styling
7. **Writer Agent** - Documentation and comments
8. **Analyst Agent** - Performance and analytics
9. **Security Agent** - Security audits and fixes
10. **Manager Agent** - Project planning and coordination

Each agent uses the Model Context Protocol (MCP) to interact with your development environment.

## Usage Examples

### Voice Commands

```
"Hey Claude, create a new React component for user authentication"
"Debug the login function in auth.js"
"Run all tests and fix any failures"
"Review my latest commit and suggest improvements"
"Deploy to staging environment"
```

### Mobile App

1. Open the app on your phone
2. Tap the microphone button
3. Speak your command
4. Watch as the AI agent executes the task
5. Review and approve changes

### Desktop Agent

The desktop agent runs on your development machine and:
- Executes commands from the mobile app
- Manages file operations
- Handles Git operations
- Provides real-time updates

### Web Dashboard

Monitor and manage your AI agents:
- View active tasks
- Check logs and outputs
- Configure agent settings
- Manage API keys and integrations

## Development

### Building

```bash
# Build all packages
npm run build

# Build specific package
npm run build:mobile
npm run build:desktop
npm run build:web
npm run build:cloud
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Linting

```bash
# Lint all packages
npm run lint

# Fix linting issues
npm run lint:fix
```

### Type Checking

```bash
npm run typecheck
```

## Deployment

### Docker

```bash
docker-compose up -d
```

### Kubernetes

```bash
kubectl apply -f infra/k8s/
```

### Cloud Platforms

Deployment guides for:
- AWS
- Google Cloud Platform
- Azure
- Vercel (for web dashboard)

See `docs/DEPLOYMENT.md` for detailed instructions.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Security

- All communications are end-to-end encrypted
- API keys are stored securely using platform keychain
- Code is never sent to third parties without explicit consent
- Regular security audits

Report security vulnerabilities to security@remotedevai.com

## Roadmap

- [ ] v1.0: Core functionality (voice commands, basic agents)
- [ ] v1.1: Advanced agents (DevOps, Security)
- [ ] v1.2: Multi-user collaboration
- [ ] v1.3: Plugin system
- [ ] v2.0: Self-hosting support
- [ ] v2.1: VSCode extension
- [ ] v2.2: GitHub Actions integration

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Built with [Claude](https://www.anthropic.com/) by Anthropic
- Powered by [Model Context Protocol](https://modelcontextprotocol.io/)
- Voice processing by [Google Speech API](https://cloud.google.com/speech-to-text)
- Infrastructure by [Docker](https://www.docker.com/) and [Kubernetes](https://kubernetes.io/)

## Support

- Documentation: [docs/](docs/)
- Issues: [GitHub Issues](https://github.com/Shjabbour/RemoteDevAI/issues)
- Discussions: [GitHub Discussions](https://github.com/Shjabbour/RemoteDevAI/discussions)
- Email: support@remotedevai.com

## Links

- [Website](https://remotedevai.com)
- [Documentation](https://docs.remotedevai.com)
- [Blog](https://blog.remotedevai.com)
- [Twitter](https://twitter.com/remotedevai)

---

**Built with ❤️ by Shjabbour**
