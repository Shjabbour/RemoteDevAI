# RemoteDevAI Agents Guide

Comprehensive documentation for all 10 specialized AI agents in the RemoteDevAI platform.

## Table of Contents

- [Overview](#overview)
- [Agent Architecture](#agent-architecture)
- [The 10 Agents](#the-10-agents)
  1. [Code Generation Agent](#1-code-generation-agent)
  2. [Code Review Agent](#2-code-review-agent)
  3. [Testing Agent](#3-testing-agent)
  4. [Debugging Agent](#4-debugging-agent)
  5. [Refactoring Agent](#5-refactoring-agent)
  6. [Documentation Agent](#6-documentation-agent)
  7. [DevOps Agent](#7-devops-agent)
  8. [Database Agent](#8-database-agent)
  9. [API Agent](#9-api-agent)
  10. [Security Agent](#10-security-agent)
- [Agent Workflows](#agent-workflows)
- [Configuration](#configuration)
- [Best Practices](#best-practices)

## Overview

RemoteDevAI uses 10 specialized AI agents, each optimized for specific development tasks. This modular approach provides:

- **Higher Quality**: Specialized prompts and training per domain
- **Better Performance**: Optimized context and token usage
- **Easier Maintenance**: Independent updates and improvements
- **Flexibility**: Mix and match agents for complex workflows

### Agent Status

All agents are powered by Claude (Anthropic) and run on the RemoteDevAI cloud infrastructure.

| Agent | Status | Avg Response Time | Success Rate |
|-------|--------|-------------------|--------------|
| Code Generation | Available | 3.5s | 98.5% |
| Code Review | Available | 4.2s | 97.8% |
| Testing | Available | 5.1s | 96.3% |
| Debugging | Available | 6.8s | 94.2% |
| Refactoring | Available | 4.5s | 97.1% |
| Documentation | Available | 3.2s | 99.1% |
| DevOps | Available | 7.3s | 95.6% |
| Database | Available | 5.4s | 96.8% |
| API | Available | 4.8s | 97.4% |
| Security | Available | 6.1s | 95.9% |

## Agent Architecture

### Base Agent Structure

All agents share a common base architecture:

```
┌─────────────────────────────────────┐
│         Agent Interface             │
├─────────────────────────────────────┤
│  - execute(task)                    │
│  - prepareContext(task)             │
│  - processResult(response)          │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│      Context Management             │
│  - Load relevant files              │
│  - Gather dependencies              │
│  - Build conversation history       │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│      Claude API Integration         │
│  - Custom system prompt             │
│  - Tool usage (read/write files)    │
│  - Response streaming               │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│      Result Processing              │
│  - Parse response                   │
│  - Validate output                  │
│  - Store artifacts                  │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│      Notification                   │
│  - Update client via WebSocket      │
│  - Store in database                │
└─────────────────────────────────────┘
```

### Agent Communication

Agents can work together through:
1. **Sequential Execution**: One agent triggers another
2. **Parallel Execution**: Multiple agents work simultaneously
3. **Feedback Loops**: Agents iterate on results

## The 10 Agents

---

## 1. Code Generation Agent

### Purpose

Generates code from natural language descriptions, creating new files, functions, components, or entire features.

### Capabilities

- Create new files and components
- Write functions from descriptions
- Generate boilerplate code
- Scaffold project structures
- Convert pseudocode to real code
- Translate code between languages

### Input Format

```json
{
  "task": "Create a React component for a user profile card",
  "context": {
    "language": "javascript",
    "framework": "react",
    "path": "/src/components",
    "dependencies": ["react", "tailwindcss"],
    "style": "functional",
    "requirements": [
      "Display user avatar, name, and bio",
      "Show follower count",
      "Include follow/unfollow button"
    ]
  }
}
```

### Output Format

```json
{
  "files": [
    {
      "path": "/src/components/UserProfileCard.jsx",
      "content": "import React from 'react';\n\nexport default function UserProfileCard({ user }) {\n  // Component code...\n}",
      "language": "javascript"
    },
    {
      "path": "/src/components/UserProfileCard.test.jsx",
      "content": "// Test file...",
      "language": "javascript"
    }
  ],
  "explanation": "Created a UserProfileCard component with the requested features...",
  "suggestions": [
    "Consider adding loading states",
    "Add error handling for missing user data"
  ],
  "dependencies": ["react", "tailwindcss"]
}
```

### Configuration

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "maxTokens": 4096,
  "temperature": 0.7,
  "systemPrompt": "You are an expert software engineer. Generate clean, efficient, and well-documented code following best practices.",
  "tools": ["read_file", "write_file", "list_directory"]
}
```

### Example Usage

**Voice Command**: "Create a login form component with email and password fields"

**API Request**:
```javascript
const response = await api.post('/agents/code-generation/execute', {
  projectId: 'my-project-id',
  task: 'Create a login form component with email and password fields',
  context: {
    framework: 'react',
    style: 'tailwind'
  }
});
```

### Best Practices

- Be specific in requirements
- Provide context about existing code
- Mention styling preferences
- Specify error handling needs
- Include accessibility requirements

---

## 2. Code Review Agent

### Purpose

Reviews code for quality, best practices, potential bugs, performance issues, and security vulnerabilities.

### Capabilities

- Static code analysis
- Best practices validation
- Performance optimization suggestions
- Security vulnerability detection
- Code style consistency checking
- Complexity analysis

### Input Format

```json
{
  "files": [
    "/src/components/UserForm.jsx",
    "/src/utils/validation.js"
  ],
  "reviewType": "comprehensive", // or "security", "performance", "style"
  "context": {
    "language": "javascript",
    "framework": "react",
    "standards": ["airbnb", "react-hooks"]
  }
}
```

### Output Format

```json
{
  "summary": {
    "filesReviewed": 2,
    "issuesFound": 5,
    "severity": {
      "critical": 0,
      "high": 1,
      "medium": 2,
      "low": 2
    },
    "score": 85
  },
  "issues": [
    {
      "file": "/src/components/UserForm.jsx",
      "line": 23,
      "severity": "high",
      "category": "security",
      "message": "User input not sanitized before rendering",
      "suggestion": "Use a library like DOMPurify or escape HTML entities",
      "code": {
        "current": "return <div>{userInput}</div>;",
        "suggested": "return <div>{DOMPurify.sanitize(userInput)}</div>;"
      }
    }
  ],
  "positives": [
    "Excellent use of React hooks",
    "Good error handling in validation.js",
    "Clear component structure"
  ],
  "recommendations": [
    "Add PropTypes or TypeScript for type safety",
    "Consider memoization for expensive computations",
    "Extract magic numbers into constants"
  ]
}
```

### Configuration

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "maxTokens": 8192,
  "temperature": 0.3,
  "systemPrompt": "You are a senior code reviewer. Provide constructive, detailed feedback focused on improving code quality, security, and performance.",
  "tools": ["read_file", "analyze_complexity", "check_dependencies"]
}
```

### Example Usage

**Voice Command**: "Review my authentication code for security issues"

**API Request**:
```javascript
const response = await api.post('/agents/code-review/execute', {
  projectId: 'my-project-id',
  files: ['/src/auth/login.js', '/src/auth/token.js'],
  reviewType: 'security'
});
```

### Review Types

- **comprehensive**: All aspects (default)
- **security**: Focus on vulnerabilities
- **performance**: Optimization opportunities
- **style**: Code consistency and readability
- **accessibility**: A11y compliance

---

## 3. Testing Agent

### Purpose

Generates test cases, writes test code, and helps improve test coverage.

### Capabilities

- Generate unit tests
- Create integration tests
- Write E2E test scenarios
- Generate test data/fixtures
- Calculate coverage gaps
- Suggest edge cases

### Input Format

```json
{
  "files": ["/src/utils/validation.js"],
  "testType": "unit", // or "integration", "e2e"
  "framework": "jest", // or "vitest", "mocha", "pytest", etc.
  "coverage": {
    "target": 90,
    "current": 65
  },
  "context": {
    "existingTests": ["/tests/validation.test.js"],
    "focus": ["edge_cases", "error_handling"]
  }
}
```

### Output Format

```json
{
  "tests": [
    {
      "file": "/tests/utils/validation.test.js",
      "content": "import { validateEmail } from '../src/utils/validation';\n\ndescribe('validateEmail', () => {\n  test('should validate correct email', () => {\n    expect(validateEmail('user@example.com')).toBe(true);\n  });\n  // More tests...\n});",
      "testCount": 12,
      "coverage": {
        "lines": 95,
        "branches": 88,
        "functions": 100
      }
    }
  ],
  "summary": {
    "totalTests": 12,
    "newTests": 8,
    "updatedTests": 4,
    "estimatedCoverage": 92
  },
  "recommendations": [
    "Add tests for internationalized email formats",
    "Test rate limiting scenarios",
    "Consider property-based testing for validation functions"
  ],
  "gaps": [
    "Missing tests for network timeout scenarios",
    "No tests for concurrent access patterns"
  ]
}
```

### Configuration

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "maxTokens": 6144,
  "temperature": 0.5,
  "systemPrompt": "You are a testing expert. Write comprehensive, maintainable tests that cover edge cases and follow testing best practices.",
  "tools": ["read_file", "write_file", "run_tests", "calculate_coverage"]
}
```

### Example Usage

**Voice Command**: "Generate unit tests for my validation utilities"

**API Request**:
```javascript
const response = await api.post('/agents/testing/execute', {
  projectId: 'my-project-id',
  files: ['/src/utils/validation.js'],
  testType: 'unit',
  framework: 'jest'
});
```

### Supported Frameworks

- **JavaScript**: Jest, Vitest, Mocha, Jasmine
- **Python**: pytest, unittest, nose2
- **Go**: testing, testify
- **Java**: JUnit, TestNG
- **Ruby**: RSpec, Minitest

---

## 4. Debugging Agent

### Purpose

Analyzes errors, finds bugs, and suggests fixes.

### Capabilities

- Analyze error messages and stack traces
- Identify root causes
- Suggest fixes
- Generate debug statements
- Reproduce bugs
- Find related issues

### Input Format

```json
{
  "error": {
    "message": "TypeError: Cannot read property 'map' of undefined",
    "stack": "at UserList.render (/src/components/UserList.jsx:15:20)\n...",
    "type": "runtime"
  },
  "context": {
    "files": ["/src/components/UserList.jsx", "/src/api/users.js"],
    "recentChanges": [
      {
        "file": "/src/api/users.js",
        "timestamp": "2025-01-15T14:30:00.000Z"
      }
    ],
    "environment": "development",
    "userActions": [
      "Clicked 'Load Users' button",
      "Navigated to /users page"
    ]
  }
}
```

### Output Format

```json
{
  "diagnosis": {
    "rootCause": "The API response is returning null instead of an array when no users are found",
    "location": {
      "file": "/src/api/users.js",
      "line": 42,
      "function": "fetchUsers"
    },
    "severity": "medium",
    "category": "null_reference"
  },
  "analysis": "The error occurs because the component expects `users` to always be an array, but the API returns null when no users exist. The recent change to the API removed the default empty array return.",
  "fixes": [
    {
      "priority": 1,
      "description": "Add null check in component",
      "file": "/src/components/UserList.jsx",
      "changes": {
        "before": "return users.map(user => <UserCard key={user.id} user={user} />);",
        "after": "return (users || []).map(user => <UserCard key={user.id} user={user} />);"
      }
    },
    {
      "priority": 2,
      "description": "Fix API to always return array",
      "file": "/src/api/users.js",
      "changes": {
        "before": "return response.data;",
        "after": "return response.data || [];"
      }
    }
  ],
  "preventionSuggestions": [
    "Add PropTypes or TypeScript to catch these issues earlier",
    "Implement default values in Redux/state management",
    "Add integration tests for empty state scenarios"
  ],
  "relatedIssues": [
    {
      "file": "/src/components/ProductList.jsx",
      "line": 28,
      "message": "Similar pattern that may cause the same issue"
    }
  ]
}
```

### Configuration

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "maxTokens": 8192,
  "temperature": 0.2,
  "systemPrompt": "You are an expert debugger. Analyze errors systematically, identify root causes, and provide clear, actionable solutions.",
  "tools": ["read_file", "search_code", "analyze_logs", "execute_command"]
}
```

### Example Usage

**Voice Command**: "Debug this null pointer error in my user list component"

**API Request**:
```javascript
const response = await api.post('/agents/debugging/execute', {
  projectId: 'my-project-id',
  error: {
    message: "TypeError: Cannot read property 'map' of undefined",
    stack: errorStack
  },
  context: {
    files: ['/src/components/UserList.jsx']
  }
});
```

---

## 5. Refactoring Agent

### Purpose

Improves code quality through refactoring while maintaining functionality.

### Capabilities

- Extract functions/components
- Rename variables/functions
- Simplify complex logic
- Remove code duplication
- Improve code organization
- Modernize legacy code
- Apply design patterns

### Input Format

```json
{
  "files": ["/src/components/Dashboard.jsx"],
  "refactoringType": "extract_component", // or "simplify", "modernize", etc.
  "context": {
    "preserveBehavior": true,
    "updateTests": true,
    "style": "functional",
    "targetComplexity": "low"
  }
}
```

### Output Format

```json
{
  "changes": [
    {
      "type": "extract_component",
      "description": "Extracted statistics card into reusable component",
      "files": {
        "modified": ["/src/components/Dashboard.jsx"],
        "created": ["/src/components/StatisticsCard.jsx"]
      },
      "diff": {
        "/src/components/Dashboard.jsx": {
          "before": "// Old inline code...",
          "after": "// Refactored code..."
        },
        "/src/components/StatisticsCard.jsx": {
          "content": "// New component..."
        }
      },
      "impact": {
        "linesRemoved": 45,
        "linesAdded": 12,
        "complexityReduction": 35,
        "reusability": "high"
      }
    }
  ],
  "summary": {
    "totalChanges": 3,
    "filesModified": 1,
    "filesCreated": 3,
    "complexityBefore": 85,
    "complexityAfter": 42,
    "maintainabilityScore": {
      "before": 65,
      "after": 88
    }
  },
  "testUpdates": {
    "required": true,
    "files": ["/tests/Dashboard.test.jsx"],
    "changes": "Updated tests to use new component structure"
  },
  "recommendations": [
    "Consider further extracting the API logic into a custom hook",
    "Add PropTypes to the new StatisticsCard component"
  ]
}
```

### Configuration

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "maxTokens": 6144,
  "temperature": 0.4,
  "systemPrompt": "You are a refactoring expert. Improve code quality while preserving functionality. Focus on readability, maintainability, and performance.",
  "tools": ["read_file", "write_file", "analyze_complexity", "run_tests"]
}
```

### Refactoring Types

- **extract_function**: Extract code into functions
- **extract_component**: Create reusable components
- **simplify**: Reduce complexity
- **remove_duplication**: DRY principle
- **modernize**: Update to modern syntax/patterns
- **organize**: Improve file/folder structure
- **pattern**: Apply design patterns

---

## 6. Documentation Agent

### Purpose

Generates and maintains code documentation, READMEs, API docs, and inline comments.

### Capabilities

- Generate inline comments
- Create function/class documentation
- Write README files
- Generate API documentation
- Create usage examples
- Write architectural docs
- Generate changelogs

### Input Format

```json
{
  "files": ["/src/api/users.js"],
  "documentationType": "inline", // or "readme", "api", "architecture"
  "context": {
    "format": "jsdoc", // or "markdown", "rst", "asciidoc"
    "includeExamples": true,
    "language": "en"
  }
}
```

### Output Format

```json
{
  "documentation": [
    {
      "file": "/src/api/users.js",
      "type": "inline",
      "content": "/**\n * Fetches users from the API with optional filtering\n * @param {Object} options - Query options\n * @param {number} options.page - Page number (default: 1)\n * @param {number} options.limit - Results per page (default: 20)\n * @param {string} options.search - Search query\n * @returns {Promise<Array<User>>} Array of user objects\n * @throws {APIError} If the request fails\n * @example\n * const users = await fetchUsers({ page: 1, limit: 10 });\n */",
      "linesDocumented": 15,
      "coverage": 100
    },
    {
      "file": "/docs/API.md",
      "type": "api",
      "content": "# User API\n\n## Endpoints\n\n### GET /api/users\n\nFetch a list of users...",
      "sections": ["endpoints", "authentication", "examples", "errors"]
    }
  ],
  "summary": {
    "filesDocumented": 1,
    "totalLines": 245,
    "documentedLines": 245,
    "coverage": 100,
    "missingDocs": []
  },
  "suggestions": [
    "Add code examples to README",
    "Document environment variables",
    "Create contribution guidelines"
  ]
}
```

### Configuration

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "maxTokens": 4096,
  "temperature": 0.5,
  "systemPrompt": "You are a technical writer. Create clear, comprehensive documentation that helps developers understand and use the code effectively.",
  "tools": ["read_file", "write_file", "analyze_code"]
}
```

### Documentation Formats

- **JSDoc**: JavaScript documentation
- **docstrings**: Python documentation
- **GoDoc**: Go documentation
- **JavaDoc**: Java documentation
- **Markdown**: README, guides
- **OpenAPI**: API specifications

---

## 7. DevOps Agent

### Purpose

Handles deployment, CI/CD, infrastructure, and DevOps automation.

### Capabilities

- Generate Dockerfiles
- Create CI/CD pipelines
- Write infrastructure as code
- Configure deployment scripts
- Set up monitoring
- Create Kubernetes manifests
- Automate deployments

### Input Format

```json
{
  "task": "Create Docker configuration for production",
  "context": {
    "runtime": "node",
    "version": "18",
    "port": 3000,
    "environment": "production",
    "dependencies": ["postgresql", "redis"],
    "platform": "docker-compose"
  }
}
```

### Output Format

```json
{
  "files": [
    {
      "path": "/Dockerfile",
      "content": "FROM node:18-alpine\n\nWORKDIR /app\n\nCOPY package*.json ./\nRUN npm ci --only=production\n\nCOPY . .\n\nEXPOSE 3000\n\nCMD [\"node\", \"server.js\"]",
      "type": "dockerfile"
    },
    {
      "path": "/docker-compose.yml",
      "content": "version: '3.8'\nservices:\n  app:\n    build: .\n    ports:\n      - '3000:3000'\n    depends_on:\n      - postgres\n      - redis\n  postgres:\n    image: postgres:14\n    environment:\n      POSTGRES_PASSWORD: ${DB_PASSWORD}\n  redis:\n    image: redis:6-alpine",
      "type": "docker-compose"
    },
    {
      "path": "/.dockerignore",
      "content": "node_modules\n.git\n.env\nnpm-debug.log",
      "type": "dockerignore"
    }
  ],
  "instructions": [
    "1. Set environment variables in .env file",
    "2. Build the image: docker-compose build",
    "3. Run the stack: docker-compose up -d",
    "4. Check logs: docker-compose logs -f app"
  ],
  "bestPractices": [
    "Use multi-stage builds to reduce image size",
    "Implement health checks",
    "Add proper logging configuration",
    "Set up volume mounts for persistent data"
  ],
  "security": [
    "Don't run as root user",
    "Scan images for vulnerabilities",
    "Use secrets management for sensitive data",
    "Keep base images updated"
  ]
}
```

### Configuration

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "maxTokens": 6144,
  "temperature": 0.3,
  "systemPrompt": "You are a DevOps expert. Create production-ready deployment configurations following best practices for security, scalability, and reliability.",
  "tools": ["read_file", "write_file", "execute_command", "check_syntax"]
}
```

### Supported Platforms

- **Containers**: Docker, Podman
- **Orchestration**: Kubernetes, Docker Swarm
- **CI/CD**: GitHub Actions, GitLab CI, Jenkins, CircleCI
- **Infrastructure**: Terraform, CloudFormation, Ansible
- **Cloud**: AWS, Azure, GCP, Digital Ocean

---

## 8. Database Agent

### Purpose

Designs databases, writes queries, and optimizes database operations.

### Capabilities

- Design database schemas
- Write SQL queries
- Create migrations
- Optimize queries
- Design indexes
- Set up relationships
- Generate ORMs/models

### Input Format

```json
{
  "task": "Design database schema for e-commerce platform",
  "context": {
    "database": "postgresql",
    "requirements": [
      "Users with authentication",
      "Products with categories",
      "Orders and order items",
      "Shopping cart",
      "Payment history"
    ],
    "scale": "medium",
    "features": ["soft_deletes", "timestamps", "audit_trail"]
  }
}
```

### Output Format

```json
{
  "schema": {
    "tables": [
      {
        "name": "users",
        "columns": [
          {"name": "id", "type": "UUID", "primaryKey": true},
          {"name": "email", "type": "VARCHAR(255)", "unique": true, "notNull": true},
          {"name": "password_hash", "type": "VARCHAR(255)", "notNull": true},
          {"name": "created_at", "type": "TIMESTAMP", "default": "CURRENT_TIMESTAMP"},
          {"name": "updated_at", "type": "TIMESTAMP"},
          {"name": "deleted_at", "type": "TIMESTAMP"}
        ],
        "indexes": [
          {"name": "idx_users_email", "columns": ["email"]},
          {"name": "idx_users_deleted_at", "columns": ["deleted_at"]}
        ]
      }
    ],
    "relationships": [
      {
        "from": "orders",
        "to": "users",
        "type": "many_to_one",
        "foreignKey": "user_id"
      }
    ]
  },
  "migrations": [
    {
      "file": "/migrations/001_create_users.sql",
      "content": "CREATE TABLE users (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  email VARCHAR(255) UNIQUE NOT NULL,\n  ...\n);"
    }
  ],
  "models": [
    {
      "file": "/models/User.js",
      "content": "// Sequelize model for User table...",
      "type": "sequelize"
    }
  ],
  "queries": {
    "common": [
      {
        "name": "getUserOrders",
        "sql": "SELECT o.* FROM orders o WHERE o.user_id = $1 AND o.deleted_at IS NULL ORDER BY o.created_at DESC;",
        "description": "Fetch all orders for a user"
      }
    ]
  },
  "optimization": [
    "Add index on orders.created_at for timeline queries",
    "Consider partitioning orders table by date",
    "Use materialized view for product analytics"
  ]
}
```

### Configuration

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "maxTokens": 6144,
  "temperature": 0.3,
  "systemPrompt": "You are a database architect. Design efficient, normalized schemas with proper indexing and relationships.",
  "tools": ["read_file", "write_file", "execute_query", "analyze_performance"]
}
```

### Supported Databases

- **SQL**: PostgreSQL, MySQL, SQLite, SQL Server
- **NoSQL**: MongoDB, DynamoDB, Firestore
- **Cache**: Redis, Memcached
- **Search**: Elasticsearch, Algolia

---

## 9. API Agent

### Purpose

Creates and manages API endpoints, handles integrations, and generates API clients.

### Capabilities

- Design REST APIs
- Create GraphQL schemas
- Generate API endpoints
- Write API documentation
- Create API clients
- Handle authentication
- Implement rate limiting

### Input Format

```json
{
  "task": "Create REST API for user management",
  "context": {
    "type": "rest", // or "graphql", "grpc"
    "framework": "express",
    "authentication": "jwt",
    "operations": ["create", "read", "update", "delete", "list"],
    "features": ["pagination", "filtering", "sorting", "search"]
  }
}
```

### Output Format

```json
{
  "endpoints": [
    {
      "method": "POST",
      "path": "/api/users",
      "description": "Create a new user",
      "authentication": "required",
      "request": {
        "body": {
          "email": "string (required)",
          "password": "string (required)",
          "name": "string (optional)"
        }
      },
      "response": {
        "201": {"user": "User object"},
        "400": {"error": "Validation error"},
        "409": {"error": "Email already exists"}
      }
    }
  ],
  "files": [
    {
      "path": "/src/routes/users.js",
      "content": "const express = require('express');\nconst router = express.Router();\n\nrouter.post('/', async (req, res) => {\n  // Implementation...\n});",
      "type": "routes"
    },
    {
      "path": "/src/middleware/auth.js",
      "content": "// JWT authentication middleware...",
      "type": "middleware"
    }
  ],
  "documentation": {
    "format": "openapi",
    "file": "/docs/api-spec.yaml",
    "content": "openapi: 3.0.0\ninfo:\n  title: User API\n  version: 1.0.0\npaths:\n  /api/users:\n    post:\n      summary: Create user\n      ..."
  },
  "client": {
    "file": "/client/api/users.js",
    "content": "// API client for user endpoints...",
    "language": "javascript"
  },
  "tests": [
    {
      "file": "/tests/routes/users.test.js",
      "content": "// Integration tests for user routes...",
      "coverage": 95
    }
  ]
}
```

### Configuration

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "maxTokens": 6144,
  "temperature": 0.4,
  "systemPrompt": "You are an API architect. Design RESTful, secure, and well-documented APIs following industry standards.",
  "tools": ["read_file", "write_file", "validate_api", "generate_docs"]
}
```

---

## 10. Security Agent

### Purpose

Identifies security vulnerabilities and implements security best practices.

### Capabilities

- Scan for vulnerabilities
- Detect security issues
- Implement authentication
- Handle encryption
- Secure API endpoints
- Audit dependencies
- Generate security reports

### Input Format

```json
{
  "scanType": "comprehensive", // or "dependencies", "code", "configuration"
  "files": ["/src/**/*.js"],
  "context": {
    "framework": "express",
    "authentication": "jwt",
    "compliance": ["GDPR", "OWASP"]
  }
}
```

### Output Format

```json
{
  "summary": {
    "totalIssues": 8,
    "critical": 1,
    "high": 2,
    "medium": 3,
    "low": 2,
    "securityScore": 72
  },
  "vulnerabilities": [
    {
      "severity": "critical",
      "category": "sql_injection",
      "file": "/src/api/users.js",
      "line": 45,
      "description": "SQL injection vulnerability in user search",
      "exploit": "Attacker can inject SQL commands via search parameter",
      "impact": "Full database access, data theft, data manipulation",
      "fix": {
        "description": "Use parameterized queries",
        "code": {
          "before": "const query = `SELECT * FROM users WHERE name LIKE '%${search}%'`;",
          "after": "const query = 'SELECT * FROM users WHERE name LIKE $1';\nconst values = [`%${search}%`];"
        }
      },
      "references": [
        "https://owasp.org/www-community/attacks/SQL_Injection",
        "CWE-89"
      ]
    }
  ],
  "dependencies": {
    "outdated": [
      {
        "package": "express",
        "current": "4.16.0",
        "latest": "4.18.2",
        "vulnerabilities": 3,
        "severity": "high"
      }
    ],
    "recommendations": "Update all dependencies to latest secure versions"
  },
  "bestPractices": {
    "missing": [
      "Input validation on all endpoints",
      "Rate limiting implementation",
      "CORS configuration",
      "Security headers (helmet.js)"
    ],
    "implemented": [
      "JWT authentication",
      "HTTPS enforcement",
      "Password hashing (bcrypt)"
    ]
  },
  "compliance": {
    "GDPR": {
      "status": "partial",
      "missing": ["Data export functionality", "Right to erasure"]
    },
    "OWASP_Top_10": {
      "A01_Broken_Access_Control": "pass",
      "A02_Cryptographic_Failures": "fail",
      "A03_Injection": "fail"
    }
  },
  "fixes": [
    {
      "file": "/src/api/users.js",
      "content": "// Fixed code with security improvements..."
    }
  ]
}
```

### Configuration

```json
{
  "model": "claude-3-5-sonnet-20241022",
  "maxTokens": 8192,
  "temperature": 0.2,
  "systemPrompt": "You are a security expert. Identify vulnerabilities, assess risks, and provide practical fixes following security best practices.",
  "tools": ["read_file", "scan_dependencies", "analyze_code", "check_compliance"]
}
```

---

## Agent Workflows

### Sequential Workflow Example

Generate code → Review → Test → Deploy

```javascript
// 1. Generate code
const codeResult = await executeAgent('code-generation', {
  task: 'Create user registration API'
});

// 2. Review generated code
const reviewResult = await executeAgent('code-review', {
  files: codeResult.files.map(f => f.path)
});

// 3. Generate tests
const testResult = await executeAgent('testing', {
  files: codeResult.files.map(f => f.path),
  framework: 'jest'
});

// 4. Deploy
const deployResult = await executeAgent('devops', {
  task: 'Deploy to staging',
  files: [...codeResult.files, ...testResult.tests]
});
```

### Parallel Workflow Example

Review + Security Scan + Documentation

```javascript
const [reviewResult, securityResult, docsResult] = await Promise.all([
  executeAgent('code-review', { files: ['/src/api/auth.js'] }),
  executeAgent('security', { files: ['/src/api/auth.js'] }),
  executeAgent('documentation', { files: ['/src/api/auth.js'] })
]);
```

### Feedback Loop Example

Generate → Review → Refactor → Review Again

```javascript
let code = await executeAgent('code-generation', { task });

const review = await executeAgent('code-review', { files: code.files });

if (review.score < 80) {
  code = await executeAgent('refactoring', {
    files: code.files,
    issues: review.issues
  });

  // Re-review
  const secondReview = await executeAgent('code-review', { files: code.files });
}
```

## Configuration

### Global Agent Configuration

Edit `config/agents.json`:

```json
{
  "defaults": {
    "model": "claude-3-5-sonnet-20241022",
    "maxTokens": 4096,
    "temperature": 0.5,
    "timeout": 300000,
    "maxRetries": 3
  },
  "agents": {
    "code-generation": {
      "temperature": 0.7,
      "maxTokens": 4096
    },
    "security": {
      "temperature": 0.2,
      "maxTokens": 8192
    }
  }
}
```

### Per-Request Configuration

Override settings per request:

```javascript
await api.post('/agents/code-generation/execute', {
  task: 'Generate component',
  config: {
    temperature: 0.9,  // More creative
    maxTokens: 2048    // Shorter output
  }
});
```

## Best Practices

### 1. Provide Context

Good:
```
"Create a React login form component using Tailwind CSS with email/password fields, validation, and error handling"
```

Bad:
```
"Make a login form"
```

### 2. Use the Right Agent

- **New features** → Code Generation Agent
- **Improve existing** → Refactoring Agent
- **Fix bugs** → Debugging Agent
- **Add tests** → Testing Agent

### 3. Chain Agents Effectively

```
Code Generation → Code Review → Testing → Documentation
```

### 4. Review Agent Output

Always review generated code before deploying. Agents are powerful but should be supervised.

### 5. Iterate

Use feedback loops:
```
Generate → Review → Refactor → Review again
```

### 6. Monitor Performance

Track agent response times and success rates in analytics dashboard.

### 7. Customize Prompts

For specialized needs, customize agent system prompts in configuration.

---

**Next**: Learn about [MCP Tools](MCP-TOOLS.md) for enhanced Claude Code integration.
