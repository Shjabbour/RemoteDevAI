# RemoteDevAI Cloud Backend

Cloud backend API server for RemoteDevAI - a platform for remote AI-assisted development with screen recording and real-time collaboration.

## Features

- **Authentication & Authorization**: JWT-based auth with optional Clerk integration
- **Project Management**: Create and manage development projects
- **Session Tracking**: Track coding sessions with AI assistance
- **Screen Recordings**: Upload and manage screen recordings with S3/R2 storage
- **Real-time Communication**: WebSocket-based real-time updates via Socket.IO
- **Desktop Agent Relay**: Communicate with desktop agents for remote code execution
- **Subscription Management**: Stripe integration for subscription billing
- **Multi-tenant**: Support for multiple users with tier-based limits

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.IO
- **Storage**: S3/Cloudflare R2
- **Payments**: Stripe
- **Authentication**: JWT + optional Clerk

## Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- (Optional) Stripe account for payments
- (Optional) S3/R2 bucket for file storage
- (Optional) Clerk account for authentication

## Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database**:
   ```bash
   # Run Prisma migrations
   npm run prisma:migrate

   # Generate Prisma client
   npm run prisma:generate
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000` by default.

## Environment Variables

See `.env.example` for all available configuration options.

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens (min 32 characters)

Optional but recommended:
- `STRIPE_SECRET_KEY`: For payment processing
- `S3_*`: For file storage
- `CLERK_*`: For Clerk authentication

## API Documentation

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

#### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/statistics` - Get user statistics
- `DELETE /api/users/account` - Delete account

#### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/archive` - Archive project
- `POST /api/projects/:id/unarchive` - Unarchive project

#### Sessions
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/:id` - Get session
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session
- `POST /api/sessions/:id/complete` - Complete session

#### Recordings
- `GET /api/recordings` - List recordings
- `POST /api/recordings` - Create recording
- `GET /api/recordings/:id` - Get recording
- `PUT /api/recordings/:id` - Update recording
- `DELETE /api/recordings/:id` - Delete recording
- `POST /api/recordings/:id/upload-url` - Get upload URL
- `GET /api/recordings/:id/download-url` - Get download URL

#### Payments
- `GET /api/payments/subscription` - Get subscription
- `POST /api/payments/checkout` - Create checkout session
- `POST /api/payments/portal` - Create portal session
- `POST /api/payments/cancel` - Cancel subscription
- `GET /api/payments/prices` - Get pricing plans

#### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler
- `POST /api/webhooks/clerk` - Clerk webhook handler

#### Desktop Agent Relay
- `GET /api/relay/agents` - List agents
- `POST /api/relay/agents/:id/message` - Send message
- `POST /api/relay/agents/:id/execute` - Execute command
- `POST /api/relay/agents/:id/file/request` - Request file
- `POST /api/relay/agents/:id/file/send` - Send file
- `POST /api/relay/agents/:id/recording/start` - Start recording
- `POST /api/relay/agents/:id/recording/stop` - Stop recording
- `POST /api/relay/agents/:id/ping` - Ping agent

### Authentication

Most endpoints require authentication via JWT token:

```bash
Authorization: Bearer <token>
```

Get a token by registering or logging in.

## WebSocket Events

Connect to Socket.IO at the same URL as the HTTP server:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Authenticate
socket.emit('authenticate', { token: 'your-jwt-token' });

// Listen for authentication response
socket.on('authenticated', (data) => {
  console.log('Authenticated!', data);
});

// Join rooms
socket.emit('join:project', { projectId: '...' });
socket.emit('join:session', { sessionId: '...' });

// Listen for notifications
socket.on('notification', (notification) => {
  console.log('Notification:', notification);
});

// Agent events
socket.emit('agent:register', { name: 'My Agent', version: '1.0.0' });
socket.on('agent:registered', (data) => {
  console.log('Agent registered:', data);
});
```

## Subscription Tiers & Limits

### FREE Tier
- 3 projects
- 10 sessions
- 5 recordings
- 500 MB storage
- 1 desktop agent

### PRO Tier
- 50 projects
- 1,000 sessions
- 500 recordings
- 50 GB storage
- 5 desktop agents

### ENTERPRISE Tier
- Unlimited projects
- Unlimited sessions
- Unlimited recordings
- Unlimited storage
- Unlimited desktop agents

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Lint code
- `npm run test` - Run tests
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

### Database Management

```bash
# Create a new migration
npx prisma migrate dev --name description

# Apply migrations
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

## Deployment

### Production Checklist

1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET` (min 32 characters)
3. Configure PostgreSQL database
4. Set up Stripe webhook endpoints
5. Configure S3/R2 storage
6. Set up CORS origins
7. Enable HTTPS
8. Configure rate limiting
9. Set up error monitoring (e.g., Sentry)
10. Configure logging

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-secret-key>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
S3_ENDPOINT=https://...
S3_BUCKET_NAME=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
CORS_ORIGIN=https://yourdomain.com
```

## Error Handling

All API responses follow this format:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error:**
```json
{
  "success": false,
  "error": "error_type",
  "message": "Detailed error message"
}
```

## Rate Limiting

- General API: 100 requests per 15 minutes
- Authentication: 5 attempts per 15 minutes
- File uploads: 50 uploads per hour
- Webhooks: 100 requests per minute

## Security

- All passwords are hashed with bcrypt
- JWT tokens expire after 7 days (configurable)
- Helmet.js for security headers
- CORS configured for specific origins
- Rate limiting on all endpoints
- Input validation with Zod
- Stripe webhook signature verification

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
