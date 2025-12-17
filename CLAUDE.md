# CLAUDE.md - AI Assistant Instructions for RemoteDevAI

**Instructions for AI assistants (Claude, GitHub Copilot, etc.) working on this project.**

---

## Project Overview

**RemoteDevAI** is a revolutionary platform that lets you control AI coding assistants from your phone using voice commands. Whether you're commuting, in a meeting, or away from your desk, you can direct AI agents to write code, fix bugs, run tests, and manage your development workflow.

### Target Users

- **Remote Developers** - Work on code from anywhere, even without a laptop
- **Mobile-First Developers** - Developers who want to code on the go
- **Team Leads** - Monitor and manage development tasks from mobile devices
- **DevOps Engineers** - Deploy and monitor applications remotely

### Core Value Proposition

- Control AI coding agents via voice from your mobile device
- Real-time synchronization between mobile, desktop, and web interfaces
- 10 specialized AI agents for different development tasks
- Screen recording and session playback capabilities
- Multi-user collaboration with real-time updates

---

## Architecture Overview

### Monorepo Structure

RemoteDevAI uses a **monorepo** architecture managed by **npm workspaces**:

```
RemoteDevAI/
├── apps/
│   ├── mobile/          # React Native + Expo (iOS/Android)
│   ├── desktop/         # Electron desktop agent
│   ├── web/             # Next.js 14 landing + dashboard
│   └── cloud/           # Node.js + Express backend API
├── packages/
│   ├── shared/          # Shared TypeScript types and utilities
│   ├── agents/          # The 10 AI agent implementations
│   └── mcp-tools/       # MCP (Model Context Protocol) tools
```

### Component Communication Flow

```
Mobile App (Voice)
    ↓ WebSocket + REST
Cloud Backend (Node.js)
    ↓ Task Queue + WebSocket
Desktop Agent (Electron)
    ↓ MCP Tools
Local Development Environment
```

### The Three-Tier Architecture

1. **Frontend Tier**
   - Mobile app (React Native/Expo) - Voice interface
   - Web dashboard (Next.js 14) - Monitoring and configuration
   - Desktop agent (Electron) - Executes commands locally

2. **Backend Tier**
   - Cloud API (Express + Socket.IO) - Orchestrates communication
   - Authentication (Clerk) - User management
   - Relay Service - Routes commands between mobile and desktop

3. **Data Tier**
   - PostgreSQL (Prisma ORM) - Persistent data storage
   - Redis - Session management and caching
   - AWS S3/GCS - File and recording storage

---

## Technology Stack

### Frontend Technologies

**Mobile App (apps/mobile):**
- React Native 0.74 with Expo ~51.0
- Expo Router for navigation
- NativeWind (TailwindCSS for React Native)
- Zustand for state management
- Socket.IO client for real-time updates
- Clerk Expo for authentication
- Expo Speech for voice input/output
- Expo AV for audio/video playback

**Web Dashboard (apps/web):**
- Next.js 14.1 with App Router
- React 18.2
- TailwindCSS + Tailwind Typography
- Clerk Next.js for authentication
- Framer Motion for animations
- Lucide React for icons
- Socket.IO client for real-time updates

**Desktop Agent (apps/desktop):**
- Electron for cross-platform desktop app
- Node.js for backend integration
- Socket.IO for communication with cloud

### Backend Technologies

**Cloud API (apps/cloud):**
- Node.js >= 18.0.0
- Express 4.21 for REST API
- Socket.IO 4.8 for WebSockets
- TypeScript 5.7 in strict mode
- Prisma 6.1 as ORM
- PostgreSQL as primary database
- Redis for caching and session management
- JWT for authentication
- Zod for runtime validation
- Winston for logging
- Helmet for security
- Morgan for HTTP logging

**AI/LLM Integration:**
- Anthropic Claude API (@anthropic/sdk)
- OpenAI GPT-4 API (openai)
- Google Gemini AI
- Model Context Protocol (MCP) for tool integration

**Authentication & Payments:**
- Clerk for user authentication
- Stripe for payment processing

