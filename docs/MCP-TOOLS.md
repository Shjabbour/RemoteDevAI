# RemoteDevAI MCP Tools Reference

Complete reference for Model Context Protocol (MCP) tools that integrate RemoteDevAI with Claude Code.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Available Tools](#available-tools)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Troubleshooting](#troubleshooting)

## Overview

MCP (Model Context Protocol) is Anthropic's standard for connecting AI assistants to external tools and data sources. RemoteDevAI provides MCP tools that allow Claude Code to:

- Execute AI agents remotely
- Access your cloud projects
- Sync files between desktop and cloud
- Manage deployments
- Collaborate in real-time

### Architecture

```
┌──────────────────┐
│   Claude Code    │
│                  │
│  ┌────────────┐  │
│  │ MCP Client │  │
│  └──────┬─────┘  │
└─────────┼────────┘
          │
          │ MCP Protocol
          │
┌─────────▼────────┐
│  Desktop Agent   │
│                  │
│  ┌────────────┐  │
│  │ MCP Server │  │
│  └──────┬─────┘  │
└─────────┼────────┘
          │
          │ HTTPS/WSS
          │
┌─────────▼────────┐
│  Cloud Backend   │
│  - AI Agents     │
│  - Projects      │
│  - Storage       │
└──────────────────┘
```

## Installation

### Prerequisites

- Claude Code installed
- RemoteDevAI Desktop Agent installed
- Active RemoteDevAI account

### Setup Steps

1. **Install Desktop Agent**

```bash
npm install -g @remotedevai/desktop-agent
```

2. **Configure MCP in Claude Code**

Edit `~/.claude/config.json`:

```json
{
  "mcpServers": {
    "remotedevai": {
      "command": "remotedevai",
      "args": ["mcp"],
      "env": {
        "REMOTEDEVAI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

3. **Start Desktop Agent**

```bash
remotedevai start
```

4. **Verify Connection**

In Claude Code:
```
Can you list my RemoteDevAI projects?
```

## Available Tools

### 1. `remotedevai_execute_agent`

Execute a RemoteDevAI AI agent.

**Parameters:**
- `agent_id` (string, required): Agent identifier
  - `code-generation`
  - `code-review`
  - `testing`
  - `debugging`
  - `refactoring`
  - `documentation`
  - `devops`
  - `database`
  - `api`
  - `security`
- `task` (string, required): Task description
- `project_id` (string, optional): Project context
- `files` (array, optional): Relevant file paths
- `context` (object, optional): Additional context

**Returns:**
- `task_id`: Unique task identifier
- `status`: Task status
- `result`: Agent execution result

**Example:**

```json
{
  "tool": "remotedevai_execute_agent",
  "parameters": {
    "agent_id": "code-generation",
    "task": "Create a React component for a user profile card",
    "project_id": "my-project-123",
    "context": {
      "framework": "react",
      "style": "tailwind"
    }
  }
}
```

---

### 2. `remotedevai_list_projects`

List all projects in your RemoteDevAI account.

**Parameters:**
- `limit` (number, optional): Max results (default: 20)
- `search` (string, optional): Search query

**Returns:**
Array of project objects with:
- `id`: Project identifier
- `name`: Project name
- `language`: Primary language
- `framework`: Framework used
- `status`: Current status
- `stats`: File count, lines of code, etc.

**Example:**

```json
{
  "tool": "remotedevai_list_projects",
  "parameters": {
    "limit": 10,
    "search": "react"
  }
}
```

---

### 3. `remotedevai_get_project`

Get detailed information about a specific project.

**Parameters:**
- `project_id` (string, required): Project identifier

**Returns:**
- Complete project details
- File structure
- Dependencies
- Git information
- Statistics

**Example:**

```json
{
  "tool": "remotedevai_get_project",
  "parameters": {
    "project_id": "my-project-123"
  }
}
```

---

### 4. `remotedevai_create_project`

Create a new project.

**Parameters:**
- `name` (string, required): Project name
- `description` (string, optional): Project description
- `language` (string, required): Programming language
- `framework` (string, optional): Framework to use
- `template` (string, optional): Project template

**Returns:**
- Created project details

**Example:**

```json
{
  "tool": "remotedevai_create_project",
  "parameters": {
    "name": "My New App",
    "description": "A modern web application",
    "language": "javascript",
    "framework": "react",
    "template": "react-vite"
  }
}
```

---

### 5. `remotedevai_read_file`

Read file content from a project.

**Parameters:**
- `project_id` (string, required): Project identifier
- `path` (string, required): File path

**Returns:**
- File content
- Metadata (size, modified date, etc.)

**Example:**

```json
{
  "tool": "remotedevai_read_file",
  "parameters": {
    "project_id": "my-project-123",
    "path": "/src/App.jsx"
  }
}
```

---

### 6. `remotedevai_write_file`

Write content to a file in a project.

**Parameters:**
- `project_id` (string, required): Project identifier
- `path` (string, required): File path
- `content` (string, required): File content
- `create_directories` (boolean, optional): Create parent dirs

**Returns:**
- Success confirmation
- File metadata

**Example:**

```json
{
  "tool": "remotedevai_write_file",
  "parameters": {
    "project_id": "my-project-123",
    "path": "/src/components/NewComponent.jsx",
    "content": "import React from 'react';\n\nexport default function NewComponent() {\n  return <div>Hello</div>;\n}",
    "create_directories": true
  }
}
```

---

### 7. `remotedevai_list_files`

List files in a project directory.

**Parameters:**
- `project_id` (string, required): Project identifier
- `path` (string, optional): Directory path (default: root)
- `recursive` (boolean, optional): Include subdirectories

**Returns:**
Array of files and directories

**Example:**

```json
{
  "tool": "remotedevai_list_files",
  "parameters": {
    "project_id": "my-project-123",
    "path": "/src",
    "recursive": true
  }
}
```

---

### 8. `remotedevai_delete_file`

Delete a file from a project.

**Parameters:**
- `project_id` (string, required): Project identifier
- `path` (string, required): File path

**Returns:**
- Success confirmation

**Example:**

```json
{
  "tool": "remotedevai_delete_file",
  "parameters": {
    "project_id": "my-project-123",
    "path": "/src/old-component.jsx"
  }
}
```

---

### 9. `remotedevai_sync_project`

Sync a local directory with a cloud project.

**Parameters:**
- `project_id` (string, required): Project identifier
- `local_path` (string, required): Local directory path
- `direction` (string, required): `up`, `down`, or `both`
- `exclude` (array, optional): Patterns to exclude

**Returns:**
- Sync status
- Files changed

**Example:**

```json
{
  "tool": "remotedevai_sync_project",
  "parameters": {
    "project_id": "my-project-123",
    "local_path": "/Users/me/projects/my-app",
    "direction": "both",
    "exclude": ["node_modules", ".git", "dist"]
  }
}
```

---

### 10. `remotedevai_get_task_status`

Get the status of an agent task.

**Parameters:**
- `task_id` (string, required): Task identifier

**Returns:**
- Task status
- Progress percentage
- Result (if completed)

**Example:**

```json
{
  "tool": "remotedevai_get_task_status",
  "parameters": {
    "task_id": "task_abc123"
  }
}
```

---

### 11. `remotedevai_deploy`

Deploy a project.

**Parameters:**
- `project_id` (string, required): Project identifier
- `environment` (string, required): `staging` or `production`
- `config` (object, optional): Deployment configuration

**Returns:**
- Deployment status
- URL (if successful)
- Logs

**Example:**

```json
{
  "tool": "remotedevai_deploy",
  "parameters": {
    "project_id": "my-project-123",
    "environment": "staging"
  }
}
```

---

### 12. `remotedevai_get_analytics`

Get usage analytics and statistics.

**Parameters:**
- `start_date` (string, optional): ISO date
- `end_date` (string, optional): ISO date
- `group_by` (string, optional): `day`, `week`, `month`

**Returns:**
- Usage statistics
- Agent execution stats
- Token usage
- Timeline data

**Example:**

```json
{
  "tool": "remotedevai_get_analytics",
  "parameters": {
    "start_date": "2025-01-01",
    "end_date": "2025-01-15",
    "group_by": "day"
  }
}
```

---

## Configuration

### Desktop Agent Configuration

Edit `~/.remotedevai/config.json`:

```json
{
  "apiKey": "your_api_key",
  "cloudUrl": "https://api.remotedevai.com",
  "mcp": {
    "enabled": true,
    "port": 3003,
    "logLevel": "info",
    "timeout": 30000
  },
  "sync": {
    "autoSync": true,
    "interval": 5000,
    "excludePatterns": [
      "node_modules",
      ".git",
      "dist",
      "build",
      ".env"
    ]
  }
}
```

### Claude Code Configuration

Edit `~/.claude/config.json`:

```json
{
  "mcpServers": {
    "remotedevai": {
      "command": "remotedevai",
      "args": ["mcp", "--verbose"],
      "env": {
        "REMOTEDEVAI_API_KEY": "${REMOTEDEVAI_API_KEY}",
        "REMOTEDEVAI_CLOUD_URL": "https://api.remotedevai.com",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Environment Variables

Create `.env` file or set environment variables:

```bash
REMOTEDEVAI_API_KEY=your_api_key_here
REMOTEDEVAI_CLOUD_URL=https://api.remotedevai.com
REMOTEDEVAI_AUTO_SYNC=true
REMOTEDEVAI_LOG_LEVEL=info
```

## Usage Examples

### Example 1: Generate Code with Claude Code

In Claude Code chat:

```
Using RemoteDevAI, create a new React component for displaying
a list of users with pagination. Use the code-generation agent
for my project "user-dashboard".
```

Claude Code will:
1. Use `remotedevai_execute_agent` tool
2. Pass task to code-generation agent
3. Receive generated component
4. Write it to the project using `remotedevai_write_file`

---

### Example 2: Review and Improve Code

```
Review the authentication code in my "api-backend" project
and suggest improvements for security.
```

Claude Code will:
1. Use `remotedevai_read_file` to get auth files
2. Execute `code-review` agent with security focus
3. Execute `security` agent for vulnerability scan
4. Present findings and suggestions

---

### Example 3: Full Feature Implementation

```
In my "e-commerce" project, implement a shopping cart feature
with add/remove items, calculate totals, and persist to localStorage.
```

Claude Code will:
1. Use `code-generation` agent for cart component
2. Use `testing` agent to generate tests
3. Use `documentation` agent for inline docs
4. Write all files to project
5. Sync to cloud

---

### Example 4: Debug an Error

```
I'm getting "TypeError: Cannot read property 'map' of undefined"
in UserList component. Help me debug this.
```

Claude Code will:
1. Read the UserList component file
2. Execute `debugging` agent with error details
3. Analyze the issue
4. Suggest fixes
5. Apply fixes if approved

---

### Example 5: Deploy to Production

```
Deploy my "web-app" project to production after running tests.
```

Claude Code will:
1. Execute `testing` agent to run all tests
2. If tests pass, execute `devops` agent for deployment
3. Use `remotedevai_deploy` tool
4. Monitor deployment status
5. Report results

---

## Usage Patterns

### Pattern 1: Local Development with Cloud Sync

```javascript
// In Claude Code
"Sync my local project at ~/projects/my-app with
 the cloud project 'my-app-cloud'"
```

Uses `remotedevai_sync_project` to keep local and cloud in sync.

---

### Pattern 2: Agent Chaining

```javascript
// Generate → Review → Test → Deploy
"Create a new API endpoint for user registration,
 review it for security issues, generate tests,
 and deploy to staging"
```

Claude Code orchestrates multiple agents sequentially.

---

### Pattern 3: Parallel Agent Execution

```javascript
// Run multiple agents at once
"For my auth.js file, run security scan, code review,
 and generate documentation - all in parallel"
```

Claude Code executes multiple tools simultaneously.

---

### Pattern 4: Iterative Improvement

```javascript
// Feedback loop
"Generate a login component, review it, and keep
 refactoring until the code review score is above 90"
```

Claude Code iterates until quality threshold is met.

---

## Tool Responses

### Success Response

```json
{
  "success": true,
  "data": {
    "task_id": "task_abc123",
    "status": "completed",
    "result": {
      "files": [
        {
          "path": "/src/components/UserCard.jsx",
          "content": "..."
        }
      ],
      "explanation": "Created UserCard component...",
      "suggestions": ["Add loading state", "Improve accessibility"]
    }
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "AGENT_TIMEOUT",
    "message": "Agent execution timed out after 300s",
    "details": {
      "task_id": "task_abc123",
      "agent_id": "code-generation"
    }
  }
}
```

### Progress Update

For long-running tasks, Claude Code receives progress updates:

```json
{
  "type": "progress",
  "task_id": "task_abc123",
  "progress": 45,
  "message": "Generating component structure..."
}
```

## Troubleshooting

### MCP Server Not Found

**Error**: "MCP server 'remotedevai' not found"

**Solution**:
```bash
# Verify desktop agent is installed
remotedevai --version

# Check Claude Code config
cat ~/.claude/config.json

# Restart Claude Code
```

---

### Authentication Failed

**Error**: "Authentication failed: Invalid API key"

**Solution**:
```bash
# Generate new API key from RemoteDevAI dashboard
# Update environment variable
export REMOTEDEVAI_API_KEY=your_new_key

# Or update config file
remotedevai auth --api-key your_new_key

# Restart desktop agent
remotedevai restart
```

---

### Tool Timeout

**Error**: "Tool execution timed out"

**Solution**:
```json
// Increase timeout in Claude Code config
{
  "mcpServers": {
    "remotedevai": {
      "timeout": 60000  // 60 seconds
    }
  }
}
```

---

### Sync Conflicts

**Error**: "File conflict during sync"

**Solution**:
```bash
# Resolve conflicts manually
remotedevai sync resolve --strategy=cloud  # Use cloud version
# or
remotedevai sync resolve --strategy=local   # Use local version
# or
remotedevai sync resolve --strategy=merge   # Attempt merge
```

---

### Connection Issues

**Error**: "Cannot connect to RemoteDevAI cloud"

**Solution**:
```bash
# Check desktop agent status
remotedevai status

# Check connectivity
remotedevai test-connection

# View logs
remotedevai logs --follow
```

---

## Advanced Usage

### Custom Tool Wrapper

Create custom MCP tools that wrap RemoteDevAI agents:

```javascript
// my-custom-tool.js
export async function myCustomWorkflow(context) {
  // 1. Generate code
  const code = await context.executeAgent('code-generation', {
    task: context.input
  });

  // 2. Review it
  const review = await context.executeAgent('code-review', {
    files: code.files
  });

  // 3. If review score < 80, refactor
  if (review.score < 80) {
    code = await context.executeAgent('refactoring', {
      files: code.files,
      issues: review.issues
    });
  }

  return code;
}
```

Register in `~/.claude/config.json`:

```json
{
  "mcpServers": {
    "my-tools": {
      "command": "node",
      "args": ["my-custom-tool.js"]
    }
  }
}
```

---

### Monitoring Tool Usage

```bash
# View MCP tool usage stats
remotedevai mcp stats

# View tool execution logs
remotedevai mcp logs --tool=execute_agent

# Monitor in real-time
remotedevai mcp monitor
```

---

## API Reference

### MCP Protocol

RemoteDevAI implements MCP v1.0. See [MCP Specification](https://modelcontextprotocol.io/docs) for protocol details.

### Tool Schema

Each tool follows this schema:

```typescript
interface MCPTool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: {
      [key: string]: {
        type: string;
        description: string;
        required?: boolean;
        enum?: string[];
      };
    };
    required: string[];
  };
}
```

---

## Best Practices

### 1. Use Specific Tool Names

Good: `remotedevai_execute_agent`
Bad: `execute` (too generic)

### 2. Provide Context

Always include relevant context in tool parameters:
- Project ID
- File paths
- Framework/language info
- Requirements

### 3. Handle Errors Gracefully

Check tool responses for errors and retry if needed.

### 4. Monitor Performance

Track tool execution times and optimize workflows.

### 5. Keep Secrets Secure

Never hardcode API keys. Use environment variables.

### 6. Version Control

Track which tool versions you're using for reproducibility.

---

**Next**: Learn about the [Mobile App](MOBILE-APP.md) for voice-first development.
