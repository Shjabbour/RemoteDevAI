# Quick Start Guide

Get the RemoteDevAI Cloud Backend up and running in 5 minutes.

## 1. Prerequisites

Ensure you have:
- Node.js 18+ installed
- PostgreSQL database running
- Git installed

## 2. Quick Setup

```bash
# 1. Navigate to the cloud directory
cd apps/cloud

# 2. Install dependencies
npm install

# 3. Copy environment file
cp .env.example .env

# 4. Edit .env file with your settings
# At minimum, set:
#   - DATABASE_URL (PostgreSQL connection string)
#   - JWT_SECRET (32+ character random string)
```

## 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations to create database tables
npm run prisma:migrate

# (Optional) Open Prisma Studio to view your database
npm run prisma:studio
```

## 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## 5. Test the API

### Health Check
```bash
curl http://localhost:3000/health
```

### Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

You'll receive a JWT token in the response. Use this token for authenticated requests:

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 6. Next Steps

- Read the [README.md](./README.md) for complete documentation
- Explore the API endpoints
- Set up optional services (Stripe, S3, Clerk)
- Configure CORS for your frontend
- Set up WebSocket connection from your client

## Common Commands

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm start                # Start production server

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open database GUI

# Code Quality
npm run lint             # Lint code
npm test                 # Run tests
```

## Environment Variables Checklist

### Required
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `JWT_SECRET` - Secret key for JWT (32+ chars)

### Optional (but recommended)
- [ ] `STRIPE_SECRET_KEY` - For payments
- [ ] `STRIPE_WEBHOOK_SECRET` - For Stripe webhooks
- [ ] `S3_ENDPOINT` - For file storage
- [ ] `S3_BUCKET_NAME` - S3/R2 bucket name
- [ ] `S3_ACCESS_KEY_ID` - S3 credentials
- [ ] `S3_SECRET_ACCESS_KEY` - S3 credentials
- [ ] `CORS_ORIGIN` - Allowed origins

### Development Only
- [ ] `NODE_ENV=development`
- [ ] `LOG_LEVEL=debug`

## Troubleshooting

### Database Connection Error
```
Error: Can't reach database server
```
- Ensure PostgreSQL is running
- Check DATABASE_URL is correct
- Test connection: `psql <DATABASE_URL>`

### Port Already in Use
```
Error: EADDRINUSE: address already in use :::3000
```
- Change PORT in .env file
- Or kill process using port 3000

### Prisma Client Error
```
Error: @prisma/client did not initialize yet
```
- Run: `npm run prisma:generate`

### JWT Secret Error
```
Error: JWT_SECRET must be at least 32 characters
```
- Update JWT_SECRET in .env with a longer string
- Generate one: `openssl rand -base64 32`

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Configure PostgreSQL for production
4. Set up Stripe webhooks
5. Configure S3/R2 storage
6. Enable HTTPS
7. Set up monitoring (e.g., Sentry)
8. Configure CORS for your production domain

See [README.md](./README.md) for full production checklist.

## Need Help?

- Check [README.md](./README.md) for detailed documentation
- Review API endpoint examples
- Check Prisma schema in `prisma/schema.prisma`
- Open an issue on GitHub