**Cloud Storage:**
- AWS SDK (@aws-sdk/client-s3)
- S3 presigned URLs for uploads/downloads

### Shared Packages

**packages/shared:**
- TypeScript types and interfaces
- Zod schemas for validation
- Shared utilities and constants
- Common error handling

**packages/agents:**
- 10 specialized AI agents
- EventEmitter3 for event handling
- Winston for logging
- Base agent abstraction

**packages/mcp-tools:**
- MCP tool implementations
- Screen capture/recording tools
- Browser automation (Playwright)
- Video processing (FFmpeg)
- Terminal capture
- File operations

---

## Code Patterns & Conventions

### TypeScript Strict Mode

**ALWAYS use TypeScript strict mode:**
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Type everything explicitly:**
```typescript
// Good
interface UserData {
  id: string;
  email: string;
  name: string;
}

async function getUser(userId: string): Promise<UserData> {
  // ...
}

// Bad
async function getUser(userId) {
  // ...
}
```

### ES6 Modules

**ALWAYS use ES6 import/export syntax:**
```typescript
// Good
import { Router } from 'express';
import type { User } from '@remotedevai/shared';
export { authRoutes };

// Bad
const express = require('express');
module.exports = authRoutes;
```

### Async/Await Pattern

**Use async/await, NEVER use raw promises or callbacks:**
```typescript
// Good
async function handleRequest(req: Request, res: Response) {
  try {
    const result = await service.process(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Bad
function handleRequest(req, res) {
  service.process(req.body).then(result => {
    res.json({ success: true, data: result });
  }).catch(error => {
    res.status(500).json({ success: false, error: error.message });
  });
}
```

### API Response Format

**ALL API responses must follow this standard format:**

```typescript
// Success response
{
  success: true,
  data: any,
  message?: string,
  meta?: {
    requestId: string,
    timestamp: Date,
    version: string
  }
}

// Error response
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any,
    statusCode: number
  }
}

// Paginated response
{
  success: true,
  data: {
    items: T[],
    pagination: {
      page: number,
      limit: number,
      total: number,
      totalPages: number,
      hasNext: boolean,
      hasPrev: boolean
    }
  }
}
```

### Error Handling Conventions

**Backend error handling pattern:**
```typescript
router.post('/endpoint', authenticate, async (req, res) => {
  try {
    // Validate input with Zod
    const validatedData = schema.parse(req.body);

    // Process
    const result = await service.process(validatedData);

    // Return success
    res.status(200).json({
      success: true,
      data: result,
      message: 'Operation successful'
    });
  } catch (error) {
    console.error('Operation failed:', error);

    // Zod validation error
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: error.errors,
          statusCode: 400
        }
      });
    }

    // Generic error
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500
      }
    });
  }
});
```

**Frontend error handling pattern:**
```typescript
// React/React Native
const handleSubmit = async () => {
  try {
    setLoading(true);
    setError(null);

    const response = await api.post('/endpoint', data);

    if (response.success) {
      // Handle success
      setData(response.data);
    } else {
      // Handle API error
      setError(response.error.message);
    }
  } catch (error) {
    // Handle network/runtime error
    console.error('Request failed:', error);
    setError('Network error. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

### WebSocket Event Naming

**Follow this naming convention for Socket.IO events:**

```typescript
// Pattern: <entity>:<action>
// Examples:
'session:joined'
'session:left'
'session:updated'
'message:received'
'message:sent'
'agent:registered'
'agent:status'
'recording:started'
'recording:stopped'
'project:updated'

// Use enums for type safety
enum SocketEvents {
  JOIN_SESSION = 'join:session',
  LEAVE_SESSION = 'leave:session',
  SESSION_JOINED = 'joined:session',
  // ...
}
```

### Zod Validation

**Use Zod schemas for all input validation:**

```typescript
import { z } from 'zod';

// Define schema
const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  visibility: z.enum(['public', 'private']).default('private'),
  tags: z.array(z.string()).optional(),
});

// Use in middleware
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: error.errors
          }
        });
      }
    }
  };
};

