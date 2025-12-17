# RemoteDevAI Architecture

This document provides a comprehensive overview of the RemoteDevAI system architecture, component interactions, and design decisions.

## Table of Contents

- [High-Level Overview](#high-level-overview)
- [System Components](#system-components)
- [Data Flow](#data-flow)
- [Agent Architecture](#agent-architecture)
- [Security Model](#security-model)
- [Deployment Architecture](#deployment-architecture)
- [Technology Stack](#technology-stack)
- [Design Decisions](#design-decisions)

## High-Level Overview

RemoteDevAI is a distributed system designed to enable AI-powered software development across multiple platforms. The architecture follows a client-server model with microservices-inspired agent design.

### Core Principles

1. **Modularity** - Each agent is independent and specialized
2. **Scalability** - Horizontal scaling through job queues
3. **Security** - Multi-layer security with encryption and sandboxing
4. **Real-time** - WebSocket communication for instant updates
5. **Cross-platform** - Unified API for all client types

## System Components

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
├──────────────┬──────────────────┬──────────────┬────────────────┤
│  Mobile App  │  Web Dashboard   │ Desktop Agent│  CLI Tools     │
│ (iOS/Android)│   (React SPA)    │  (Node.js)   │  (Node.js)     │
└──────┬───────┴────────┬─────────┴──────┬───────┴────────┬───────┘
       │                │                │                │
       │                └────────┬───────┘                │
       │                         │                        │
       └─────────────────────────┼────────────────────────┘
                                 │
                          HTTPS/WSS
                                 │
┌────────────────────────────────▼─────────────────────────────────┐
│                      API Gateway Layer                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Express.js API Server + Socket.IO WebSocket Server       │  │
│  │  - Authentication & Authorization                          │  │
│  │  - Rate Limiting                                          │  │
│  │  - Request Validation                                     │  │
│  │  - WebSocket Room Management                              │  │
│  └────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌────────▼────────┐    ┌─────────▼────────┐   ┌─────────▼────────┐
│  Service Layer  │    │   Agent Manager   │   │   Job Queue      │
│                 │    │                   │   │   (Bull + Redis) │
│ - User Service  │    │ - Agent Registry  │   │                  │
│ - Project Svc   │    │ - Task Router     │   │ - Job Scheduling │
│ - File Service  │    │ - Agent Monitor   │   │ - Priority Queue │
│ - Git Service   │    │                   │   │ - Retry Logic    │
└────────┬────────┘    └─────────┬─────────┘   └─────────┬────────┘
         │                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
┌───────────────▼──┐  ┌──────────▼────────┐  ┌───▼──────────────┐
│   AI Agents      │  │  Data Layer       │  │  External APIs   │
│   (10 agents)    │  │                   │  │                  │
│                  │  │ - PostgreSQL      │  │ - Claude API     │
│ 1. Code Gen      │  │ - Redis Cache     │  │ - GitHub API     │
│ 2. Code Review   │  │ - File Storage    │  │ - Docker API     │
│ 3. Testing       │  │ - Vector DB       │  │ - Cloud Providers│
│ 4. Debugging     │  │   (Embeddings)    │  │                  │
│ 5. Refactoring   │  └───────────────────┘  └──────────────────┘
│ 6. Documentation │
│ 7. DevOps        │
│ 8. Database      │
│ 9. API           │
│ 10. Security     │
└──────────────────┘
```

### 1. Client Layer

#### Mobile App (React Native)
- **Purpose**: Voice-first development interface
- **Features**:
  - Voice input/output
  - Project browser
  - Code preview
  - Video generation results
  - Real-time notifications

#### Web Dashboard (React + Vite)
- **Purpose**: Full-featured web interface
- **Features**:
  - Project management
  - Code editor
  - Agent configuration
  - Analytics dashboard
  - Team collaboration

#### Desktop Agent (Node.js)
- **Purpose**: Local development environment integration
- **Features**:
  - File system access
  - Claude Code integration
  - MCP tools provider
  - Git operations
  - Local execution

#### CLI Tools
- **Purpose**: Command-line interface
- **Features**:
  - Project scaffolding
  - Agent invocation
  - Deployment commands
  - Configuration management

### 2. API Gateway Layer

#### Express.js API Server
- RESTful API endpoints
- Request validation (express-validator)
- Authentication middleware (JWT)
- Rate limiting (express-rate-limit)
- CORS configuration

#### Socket.IO WebSocket Server
- Real-time bidirectional communication
- Room-based message routing
- Automatic reconnection
- Binary data support (file streaming)

### 3. Service Layer

Encapsulates business logic and orchestrates agent operations.

**Key Services**:
- `UserService` - User management, authentication
- `ProjectService` - Project CRUD, permissions
- `FileService` - File operations, storage
- `GitService` - Git operations, webhooks
- `AgentService` - Agent lifecycle management
- `AnalyticsService` - Usage tracking, metrics

### 4. Agent Manager

Coordinates AI agent execution and monitoring.

**Responsibilities**:
- Agent registration and discovery
- Task routing to appropriate agents
- Agent health monitoring
- Resource allocation
- Error recovery

### 5. Job Queue (Bull + Redis)

Manages asynchronous task execution.

**Features**:
- Priority-based scheduling
- Retry with exponential backoff
- Job progress tracking
- Failed job handling
- Concurrency control

### 6. AI Agents

Ten specialized agents, each with:
- Dedicated prompt engineering
- Context management
- Tool integration
- Output formatting
- Error handling

See [AGENTS.md](AGENTS.md) for detailed agent documentation.

### 7. Data Layer

#### PostgreSQL
- User data
- Projects and files
- Agent execution history
- Audit logs

#### Redis
- Session storage
- Job queue
- Real-time data cache
- Rate limiting counters

#### Vector Database (Pinecone/Qdrant)
- Code embeddings
- Semantic search
- Similar code detection

#### File Storage (S3-compatible)
- Project files
- Generated artifacts
- Video outputs
- Backups

### 8. External APIs

- **Claude API** - AI model for agents
- **GitHub API** - Repository management
- **Docker API** - Container operations
- **Cloud Providers** - AWS, Azure, GCP

## Data Flow

### 1. Voice Command Flow

```
User speaks → Mobile App
                 │
                 ├─ Speech-to-Text (device)
                 │
                 ▼
             Text Command
                 │
                 ├─ WebSocket → API Gateway
                 │
                 ▼
          Agent Manager
                 │
                 ├─ Route to appropriate agent
                 │
                 ▼
          Selected Agent
                 │
                 ├─ Claude API call
                 │
                 ▼
          Generated Response
                 │
                 ├─ WebSocket → Mobile App
                 │
                 ▼
         Text-to-Speech → User hears
```

### 2. Code Generation Flow

```
User Request
    │
    ▼
API Gateway
    │
    ├─ Authenticate
    ├─ Validate
    │
    ▼
Agent Manager
    │
    ├─ Create Job
    ├─ Add to Queue
    │
    ▼
Job Queue
    │
    ├─ Dequeue Job
    │
    ▼
Code Generation Agent
    │
    ├─ Load Context (previous code, dependencies)
    ├─ Call Claude API
    ├─ Generate Code
    ├─ Validate Syntax
    │
    ▼
File Service
    │
    ├─ Save to Storage
    ├─ Update Database
    │
    ▼
WebSocket Notification
    │
    ▼
Client (real-time update)
```

### 3. Desktop Agent Sync Flow

```
Desktop Agent
    │
    ├─ Watch Local Files
    │
    ▼
File Change Detected
    │
    ├─ Calculate Diff
    ├─ Compress Changes
    │
    ▼
WebSocket → Cloud Backend
    │
    ├─ Authenticate
    ├─ Validate Changes
    │
    ▼
File Service
    │
    ├─ Apply Changes
    ├─ Store in Database
    ├─ Update Cache
    │
    ▼
Broadcast to Other Clients
    │
    ├─ WebSocket → Mobile App
    ├─ WebSocket → Web Dashboard
    │
    ▼
Clients Sync (real-time)
```

## Agent Architecture

### Agent Base Class

```javascript
class BaseAgent {
  constructor(config) {
    this.name = config.name;
    this.description = config.description;
    this.systemPrompt = config.systemPrompt;
    this.tools = config.tools || [];
    this.maxTokens = config.maxTokens || 4096;
  }

  async execute(task) {
    // 1. Prepare context
    const context = await this.prepareContext(task);

    // 2. Call Claude API
    const response = await this.callClaude(context);

    // 3. Process response
    const result = await this.processResponse(response);

    // 4. Store results
    await this.storeResults(task.id, result);

    // 5. Notify client
    await this.notifyClient(task.userId, result);

    return result;
  }

  async prepareContext(task) {
    // Load relevant files, history, dependencies
  }

  async callClaude(context) {
    // API call to Claude with system prompt + context
  }

  async processResponse(response) {
    // Parse, validate, format response
  }

  async storeResults(taskId, result) {
    // Save to database
  }

  async notifyClient(userId, result) {
    // WebSocket notification
  }
}
```

### Agent Communication

Agents can communicate through:
1. **Message Queue** - Async task passing
2. **Shared Context** - Database/cache
3. **Direct Invocation** - Synchronous calls

Example: Code Generation Agent → Testing Agent
```javascript
// Code Gen Agent completes
const codeResult = await codeGenAgent.execute(task);

// Automatically trigger Testing Agent
const testJob = await queue.add('run-tests', {
  projectId: task.projectId,
  files: codeResult.files,
  triggeredBy: 'code-generation',
});
```

## Security Model

### Multi-Layer Security

```
┌─────────────────────────────────────────┐
│         Transport Layer                 │
│  - TLS 1.3 encryption                   │
│  - Certificate pinning (mobile)         │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Authentication Layer               │
│  - JWT tokens (access + refresh)        │
│  - OAuth 2.0 providers                  │
│  - API key authentication               │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Authorization Layer                │
│  - Role-based access control (RBAC)     │
│  - Project-level permissions            │
│  - Resource ownership validation        │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Execution Layer                    │
│  - Code sandboxing (VM2/Docker)         │
│  - Resource limits (CPU, memory, time)  │
│  - Network isolation                    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Data Layer                      │
│  - Encryption at rest (AES-256)         │
│  - Field-level encryption (sensitive)   │
│  - Audit logging                        │
└─────────────────────────────────────────┘
```

### Authentication Flow

```
Client → Login Request → API Gateway
                            │
                            ├─ Validate Credentials
                            │
                            ▼
                     User Service
                            │
                            ├─ Verify Password (bcrypt)
                            │
                            ▼
                     Generate Tokens
                            │
                            ├─ Access Token (15min)
                            ├─ Refresh Token (7d)
                            │
                            ▼
                   Return to Client
                            │
                            ├─ Store in Secure Storage
                            │
                            ▼
                   Subsequent Requests
                            │
                            ├─ Include Access Token
                            ├─ JWT Verification
                            ├─ Extract User Context
                            │
                            ▼
                   Authorized Request
```

### Code Execution Sandboxing

Desktop Agent executes code in isolated environments:

```javascript
// Docker-based sandboxing
const sandbox = await docker.createContainer({
  Image: 'remotedevai/sandbox:latest',
  Cmd: ['node', 'script.js'],
  HostConfig: {
    Memory: 512 * 1024 * 1024, // 512MB
    CpuQuota: 50000, // 50% of one core
    NetworkMode: 'none', // No network access
    ReadonlyRootfs: true,
  },
  WorkingDir: '/workspace',
  Volumes: {
    '/workspace': {},
  },
});

// Time limit
const timeout = setTimeout(() => {
  sandbox.kill();
}, 30000); // 30 seconds

await sandbox.start();
```

## Deployment Architecture

### Production Deployment

```
                    ┌─────────────────┐
                    │   CDN (Cloudflare)  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Load Balancer  │
                    │   (AWS ALB)     │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
┌─────────▼─────────┐ ┌──────▼──────┐ ┌────────▼────────┐
│  API Server       │ │ API Server  │ │  API Server     │
│  (ECS/Fargate)    │ │ (ECS/Fargate│ │  (ECS/Fargate)  │
│  - Node.js        │ │             │ │                 │
│  - Express        │ │             │ │                 │
│  - Socket.IO      │ │             │ │                 │
└─────────┬─────────┘ └──────┬──────┘ └────────┬────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
┌─────────▼─────────┐ ┌──────▼──────────┐ ┌────▼──────────┐
│  PostgreSQL       │ │   Redis         │ │  S3 Storage   │
│  (RDS)            │ │   (ElastiCache) │ │               │
│  - Multi-AZ       │ │   - Cluster     │ │  - Versioning │
│  - Auto backup    │ │   - Replication │ │  - Encryption │
└───────────────────┘ └─────────────────┘ └───────────────┘
```

### Desktop Agent Deployment

```
┌────────────────────────────────────┐
│     User's Local Machine           │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  Desktop Agent (Node.js)     │  │
│  │  - Auto-update (Electron)    │  │
│  │  - System tray app           │  │
│  └──────────┬───────────────────┘  │
│             │                      │
│  ┌──────────▼───────────────────┐  │
│  │  Claude Code Integration     │  │
│  │  - MCP Server                │  │
│  │  - Tool Providers            │  │
│  └──────────┬───────────────────┘  │
│             │                      │
│  ┌──────────▼───────────────────┐  │
│  │  Local File System           │  │
│  │  - Project Files             │  │
│  │  - Git Repository            │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
             │
             │ Secure WebSocket
             │ (wss://)
             │
┌────────────▼────────────────────────┐
│      Cloud Backend                  │
└─────────────────────────────────────┘
```

### Mobile App Architecture

```
┌────────────────────────────────────┐
│         Mobile App                 │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  UI Layer (React Native)     │  │
│  │  - Screens                   │  │
│  │  - Components                │  │
│  └──────────┬───────────────────┘  │
│             │                      │
│  ┌──────────▼───────────────────┐  │
│  │  State Management (Zustand)  │  │
│  └──────────┬───────────────────┘  │
│             │                      │
│  ┌──────────▼───────────────────┐  │
│  │  Services Layer              │  │
│  │  - API Client                │  │
│  │  - WebSocket Client          │  │
│  │  - Storage (AsyncStorage)    │  │
│  └──────────┬───────────────────┘  │
│             │                      │
│  ┌──────────▼───────────────────┐  │
│  │  Native Modules              │  │
│  │  - Speech Recognition        │  │
│  │  - Text-to-Speech            │  │
│  │  - File Picker               │  │
│  │  - Secure Storage            │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

## Technology Stack

### Backend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Runtime | Node.js 18+ | Server-side JavaScript |
| Framework | Express.js | Web framework |
| WebSocket | Socket.IO | Real-time communication |
| Database | PostgreSQL 14+ | Primary data store |
| Cache | Redis 6+ | Session, queue, cache |
| Job Queue | Bull | Background jobs |
| AI Model | Claude (Anthropic) | Agent intelligence |
| Vector DB | Pinecone/Qdrant | Code embeddings |
| Storage | S3 (AWS/MinIO) | File storage |

### Frontend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Web | React + Vite | Web dashboard |
| Mobile | React Native | iOS/Android apps |
| Desktop | Electron | Desktop agent GUI |
| State | Zustand | State management |
| Styling | TailwindCSS | UI styling |
| Icons | Lucide React | Icon library |

### DevOps

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Container | Docker | Containerization |
| Orchestration | Kubernetes/ECS | Container orchestration |
| CI/CD | GitHub Actions | Automation |
| Monitoring | Prometheus + Grafana | Metrics |
| Logging | ELK Stack | Centralized logging |
| Error Tracking | Sentry | Error monitoring |

## Design Decisions

### 1. Why 10 Specialized Agents?

**Decision**: Use specialized agents instead of one general-purpose agent.

**Rationale**:
- Better prompt engineering per domain
- Easier to optimize and maintain
- Can evolve independently
- Better error handling and debugging
- Allows for different model versions per agent

### 2. Why WebSocket over HTTP polling?

**Decision**: Use WebSocket (Socket.IO) for real-time updates.

**Rationale**:
- Lower latency for real-time features
- Reduced server load (no polling)
- Bidirectional communication
- Better for voice features
- Native reconnection handling

### 3. Why Desktop Agent instead of pure cloud?

**Decision**: Hybrid architecture with local desktop agent.

**Rationale**:
- Direct file system access
- No upload/download for large projects
- Works offline for local operations
- Better Claude Code integration
- Privacy for sensitive code

### 4. Why Job Queue for agent tasks?

**Decision**: Use Bull + Redis for job queue instead of direct execution.

**Rationale**:
- Handle long-running operations
- Retry failed tasks
- Priority-based execution
- Better resource management
- Graceful degradation under load

### 5. Why PostgreSQL over NoSQL?

**Decision**: Use PostgreSQL as primary database.

**Rationale**:
- Strong consistency for user data
- Complex queries (joins, aggregations)
- ACID transactions
- Mature tooling and ecosystem
- JSON support for flexibility

### 6. Why React Native over Native?

**Decision**: Use React Native for mobile apps.

**Rationale**:
- Code sharing between iOS/Android
- Faster development cycle
- Reuse web components
- Native performance for UI
- Large ecosystem

## Scalability Considerations

### Horizontal Scaling

```
┌─────────────────────────────────────────────────┐
│  API Servers (N instances)                      │
│  - Stateless design                             │
│  - Session in Redis                             │
│  - Scale based on CPU/memory                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Agent Workers (M instances)                    │
│  - Pull from shared queue                       │
│  - Auto-scale based on queue depth              │
│  - Different instance sizes per agent type      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Database (Primary + Replicas)                  │
│  - Read replicas for queries                    │
│  - Write to primary                             │
│  - Connection pooling (PgBouncer)               │
└─────────────────────────────────────────────────┘
```

### Performance Optimizations

1. **Caching Strategy**
   - Redis for session data (TTL: 1 hour)
   - In-memory cache for frequently accessed data
   - CDN for static assets

2. **Database Optimization**
   - Indexes on frequently queried fields
   - Partitioning large tables by date
   - Materialized views for analytics

3. **Agent Optimization**
   - Context caching (reuse for similar tasks)
   - Prompt template caching
   - Response streaming for large outputs

4. **Network Optimization**
   - Compression (gzip/brotli)
   - WebSocket message batching
   - Binary protocol for file transfers

## Monitoring and Observability

```
┌─────────────────────────────────────────────────┐
│  Metrics (Prometheus)                           │
│  - Request rate, latency, errors                │
│  - Agent execution time                         │
│  - Queue depth                                  │
│  - Database connections                         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Logs (ELK Stack)                               │
│  - Structured JSON logging                      │
│  - Request/response logging                     │
│  - Error stack traces                           │
│  - Audit trail                                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Tracing (OpenTelemetry)                        │
│  - Distributed tracing                          │
│  - Request flow visualization                   │
│  - Performance bottleneck detection             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Alerting (PagerDuty/Opsgenie)                  │
│  - Error rate threshold alerts                  │
│  - Latency alerts                               │
│  - Queue depth alerts                           │
│  - Database connection alerts                   │
└─────────────────────────────────────────────────┘
```

## Future Architecture Considerations

1. **Multi-region Deployment** - Deploy in multiple AWS regions for lower latency
2. **Edge Computing** - Run lightweight agents on edge nodes
3. **Federated Learning** - Allow users to train custom models locally
4. **Plugin System** - Third-party agent development
5. **Kubernetes Migration** - Move from ECS to Kubernetes for better orchestration

---

**Next**: Read [API.md](API.md) for detailed API documentation.
