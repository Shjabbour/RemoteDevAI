# RemoteDevAI API Reference

Complete reference for the RemoteDevAI REST API and WebSocket events.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [REST API](#rest-api)
  - [Authentication Endpoints](#authentication-endpoints)
  - [User Endpoints](#user-endpoints)
  - [Project Endpoints](#project-endpoints)
  - [File Endpoints](#file-endpoints)
  - [Agent Endpoints](#agent-endpoints)
  - [Task Endpoints](#task-endpoints)
  - [Analytics Endpoints](#analytics-endpoints)
- [WebSocket API](#websocket-api)
- [Error Codes](#error-codes)
- [Rate Limits](#rate-limits)
- [Pagination](#pagination)
- [Filtering and Sorting](#filtering-and-sorting)

## Overview

### Base URL

```
Development: http://localhost:3001/api
Production:  https://api.remotedevai.com/api
```

### API Versioning

All endpoints are versioned. Current version: `v1`

```
https://api.remotedevai.com/api/v1/projects
```

### Request Format

- **Content-Type**: `application/json`
- **Accept**: `application/json`
- **Character Encoding**: UTF-8

### Response Format

All responses follow this structure:

**Success Response**:
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* additional error context */ }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Authentication

RemoteDevAI uses JWT (JSON Web Token) based authentication.

### Authentication Flow

```
1. User logs in → Receive access token + refresh token
2. Include access token in all requests
3. When access token expires → Use refresh token to get new access token
4. When refresh token expires → User must log in again
```

### Token Lifetimes

- **Access Token**: 15 minutes
- **Refresh Token**: 7 days

### Including Tokens in Requests

**Header Authentication** (Recommended):
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Query Parameter** (For WebSocket only):
```
ws://localhost:3001?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## REST API

### Authentication Endpoints

#### POST /auth/register

Create a new user account.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "name": "John Doe",
  "organization": "Acme Inc" // optional
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "organization": "Acme Inc",
      "role": "user",
      "createdAt": "2025-01-15T10:30:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  }
}
```

**Errors**:
- `400` - Invalid email or weak password
- `409` - Email already exists

---

#### POST /auth/login

Authenticate and receive tokens.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  }
}
```

**Errors**:
- `401` - Invalid credentials
- `429` - Too many login attempts

---

#### POST /auth/refresh

Refresh access token using refresh token.

**Request**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Errors**:
- `401` - Invalid or expired refresh token

---

#### POST /auth/logout

Invalidate refresh token.

**Headers**: Requires authentication

**Request**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### User Endpoints

#### GET /users/me

Get current user profile.

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "organization": "Acme Inc",
    "role": "user",
    "settings": {
      "theme": "dark",
      "notifications": true,
      "voiceEnabled": true
    },
    "usage": {
      "apiCalls": 1234,
      "tokensUsed": 567890,
      "projectsCreated": 5
    },
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

#### PATCH /users/me

Update current user profile.

**Headers**: Requires authentication

**Request**:
```json
{
  "name": "John Smith",
  "organization": "New Company Inc",
  "settings": {
    "theme": "light",
    "notifications": false
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Smith",
    "organization": "New Company Inc",
    "settings": {
      "theme": "light",
      "notifications": false,
      "voiceEnabled": true
    },
    "updatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

---

#### POST /users/me/api-keys

Generate a new API key for programmatic access.

**Headers**: Requires authentication

**Request**:
```json
{
  "name": "Desktop Agent Key",
  "expiresIn": 2592000 // seconds (30 days), optional
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "key_550e8400e29b41d4a716446655440000",
    "name": "Desktop Agent Key",
    "key": "rda_live_abc123def456...",
    "createdAt": "2025-01-15T10:30:00.000Z",
    "expiresAt": "2025-02-14T10:30:00.000Z"
  },
  "message": "Store this key securely. It won't be shown again."
}
```

**Note**: The `key` is only returned once. Store it securely.

---

### Project Endpoints

#### GET /projects

List all projects for the authenticated user.

**Headers**: Requires authentication

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Results per page (default: 20, max: 100)
- `sort` (string): Sort field (default: `createdAt`)
- `order` (string): Sort order (`asc` or `desc`, default: `desc`)
- `search` (string): Search in project name and description

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "My React App",
        "description": "A modern React application",
        "language": "javascript",
        "framework": "react",
        "status": "active",
        "visibility": "private",
        "stats": {
          "files": 42,
          "lines": 3456,
          "commits": 23
        },
        "createdAt": "2025-01-10T10:00:00.000Z",
        "updatedAt": "2025-01-15T14:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

#### POST /projects

Create a new project.

**Headers**: Requires authentication

**Request**:
```json
{
  "name": "My New Project",
  "description": "Project description",
  "language": "javascript",
  "framework": "react", // optional
  "template": "react-vite", // optional
  "visibility": "private", // or "public"
  "settings": {
    "autoFormat": true,
    "linting": true,
    "testing": true
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My New Project",
    "description": "Project description",
    "language": "javascript",
    "framework": "react",
    "status": "initializing",
    "visibility": "private",
    "settings": {
      "autoFormat": true,
      "linting": true,
      "testing": true
    },
    "owner": {
      "id": "user-id",
      "name": "John Doe"
    },
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

#### GET /projects/:projectId

Get project details.

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My React App",
    "description": "A modern React application",
    "language": "javascript",
    "framework": "react",
    "status": "active",
    "visibility": "private",
    "structure": {
      "src": ["components", "pages", "services"],
      "public": [],
      "tests": []
    },
    "dependencies": {
      "react": "^18.2.0",
      "react-dom": "^18.2.0"
    },
    "stats": {
      "files": 42,
      "lines": 3456,
      "commits": 23,
      "contributors": 1
    },
    "git": {
      "branch": "main",
      "lastCommit": "abc123",
      "remoteUrl": "https://github.com/user/repo.git"
    },
    "createdAt": "2025-01-10T10:00:00.000Z",
    "updatedAt": "2025-01-15T14:30:00.000Z"
  }
}
```

---

#### PATCH /projects/:projectId

Update project settings.

**Headers**: Requires authentication

**Request**:
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "visibility": "public",
  "settings": {
    "autoFormat": false
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Updated Project Name",
    "description": "Updated description",
    "visibility": "public",
    "updatedAt": "2025-01-15T15:00:00.000Z"
  }
}
```

---

#### DELETE /projects/:projectId

Delete a project permanently.

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

**Errors**:
- `404` - Project not found
- `403` - Not authorized to delete

---

### File Endpoints

#### GET /projects/:projectId/files

List files in a project.

**Headers**: Requires authentication

**Query Parameters**:
- `path` (string): Directory path (default: root)
- `recursive` (boolean): Include subdirectories (default: false)

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "path": "/src",
    "files": [
      {
        "name": "App.jsx",
        "path": "/src/App.jsx",
        "type": "file",
        "size": 1234,
        "language": "javascript",
        "modifiedAt": "2025-01-15T14:30:00.000Z"
      },
      {
        "name": "components",
        "path": "/src/components",
        "type": "directory",
        "files": 5
      }
    ]
  }
}
```

---

#### GET /projects/:projectId/files/*

Get file content.

**Headers**: Requires authentication

**Example**: `GET /projects/:projectId/files/src/App.jsx`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "path": "/src/App.jsx",
    "content": "import React from 'react';\n\nfunction App() {\n  return <div>Hello</div>;\n}\n\nexport default App;",
    "language": "javascript",
    "size": 89,
    "lines": 7,
    "modifiedAt": "2025-01-15T14:30:00.000Z"
  }
}
```

---

#### POST /projects/:projectId/files

Create a new file.

**Headers**: Requires authentication

**Request**:
```json
{
  "path": "/src/components/Button.jsx",
  "content": "import React from 'react';\n\nexport default function Button() {\n  return <button>Click</button>;\n}",
  "createDirectories": true // Create parent dirs if needed
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "path": "/src/components/Button.jsx",
    "size": 95,
    "createdAt": "2025-01-15T15:00:00.000Z"
  }
}
```

---

#### PUT /projects/:projectId/files/*

Update file content.

**Headers**: Requires authentication

**Example**: `PUT /projects/:projectId/files/src/App.jsx`

**Request**:
```json
{
  "content": "// Updated content\nimport React from 'react';\n\nfunction App() {\n  return <div>Updated!</div>;\n}\n\nexport default App;"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "path": "/src/App.jsx",
    "size": 115,
    "modifiedAt": "2025-01-15T15:30:00.000Z"
  }
}
```

---

#### DELETE /projects/:projectId/files/*

Delete a file.

**Headers**: Requires authentication

**Example**: `DELETE /projects/:projectId/files/src/old-file.js`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

---

### Agent Endpoints

#### GET /agents

List all available agents.

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "code-generation",
        "name": "Code Generation Agent",
        "description": "Generates code from natural language descriptions",
        "status": "available",
        "capabilities": ["write_code", "refactor", "explain"],
        "avgResponseTime": 3500
      },
      {
        "id": "code-review",
        "name": "Code Review Agent",
        "description": "Reviews code for best practices and issues",
        "status": "available",
        "capabilities": ["review", "suggest_improvements", "check_security"],
        "avgResponseTime": 4200
      }
      // ... other agents
    ]
  }
}
```

---

#### POST /agents/:agentId/execute

Execute an agent task.

**Headers**: Requires authentication

**Request**:
```json
{
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "task": "Create a React component for a login form with email and password",
  "context": {
    "path": "/src/components",
    "dependencies": ["react", "react-hook-form"],
    "style": "tailwind"
  },
  "priority": "normal", // or "high", "low"
  "async": true // Return immediately with task ID
}
```

**Response** (202 Accepted) - If async:
```json
{
  "success": true,
  "data": {
    "taskId": "task_abc123",
    "status": "queued",
    "estimatedTime": 5000,
    "position": 2
  }
}
```

**Response** (200 OK) - If synchronous:
```json
{
  "success": true,
  "data": {
    "taskId": "task_abc123",
    "result": {
      "files": [
        {
          "path": "/src/components/LoginForm.jsx",
          "content": "import React from 'react';\nimport { useForm } from 'react-hook-form';\n\n..."
        }
      ],
      "explanation": "Created a LoginForm component using react-hook-form...",
      "suggestions": ["Add email validation", "Implement password strength indicator"]
    },
    "executionTime": 4200,
    "tokensUsed": 1234
  }
}
```

---

#### GET /agents/tasks/:taskId

Get task status and result.

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "task_abc123",
    "agentId": "code-generation",
    "status": "completed", // queued, running, completed, failed
    "progress": 100,
    "result": {
      "files": [
        {
          "path": "/src/components/LoginForm.jsx",
          "content": "..."
        }
      ],
      "explanation": "...",
      "suggestions": []
    },
    "executionTime": 4200,
    "tokensUsed": 1234,
    "createdAt": "2025-01-15T15:00:00.000Z",
    "completedAt": "2025-01-15T15:00:04.200Z"
  }
}
```

---

### Task Endpoints

#### GET /tasks

List all tasks for the authenticated user.

**Headers**: Requires authentication

**Query Parameters**:
- `status` (string): Filter by status
- `agentId` (string): Filter by agent
- `projectId` (string): Filter by project
- `page` (number): Page number
- `limit` (number): Results per page

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "task_abc123",
        "agentId": "code-generation",
        "projectId": "550e8400-e29b-41d4-a716-446655440000",
        "status": "completed",
        "task": "Create login form",
        "createdAt": "2025-01-15T15:00:00.000Z",
        "completedAt": "2025-01-15T15:00:04.200Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

---

#### DELETE /tasks/:taskId

Cancel a queued or running task.

**Headers**: Requires authentication

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Task cancelled successfully"
}
```

---

### Analytics Endpoints

#### GET /analytics/usage

Get usage statistics.

**Headers**: Requires authentication

**Query Parameters**:
- `startDate` (string): ISO date
- `endDate` (string): ISO date
- `groupBy` (string): `day`, `week`, `month`

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "period": {
      "start": "2025-01-01T00:00:00.000Z",
      "end": "2025-01-15T23:59:59.999Z"
    },
    "usage": {
      "apiCalls": 1234,
      "tokensUsed": 567890,
      "tasksExecuted": 456,
      "projectsCreated": 5,
      "filesGenerated": 123
    },
    "byAgent": {
      "code-generation": 234,
      "code-review": 123,
      "testing": 99
    },
    "timeline": [
      {
        "date": "2025-01-15",
        "apiCalls": 89,
        "tokensUsed": 45678
      }
    ]
  }
}
```

---

## WebSocket API

### Connection

Connect to WebSocket server:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: 'your_access_token'
  }
});
```

### Events

#### Client to Server

##### `join-project`

Join a project room to receive real-time updates.

**Emit**:
```javascript
socket.emit('join-project', {
  projectId: '550e8400-e29b-41d4-a716-446655440000'
});
```

**Acknowledgment**:
```javascript
socket.on('joined-project', (data) => {
  console.log('Joined project:', data.projectId);
});
```

---

##### `leave-project`

Leave a project room.

**Emit**:
```javascript
socket.emit('leave-project', {
  projectId: '550e8400-e29b-41d4-a716-446655440000'
});
```

---

##### `voice-command`

Send a voice command.

**Emit**:
```javascript
socket.emit('voice-command', {
  projectId: '550e8400-e29b-41d4-a716-446655440000',
  command: 'Create a new React component',
  language: 'en-US'
});
```

---

#### Server to Client

##### `task-queued`

Task has been added to the queue.

**Receive**:
```javascript
socket.on('task-queued', (data) => {
  console.log('Task queued:', data);
  // {
  //   taskId: 'task_abc123',
  //   agentId: 'code-generation',
  //   position: 2,
  //   estimatedTime: 5000
  // }
});
```

---

##### `task-started`

Agent has started processing the task.

**Receive**:
```javascript
socket.on('task-started', (data) => {
  console.log('Task started:', data);
  // {
  //   taskId: 'task_abc123',
  //   agentId: 'code-generation',
  //   startedAt: '2025-01-15T15:00:00.000Z'
  // }
});
```

---

##### `task-progress`

Task progress update.

**Receive**:
```javascript
socket.on('task-progress', (data) => {
  console.log('Progress:', data.progress + '%');
  // {
  //   taskId: 'task_abc123',
  //   progress: 45,
  //   message: 'Generating component structure...'
  // }
});
```

---

##### `task-completed`

Task has been completed.

**Receive**:
```javascript
socket.on('task-completed', (data) => {
  console.log('Task completed:', data);
  // {
  //   taskId: 'task_abc123',
  //   result: { ... },
  //   executionTime: 4200,
  //   tokensUsed: 1234
  // }
});
```

---

##### `task-failed`

Task execution failed.

**Receive**:
```javascript
socket.on('task-failed', (data) => {
  console.error('Task failed:', data);
  // {
  //   taskId: 'task_abc123',
  //   error: 'Agent timeout',
  //   details: '...'
  // }
});
```

---

##### `file-changed`

A file in the project was modified.

**Receive**:
```javascript
socket.on('file-changed', (data) => {
  console.log('File changed:', data);
  // {
  //   projectId: '550e8400-e29b-41d4-a716-446655440000',
  //   path: '/src/App.jsx',
  //   action: 'modified', // or 'created', 'deleted'
  //   modifiedBy: 'user-id'
  // }
});
```

---

##### `notification`

General notification.

**Receive**:
```javascript
socket.on('notification', (data) => {
  console.log('Notification:', data);
  // {
  //   type: 'info', // or 'success', 'warning', 'error'
  //   message: 'Your project build completed successfully',
  //   timestamp: '2025-01-15T15:00:00.000Z'
  // }
});
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |
| `AGENT_TIMEOUT` | 504 | Agent execution timeout |

### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Validation failed",
    "details": {
      "fields": {
        "email": "Invalid email format",
        "password": "Password must be at least 8 characters"
      }
    }
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Rate Limits

### Default Limits

| Endpoint Category | Requests per Window | Window Size |
|------------------|---------------------|-------------|
| Authentication | 5 | 15 minutes |
| General API | 100 | 15 minutes |
| Agent Execution | 20 | 15 minutes |
| File Operations | 200 | 15 minutes |
| Analytics | 30 | 15 minutes |

### Rate Limit Headers

Every response includes rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642253400
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again in 10 minutes.",
    "details": {
      "retryAfter": 600,
      "limit": 100,
      "window": "15 minutes"
    }
  }
}
```

## Pagination

All list endpoints support pagination.

### Query Parameters

- `page` (number): Page number (1-indexed, default: 1)
- `limit` (number): Results per page (default: 20, max: 100)

### Pagination Response

```json
{
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 87,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## Filtering and Sorting

### Filtering

Use query parameters to filter results:

```http
GET /api/projects?language=javascript&status=active
```

### Sorting

Use `sort` and `order` parameters:

```http
GET /api/projects?sort=createdAt&order=desc
```

### Searching

Use `search` parameter for full-text search:

```http
GET /api/projects?search=react+app
```

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  }
});

// Login
const { data } = await api.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

const accessToken = data.data.tokens.accessToken;

// Set auth header
api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

// Create project
const project = await api.post('/projects', {
  name: 'My New Project',
  language: 'javascript',
  framework: 'react'
});

console.log('Project created:', project.data);
```

### Python

```python
import requests

API_URL = 'http://localhost:3001/api'

# Login
response = requests.post(f'{API_URL}/auth/login', json={
    'email': 'user@example.com',
    'password': 'password123'
})
tokens = response.json()['data']['tokens']
access_token = tokens['accessToken']

# Set auth header
headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

# Create project
response = requests.post(f'{API_URL}/projects',
    json={
        'name': 'My New Project',
        'language': 'python',
        'framework': 'fastapi'
    },
    headers=headers
)

project = response.json()['data']
print(f"Project created: {project['id']}")
```

### cURL

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Use the returned token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Create project
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My New Project",
    "language": "javascript",
    "framework": "react"
  }'
```

---

**Next**: Explore [AGENTS.md](AGENTS.md) to learn about the 10 specialized AI agents.