// Use in route
router.post('/projects',
  authenticate,
  validateBody(CreateProjectSchema),
  async (req, res) => {
    // req.body is now typed and validated
  }
);
```

---

## File Organization

### Where to Put New Files

**New Backend Route:**
```
apps/cloud/src/routes/
├── auth.routes.ts
├── users.routes.ts
├── projects.routes.ts
└── yourNewRoute.routes.ts  ← Add here
```

**New Backend Service:**
```
apps/cloud/src/services/
├── AuthService.ts
├── UserService.ts
└── YourNewService.ts  ← Add here
```

**New Backend Middleware:**
```
apps/cloud/src/middleware/
├── auth.middleware.ts
├── rateLimit.middleware.ts
└── yourNew.middleware.ts  ← Add here
```

**New Mobile Screen:**
```
apps/mobile/src/
├── screens/
│   ├── HomeScreen.tsx
│   ├── SessionScreen.tsx
│   └── YourNewScreen.tsx  ← Add here
└── components/
    └── YourComponent.tsx  ← Reusable components
```

**New Web Page:**
```
apps/web/src/app/
├── page.tsx           # Landing page
├── dashboard/
│   ├── page.tsx
│   └── sessions/
│       └── page.tsx
└── your-new-page/
    └── page.tsx       ← Add here (Next.js App Router)
```

**New Shared Type:**
```
packages/shared/src/types/
├── user.ts
├── project.ts
├── session.ts
└── yourNewType.ts  ← Add here
```

**New AI Agent:**
```
packages/agents/src/agents/
├── VoiceTranscriptionAgent.ts
├── CodeOrchestratorAgent.ts
└── YourNewAgent.ts  ← Add here (extend BaseAgent)
```

**New MCP Tool:**
```
packages/mcp-tools/src/tools/
├── screenCapture.ts
├── browserAutomation.ts
└── yourNewTool.ts  ← Add here
```

### Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
- Services: `PascalCase.ts` (e.g., `AuthService.ts`)
- Routes: `kebab-case.routes.ts` (e.g., `auth.routes.ts`)
- Types: `kebab-case.ts` (e.g., `user.ts`, `api.ts`)
- Utilities: `camelCase.ts` (e.g., `validation.ts`)

**Variables and Functions:**
- camelCase: `const userId = '123'`
- Functions: `async function handleRequest() {}`
- React components: `function UserProfile() {}`

**Types and Interfaces:**
- PascalCase: `interface UserData {}`
- Type aliases: `type UserId = string;`
- Enums: `enum UserRole { ADMIN, USER }`

**Constants:**
- UPPER_SNAKE_CASE: `const MAX_RETRIES = 3;`
- Object constants: `const CONFIG = { ... };`

---

## API Guidelines

### REST Endpoint Patterns

**Follow RESTful conventions:**

```
GET    /api/users              # List users
GET    /api/users/:id          # Get user by ID
POST   /api/users              # Create user
PUT    /api/users/:id          # Update user (full)
PATCH  /api/users/:id          # Update user (partial)
DELETE /api/users/:id          # Delete user

GET    /api/projects/:projectId/sessions     # List sessions for project
POST   /api/projects/:projectId/sessions     # Create session in project
GET    /api/sessions/:sessionId              # Get session by ID
POST   /api/sessions/:sessionId/messages     # Send message to session
```

**Route structure in Express:**
```typescript
// apps/cloud/src/routes/sessions.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { SessionService } from '../services/SessionService';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await SessionService.listSessions(req.user.userId);
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message }
    });
  }
});

// POST /api/sessions
router.post('/', validateBody(CreateSessionSchema), async (req, res) => {
  try {
    const session = await SessionService.createSession(req.user.userId, req.body);
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'CREATE_FAILED', message: error.message }
    });
  }
});

export default router;
```

### WebSocket Event Patterns

**Server-side (Cloud Backend):**
```typescript
// apps/cloud/src/socket/socketHandler.ts
import { Server as SocketServer } from 'socket.io';

