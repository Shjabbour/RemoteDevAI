# RemoteDevAI Quick Start Guide

Get up and running with RemoteDevAI in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm 9+ installed
- Git installed

## Quick Setup

### 1. Navigate to Project

```bash
cd C:/Users/Charbel/Desktop/github/Shjabbour/RemoteDevAI
```

### 2. Install Dependencies

```bash
npm install
```

This will install dependencies for all workspaces (apps and packages).

### 3. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and add your API keys (minimum required):

```bash
# Required: AI API Keys
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
OPENAI_API_KEY=sk-your-key-here
GOOGLE_AI_API_KEY=AIza-your-key-here

# Required: Google Cloud (for voice)
GOOGLE_CLOUD_API_KEY=AIza-your-key-here
```

### 4. Start Development Servers

```bash
# Start all services
npm run dev
```

This starts:
- Cloud Backend: http://localhost:3001
- Web Dashboard: http://localhost:3000
- Mobile App: http://localhost:19006 (Expo)

## Next Steps

Read the full documentation:
- [README.md](./README.md) - Project overview
- [docs/SETUP.md](./docs/SETUP.md) - Detailed setup
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System design

---

Happy coding with AI!