export const initializeSocketHandlers = (io: SocketServer) => {
  io.on('connection', async (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Authenticate socket
    socket.on('authenticate', async (data: { token: string }) => {
      try {
        const payload = AuthService.verifyToken(data.token);
        socket.userId = payload.userId;

        // Join user's room
        socket.join(`user:${payload.userId}`);

        socket.emit('authenticated', { userId: payload.userId });
      } catch (error) {
        socket.emit('authentication_error', { message: error.message });
      }
    });

    // Join session
    socket.on('join:session', (data: { sessionId: string }) => {
      socket.join(`session:${data.sessionId}`);
      socket.emit('joined:session', { sessionId: data.sessionId });

      // Notify others
      socket.to(`session:${data.sessionId}`).emit('session:participant_joined', {
        userId: socket.userId,
        sessionId: data.sessionId
      });
    });

    // Send message
    socket.on('session:message', async (data) => {
      // Broadcast to session room
      io.to(`session:${data.sessionId}`).emit('session:message', {
        ...data,
        timestamp: new Date()
      });
    });
  });
};
```

**Client-side (Mobile/Web):**
```typescript
// React/React Native
import { io, Socket } from 'socket.io-client';

const socket = io(process.env.EXPO_PUBLIC_WS_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling']
});

// Authenticate
socket.emit('authenticate', { token: authToken });

// Listen for authentication
socket.on('authenticated', (data) => {
  console.log('Authenticated:', data.userId);
});

// Join session
socket.emit('join:session', { sessionId: '123' });

// Listen for messages
socket.on('session:message', (data) => {
  console.log('New message:', data);
  // Update UI
});

// Send message
socket.emit('session:message', {
  sessionId: '123',
  message: { content: 'Hello!' }
});

// Cleanup
socket.disconnect();
```

### Authentication Flow

**1. Register/Login (JWT):**
```typescript
// POST /api/auth/register
{
  email: "user@example.com",
  password: "secure_password",
  name: "John Doe"
}

// Response:
{
  success: true,
  data: {
    user: { id, email, name },
    token: "jwt_access_token",
    refreshToken: "jwt_refresh_token",
    expiresIn: 604800  // 7 days in seconds
  }
}
```

**2. Authenticate Requests:**
```typescript
// Add Authorization header
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
}
```

**3. Refresh Token:**
```typescript
// POST /api/auth/refresh
{
  token: "refresh_token"
}

// Response:
{
  success: true,
  data: {
    token: "new_access_token",
    refreshToken: "new_refresh_token",
    expiresIn: 604800
  }
}
```

**4. Middleware Implementation:**
```typescript
// apps/cloud/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_TOKEN', message: 'No token provided' }
      });
    }

    const token = authHeader.substring(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
    });
  }
};
```

### Rate Limiting

**Apply rate limiting to protect endpoints:**
```typescript
// apps/cloud/src/middleware/rateLimit.middleware.ts
import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // 100 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  }
});

// Strict limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,  // 5 requests per window
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts'
    }
  }
});

// Usage in routes
app.use('/api/auth', authLimiter);
app.use('/api/', apiLimiter);
```

---

## Testing Requirements

### Testing Stack

**Backend (apps/cloud):**
- Jest for unit and integration tests
- Supertest for API endpoint testing
- ts-jest for TypeScript support

**Frontend (apps/web):**
- Vitest for unit tests
- React Testing Library for component tests

**Mobile (apps/mobile):**
- Jest with React Native preset
- @testing-library/react-native

### Test File Locations

```
apps/cloud/
├── src/
│   ├── services/
│   │   ├── AuthService.ts
│   │   └── __tests__/
│   │       └── AuthService.test.ts  ← Unit tests
│   └── routes/
│       ├── auth.routes.ts
│       └── __tests__/
│           └── auth.routes.test.ts  ← Integration tests

packages/agents/
├── src/
│   ├── agents/
│   │   ├── CodeOrchestratorAgent.ts
│   │   └── __tests__/
│   │       └── CodeOrchestratorAgent.test.ts
```

### What to Test

**Backend Services:**
```typescript
// apps/cloud/src/services/__tests__/AuthService.test.ts
import { AuthService } from '../AuthService';

describe('AuthService', () => {
  describe('register', () => {
    it('should create a new user with valid credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      };

      const result = await AuthService.register(userData);

      expect(result.user.email).toBe(userData.email);
      expect(result.token).toBeDefined();
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        name: 'Test User'
      };

      await expect(AuthService.register(userData))
        .rejects.toThrow('Email already exists');
    });
  });
});
```

**API Endpoints:**
```typescript
// apps/cloud/src/routes/__tests__/auth.routes.test.ts
import request from 'supertest';
import { app } from '../../server';

describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toHaveProperty('id');
    expect(response.body.data.token).toBeDefined();
  });

  it('should return 400 for invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'invalid-email',
        password: 'SecurePass123!',
        name: 'Test User'
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
```

**React Components:**
```typescript
// apps/web/src/components/__tests__/UserProfile.test.tsx
import { render, screen } from '@testing-library/react';
import { UserProfile } from '../UserProfile';

describe('UserProfile', () => {
  it('should render user name', () => {
    const user = { id: '1', name: 'John Doe', email: 'john@example.com' };

    render(<UserProfile user={user} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests for specific package
npm test -w apps/cloud

# Run with coverage
npm test -- --coverage
```

---

## Security Guidelines

### Never Hardcode Secrets

**NEVER:**
```typescript
// BAD - Never do this!
const apiKey = 'sk-ant-api03-xxxxxxxxxxxxxxx';
const dbPassword = 'mySecretPassword123';
```

**ALWAYS:**
```typescript
// GOOD - Use environment variables
const apiKey = process.env.ANTHROPIC_API_KEY;
const dbPassword = process.env.DATABASE_PASSWORD;

// Validate on startup
if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY is required');
}
```

### Input Validation

**Always validate and sanitize user input:**
```typescript
import { z } from 'zod';

const UserInputSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional()
});

router.post('/users', async (req, res) => {
  try {
    // Validate input
    const validatedData = UserInputSchema.parse(req.body);

    // Safe to use
    const user = await createUser(validatedData);
    res.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', details: error.errors }
      });
    }
  }
});
```

### SQL Injection Prevention

**Use Prisma ORM (parameterized queries):**
```typescript
// GOOD - Prisma prevents SQL injection
const user = await prisma.user.findUnique({
  where: { email: userEmail }  // Safe
});

// GOOD - Even with raw queries
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userEmail}
`;  // Prisma parameterizes this

// BAD - Never construct SQL strings manually
const query = `SELECT * FROM users WHERE email = '${userEmail}'`;  // Vulnerable!
```

### XSS Prevention

**Sanitize output in React:**
```typescript
// React automatically escapes by default
function UserProfile({ user }) {
  return (
    <div>
      <h1>{user.name}</h1>  {/* Safe - auto-escaped */}
    </div>
  );
}

// If you MUST use dangerouslySetInnerHTML, sanitize first
import DOMPurify from 'isomorphic-dompurify';

function RichContent({ html }) {
  const sanitized = DOMPurify.sanitize(html);

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### CORS Configuration

**Configure CORS properly:**
```typescript
// apps/cloud/src/server.ts
import cors from 'cors';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Password Hashing

**Always hash passwords:**
```typescript
import bcrypt from 'bcryptjs';

// Hash password before storing
const hashPassword = async (password: string): Promise<string> => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  return bcrypt.hash(password, rounds);
};

// Verify password
const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Usage
const hashedPassword = await hashPassword(user.password);
await prisma.user.create({
  data: {
    email: user.email,
    passwordHash: hashedPassword  // Never store plain text!
  }
});
```

### JWT Security

**Implement secure JWT handling:**
```typescript
import jwt from 'jsonwebtoken';

// Create token
const createToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'remotedevai',
    audience: 'remotedevai-users'
  });
};

// Verify token
const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!, {
    issuer: 'remotedevai',
    audience: 'remotedevai-users'
  }) as JWTPayload;
};
```

---

## Common Tasks

### Adding a New API Endpoint

**Step-by-step guide:**

1. **Define the route in a route file:**
```typescript
// apps/cloud/src/routes/tasks.routes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { TaskService } from '../services/TaskService';
import { CreateTaskSchema } from '../schemas/taskSchema';

const router = Router();

router.post('/',
  authenticate,
  validateBody(CreateTaskSchema),
  async (req, res) => {
    try {
      const task = await TaskService.createTask(req.user.userId, req.body);
      res.status(201).json({ success: true, data: task });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'CREATE_FAILED', message: error.message }
      });
    }
  }
);

export default router;
```

2. **Create the service:**
```typescript
// apps/cloud/src/services/TaskService.ts
export class TaskService {
  static async createTask(userId: string, data: CreateTaskInput) {
    const task = await prisma.task.create({
      data: {
        userId,
        ...data
      }
    });

    return task;
  }
}
```

3. **Register the route in server.ts:**
```typescript
// apps/cloud/src/server.ts
import taskRoutes from './routes/tasks.routes';

app.use('/api/tasks', taskRoutes);
```

4. **Add types to shared package:**
```typescript
// packages/shared/src/types/task.ts
export interface Task {
  id: string;
  userId: string;
  title: string;
  status: 'pending' | 'completed';
  createdAt: Date;
}
```

5. **Test the endpoint:**
```typescript
// apps/cloud/src/routes/__tests__/tasks.routes.test.ts
describe('POST /api/tasks', () => {
  it('should create a new task', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'New Task' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

### Adding a New Page (Web Dashboard)

**Next.js 14 App Router pattern:**

1. **Create the page:**
```typescript
// apps/web/src/app/tasks/page.tsx
import { Metadata } from 'next';
import { TaskList } from '@/components/TaskList';

export const metadata: Metadata = {
  title: 'Tasks - RemoteDevAI',
  description: 'Manage your development tasks'
};

export default function TasksPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Tasks</h1>
      <TaskList />
    </div>
  );
}
```

2. **Create the component:**
```typescript
// apps/web/src/components/TaskList.tsx
'use client';

import { useState, useEffect } from 'react';
import { useTasks } from '@/hooks/useTasks';

export function TaskList() {
  const { tasks, loading, error } = useTasks();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-4">
      {tasks.map(task => (
        <div key={task.id} className="p-4 border rounded">
          <h3>{task.title}</h3>
        </div>
      ))}
    </div>
  );
}
```

3. **Create the hook:**
```typescript
// apps/web/src/hooks/useTasks.ts
import { useState, useEffect } from 'react';
import { api } from '@/services/api';

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await api.get('/tasks');
        if (response.success) {
          setTasks(response.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  return { tasks, loading, error };
}
```

### Adding a New AI Agent

**Extend the BaseAgent class:**

1. **Create the agent:**
```typescript
// packages/agents/src/agents/YourNewAgent.ts
import { BaseAgent } from '../base/BaseAgent';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentType
} from '../types';

export class YourNewAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super({
      ...config,
      type: AgentType.YOUR_NEW_AGENT
    });
  }

  protected async onInitialize(): Promise<void> {
    // Initialize resources
    this.logger.info('YourNewAgent initialized');
  }

  protected async process(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse> {
    this.logger.debug('Processing message', { messageId: message.id });

    try {
      // Your agent logic here
      const result = await this.performTask(message.payload);

      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(
        'PROCESSING_ERROR',
        error.message
      );
    }
  }

  private async performTask(payload: any): Promise<any> {
    // Implement your agent's specific logic
    return { processed: true };
  }

  protected async onShutdown(): Promise<void> {
    // Cleanup resources
    this.logger.info('YourNewAgent shutdown');
  }
}
```

2. **Register in orchestrator:**
```typescript
// packages/agents/src/orchestrator/AgentOrchestrator.ts
import { YourNewAgent } from '../agents/YourNewAgent';

export class AgentOrchestrator {
  private agents: Map<AgentType, BaseAgent>;

  async initialize() {
    // ... existing agents

    const yourNewAgent = new YourNewAgent({
      name: 'Your New Agent',
      type: AgentType.YOUR_NEW_AGENT,
      enabled: true,
      retryAttempts: 3,
      timeout: 30000,
      logLevel: 'info'
    });

    await yourNewAgent.initialize();
    this.agents.set(AgentType.YOUR_NEW_AGENT, yourNewAgent);
  }
}
```

### Adding a New MCP Tool

**Create an MCP tool:**

1. **Define the tool:**
```typescript
// packages/mcp-tools/src/tools/yourNewTool.ts
import { z } from 'zod';
import { ToolResponse } from '../types';

// Define input schema
export const YourToolSchema = z.object({
  param1: z.string(),
  param2: z.number().optional()
});

export type YourToolParams = z.infer<typeof YourToolSchema>;

// Implement the tool
export async function yourNewTool(
  params: YourToolParams
): Promise<ToolResponse> {
  try {
    // Tool implementation
    const result = await performOperation(params);

    return {
      success: true,
      data: result,
      message: 'Operation completed successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function performOperation(params: YourToolParams) {
  // Your tool's logic
  return { processed: true };
}
```

2. **Register in MCP server:**
```typescript
// packages/mcp-tools/src/server.ts
import { yourNewTool, YourToolSchema } from './tools/yourNewTool';

const tools = [
  {
    name: 'your_new_tool',
    description: 'Description of what your tool does',
    inputSchema: YourToolSchema,
    handler: yourNewTool
  }
];
```

### Modifying the Database Schema

**Using Prisma:**

1. **Update schema:**
```prisma
// apps/cloud/prisma/schema.prisma
model Task {
  id          String   @id @default(uuid())
  userId      String
  title       String
  description String?
  status      String   @default("pending")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

2. **Create migration:**
```bash
cd apps/cloud
npx prisma migrate dev --name add_tasks_table
```

3. **Generate Prisma client:**
```bash
npx prisma generate
```

4. **Use in code:**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const task = await prisma.task.create({
  data: {
    userId: '123',
    title: 'New Task',
    description: 'Task description'
  }
});
```

---

## Environment Variables

### Reference to .env.example

See `.env.example` in the root directory for all available environment variables.

### Required Variables

**Minimum to run the app:**
```bash
# Server
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/remotedevai

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars

# AI (at least one)
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Optional Variables

**For full functionality:**
```bash
# Redis (caching)
REDIS_URL=redis://localhost:6379

# AWS S3 (file storage)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=remotedevai-storage

# Stripe (payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Clerk (alternative auth)
CLERK_SECRET_KEY=sk_test_...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Per-Environment Differences

**Development (.env.development):**
```bash
NODE_ENV=development
DEBUG=true
LOG_LEVEL=debug
SKIP_AUTH=false  # Never skip auth, even in dev
```

**Production (.env.production):**
```bash
NODE_ENV=production
DEBUG=false
LOG_LEVEL=info
FORCE_HTTPS=true
SESSION_SECURE=true
COOKIE_SECURE=true
```

---

## Deployment

### Cloud Deployment (Backend)

**Recommended platforms:**
- AWS (EC2, ECS, Lambda)
- Google Cloud Platform (Cloud Run, GKE)
- Railway
- Render
- Fly.io

**Steps:**

1. **Build the cloud backend:**
```bash
cd apps/cloud
npm run build
```

2. **Set environment variables on platform**

3. **Run migrations:**
```bash
npx prisma migrate deploy
```

4. **Start server:**
```bash
npm start
```

### Desktop Builds

**Build for all platforms:**
```bash
cd apps/desktop
npm run build
npm run package  # Creates installers for Windows, Mac, Linux
```

### Mobile Builds

**Development:**
```bash
cd apps/mobile

# iOS
npm run ios

# Android
npm run android
```

**Production:**
```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

### Web Deployment

**Deploy to Vercel:**
```bash
cd apps/web

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

---

## Gotchas & Tips

### Common Mistakes

1. **Forgetting to authenticate sockets**
   - Always emit 'authenticate' event after connecting
   - Join rooms only after authentication

2. **Not handling WebSocket disconnections**
   - Always implement reconnection logic
   - Clean up listeners on unmount

3. **Mixing Prisma clients**
   - Use a singleton pattern for Prisma client
   - Don't create new instances in every file

4. **Ignoring TypeScript errors**
   - NEVER use `@ts-ignore` without a good reason
   - Fix type errors, don't suppress them

5. **Not validating input**
   - Always validate API input with Zod
   - Never trust client-side data

6. **Hardcoding values**
   - Use environment variables
   - Use constants files for app-wide values

7. **Not cleaning up resources**
   - Close database connections
   - Cancel subscriptions in useEffect cleanup
   - Remove event listeners

### Performance Considerations

**Backend:**
- Use database indexes on frequently queried fields
- Implement pagination for large datasets
- Cache frequently accessed data in Redis
- Use database connection pooling
- Compress API responses

**Frontend:**
- Lazy load routes and components
- Memoize expensive computations with useMemo
- Debounce search inputs
- Virtualize long lists
- Optimize images (use Next.js Image component)

**WebSocket:**
- Batch updates when possible
- Implement throttling for high-frequency events
- Use rooms to target specific clients
- Compress payloads for large data

### Known Limitations

1. **File Upload Size** - Max 10MB per file
2. **WebSocket Message Size** - Max 1MB per message
3. **Recording Duration** - Max 10 minutes per session
4. **Concurrent Agents** - Max 5 agents per user
5. **API Rate Limits** - 100 requests per 15 minutes

---

## Resources

### Documentation

- **Project Docs**: See `docs/` directory
  - `docs/ARCHITECTURE.md` - System architecture
  - `docs/API.md` - API reference
  - `docs/AGENTS.md` - Agent documentation
  - `docs/SETUP.md` - Setup instructions

### External Documentation

**Core Technologies:**
- [Node.js Documentation](https://nodejs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Prisma Documentation](https://www.prisma.io/docs)

**Frontend:**
- [Next.js 14 Docs](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

**AI/LLM:**
- [Anthropic Claude API](https://docs.anthropic.com/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Model Context Protocol](https://modelcontextprotocol.io/)

**Authentication:**
- [Clerk Documentation](https://clerk.com/docs)
- [JWT.io](https://jwt.io/)

**Payments:**
- [Stripe API Docs](https://stripe.com/docs/api)

**Cloud Services:**
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)
- [Google Cloud Docs](https://cloud.google.com/docs)

---

## Getting Help

1. **Check the documentation** in `/docs` directory
2. **Review existing code** for patterns and examples
3. **Search GitHub issues** for similar problems
4. **Check API examples** in `docs/API.md`
5. **Review architecture diagrams** in `docs/ARCHITECTURE.md`
6. **Read this CLAUDE.md** for conventions and patterns

---

## Critical Reminders

### Before Committing Code

- [ ] All TypeScript errors resolved (no `@ts-ignore`)
- [ ] Input validation added (Zod schemas)
- [ ] Error handling implemented (try/catch)
- [ ] Authentication/authorization checked
- [ ] API responses follow standard format
- [ ] WebSocket events use correct naming convention
- [ ] Tests written for new functionality
- [ ] No secrets hardcoded
- [ ] Environment variables documented
- [ ] Code formatted (Prettier)
- [ ] Linting passes (ESLint)

### Security Checklist

- [ ] No API keys in code
- [ ] All inputs validated
- [ ] SQL injection prevented (using Prisma)
- [ ] XSS prevented (React auto-escaping)
- [ ] CORS configured correctly
- [ ] Rate limiting applied
- [ ] Passwords hashed (bcrypt)
- [ ] JWT tokens secured
- [ ] HTTPS in production

### Code Quality Standards

- [ ] TypeScript strict mode enabled
- [ ] All functions have type annotations
- [ ] Async/await used (not callbacks)
- [ ] Error messages are descriptive
- [ ] Logging added for debugging
- [ ] Code is DRY (Don't Repeat Yourself)
- [ ] Functions are small and focused
- [ ] Comments explain "why", not "what"

---

**Remember**: This is a production-ready platform. Code quality, security, and user experience are our top priorities. When in doubt, ask for clarification or review existing patterns.

**Built with care by the RemoteDevAI team**
