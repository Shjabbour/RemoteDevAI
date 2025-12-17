# RemoteDevAI Deployment Guide

Complete guide for deploying RemoteDevAI to production.

## Table of Contents

- [Overview](#overview)
- [Cloud Backend Deployment](#cloud-backend-deployment)
- [Desktop App Distribution](#desktop-app-distribution)
- [Mobile App Publishing](#mobile-app-publishing)
- [Environment Variables](#environment-variables)
- [SSL and Security](#ssl-and-security)
- [Monitoring](#monitoring)
- [Scaling](#scaling)

## Overview

RemoteDevAI consists of multiple components that need to be deployed:

1. **Cloud Backend** - Node.js API server
2. **Web Dashboard** - React SPA
3. **Desktop Agent** - Electron app (distributed)
4. **Mobile Apps** - iOS and Android (published to stores)

## Cloud Backend Deployment

### Prerequisites

- **PostgreSQL** database (managed or self-hosted)
- **Redis** instance (managed or self-hosted)
- **S3-compatible storage** (AWS S3, MinIO, etc.)
- **Domain name** with DNS access
- **SSL certificate**

### Deployment Platforms

#### Option 1: Vercel (Recommended for API + Web)

1. **Install Vercel CLI**

```bash
npm install -g vercel
```

2. **Configure Project**

Create `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    },
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/src/server.js" },
    { "src": "/(.*)", "dest": "/client/$1" }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

3. **Deploy**

```bash
# Login
vercel login

# Deploy
vercel --prod

# Set environment variables
vercel env add DATABASE_URL
vercel env add REDIS_URL
vercel env add ANTHROPIC_API_KEY
```

---

#### Option 2: Railway

1. **Create Project**

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Link to project
railway link
```

2. **Configure**

Create `railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

3. **Add Services**

```bash
# Add PostgreSQL
railway add -d postgres

# Add Redis
railway add -d redis

# Deploy
railway up
```

4. **Set Environment Variables**

```bash
railway variables set ANTHROPIC_API_KEY=<key>
railway variables set NODE_ENV=production
```

---

#### Option 3: AWS (ECS + Fargate)

1. **Build Docker Image**

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build client
RUN cd client && npm ci && npm run build

# Expose port
EXPOSE 3001

# Start server
CMD ["node", "src/server.js"]
```

2. **Build and Push to ECR**

```bash
# Build image
docker build -t remotedevai .

# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Tag image
docker tag remotedevai:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/remotedevai:latest

# Push
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/remotedevai:latest
```

3. **Create ECS Task Definition**

```json
{
  "family": "remotedevai",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "remotedevai",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/remotedevai:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:..."
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/remotedevai",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

4. **Create Service**

```bash
aws ecs create-service \
  --cluster remotedevai-cluster \
  --service-name remotedevai-service \
  --task-definition remotedevai \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

5. **Set Up Load Balancer**

Create Application Load Balancer and target group pointing to ECS service.

---

#### Option 4: DigitalOcean App Platform

1. **Create App**

```bash
# Install doctl
brew install doctl  # macOS
# or download from https://docs.digitalocean.com/reference/doctl/

# Login
doctl auth init

# Create app from spec
doctl apps create --spec app.yaml
```

2. **App Spec** (`app.yaml`)

```yaml
name: remotedevai
services:
  - name: api
    github:
      repo: Shjabbour/RemoteDevAI
      branch: main
      deploy_on_push: true
    build_command: npm install && npm run build
    run_command: npm start
    environment_slug: node-js
    instance_count: 2
    instance_size_slug: professional-xs
    http_port: 3001
    routes:
      - path: /api
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        value: ${db.DATABASE_URL}
      - key: REDIS_URL
        value: ${redis.REDIS_URL}
      - key: ANTHROPIC_API_KEY
        type: SECRET
        value: <your-key>

databases:
  - name: db
    engine: PG
    production: true
    version: "14"

  - name: redis
    engine: REDIS
    production: true
    version: "7"

static_sites:
  - name: dashboard
    github:
      repo: Shjabbour/RemoteDevAI
      branch: main
    build_command: cd client && npm install && npm run build
    output_dir: client/dist
    routes:
      - path: /
```

3. **Deploy**

```bash
doctl apps create --spec app.yaml
```

---

### Database Setup (Production)

#### PostgreSQL

**Managed Options**:
- AWS RDS
- DigitalOcean Managed Databases
- Supabase
- Neon
- Railway

**Configuration**:

```bash
# Connection string format
postgresql://username:password@host:5432/database?sslmode=require

# Enable SSL
# Set in .env
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false  # For self-signed certs
```

**Migrations**:

```bash
# Run migrations on deploy
npm run migrate

# Or use a migration service
# Add to package.json scripts:
"postdeploy": "npm run migrate"
```

**Connection Pooling**:

Use PgBouncer or configure in code:

```javascript
// src/database/db.js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

#### Redis

**Managed Options**:
- AWS ElastiCache
- Redis Labs
- Upstash
- Railway

**Configuration**:

```bash
# Connection string
redis://username:password@host:6379

# For Redis 6+ with ACL
rediss://username:password@host:6379  # Note the 'rediss' for SSL
```

---

### Storage Setup

#### AWS S3

```bash
# Environment variables
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=remotedevai-files
S3_PREFIX=production/
```

**Bucket Policy**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_ID:user/remotedevai"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::remotedevai-files/*"
    }
  ]
}
```

#### MinIO (Self-hosted)

```bash
# Deploy MinIO
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name minio \
  -v /data/minio:/data \
  -e "MINIO_ROOT_USER=admin" \
  -e "MINIO_ROOT_PASSWORD=secret123" \
  minio/minio server /data --console-address ":9001"

# Environment variables
S3_ENDPOINT=http://localhost:9000
AWS_ACCESS_KEY_ID=admin
AWS_SECRET_ACCESS_KEY=secret123
S3_BUCKET=remotedevai
S3_FORCE_PATH_STYLE=true
```

---

## Desktop App Distribution

### Building Desktop App

```bash
cd desktop-agent

# Install dependencies
npm install

# Build for all platforms
npm run build:all

# Or build for specific platform
npm run build:win     # Windows
npm run build:mac     # macOS
npm run build:linux   # Linux
```

### Code Signing

#### macOS

```bash
# Get Developer ID certificate from Apple

# Sign app
npm run build:mac -- --sign "Developer ID Application: Your Name"

# Notarize
npx electron-notarize --bundle-id com.remotedevai.desktop --apple-id your@email.com
```

#### Windows

```bash
# Get code signing certificate

# Sign with signtool
signtool sign /f certificate.pfx /p password /tr http://timestamp.digicert.com RemoteDevAI-Setup.exe
```

### Distribution Channels

#### 1. Direct Download

Host installers on your website:

```
https://remotedevai.com/download/
  ├── RemoteDevAI-Setup-1.2.0.exe (Windows)
  ├── RemoteDevAI-1.2.0.dmg (macOS)
  └── remotedevai_1.2.0_amd64.deb (Linux)
```

#### 2. Auto-Update Server

Use `electron-updater`:

```javascript
// main.js
const { autoUpdater } = require('electron-updater');

autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://remotedevai.com/updates'
});

autoUpdater.checkForUpdatesAndNotify();
```

Host update files:

```
https://remotedevai.com/updates/
  ├── latest.yml (version info)
  ├── RemoteDevAI-Setup-1.2.0.exe
  └── RemoteDevAI-Setup-1.2.0.exe.blockmap
```

#### 3. Package Managers

**Homebrew** (macOS):

```ruby
# Create formula
class Remotedevai < Formula
  desc "RemoteDevAI Desktop Agent"
  homepage "https://remotedevai.com"
  url "https://remotedevai.com/download/remotedevai-1.2.0.tar.gz"
  sha256 "..."

  def install
    bin.install "remotedevai"
  end
end
```

**Chocolatey** (Windows):

```powershell
# Create package
choco pack

# Publish
choco push remotedevai.1.2.0.nupkg --source https://push.chocolatey.org/
```

**Snap** (Linux):

```yaml
# snapcraft.yaml
name: remotedevai
version: '1.2.0'
summary: RemoteDevAI Desktop Agent
description: AI-powered development platform

apps:
  remotedevai:
    command: bin/remotedevai

parts:
  remotedevai:
    plugin: nodejs
    source: .
```

```bash
# Build and publish
snapcraft
snapcraft upload remotedevai_1.2.0_amd64.snap
```

---

## Mobile App Publishing

### iOS App Store

1. **Prepare App**

```bash
cd mobile-app

# Install dependencies
npm install

# iOS specific
cd ios
pod install
cd ..
```

2. **Build for Production**

```bash
# Open Xcode
open ios/RemoteDevAI.xcworkspace

# Or build from command line
xcodebuild -workspace ios/RemoteDevAI.xcworkspace \
  -scheme RemoteDevAI \
  -configuration Release \
  -archivePath build/RemoteDevAI.xcarchive \
  archive
```

3. **Upload to App Store Connect**

```bash
# Export IPA
xcodebuild -exportArchive \
  -archivePath build/RemoteDevAI.xcarchive \
  -exportPath build \
  -exportOptionsPlist ExportOptions.plist

# Upload
xcrun altool --upload-app \
  --type ios \
  --file build/RemoteDevAI.ipa \
  --username your@email.com \
  --password @keychain:AC_PASSWORD
```

4. **App Store Connect**
   - Go to https://appstoreconnect.apple.com
   - Create new version
   - Fill in metadata
   - Upload screenshots
   - Submit for review

### Android Play Store

1. **Build APK/AAB**

```bash
cd mobile-app/android

# Build release APK
./gradlew assembleRelease

# Or build App Bundle (recommended)
./gradlew bundleRelease
```

2. **Sign APK**

```bash
# Create keystore (first time only)
keytool -genkeypair -v -keystore remotedevai.keystore \
  -alias remotedevai -keyalg RSA -keysize 2048 -validity 10000

# Sign
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore remotedevai.keystore \
  app/build/outputs/apk/release/app-release-unsigned.apk \
  remotedevai

# Optimize
zipalign -v 4 app-release-unsigned.apk RemoteDevAI.apk
```

3. **Upload to Play Console**
   - Go to https://play.google.com/console
   - Create new release
   - Upload AAB/APK
   - Fill in store listing
   - Submit for review

---

## Environment Variables

### Production Environment Variables

```bash
# Server
NODE_ENV=production
PORT=3001
API_URL=https://api.remotedevai.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/remotedevai?sslmode=require
DB_POOL_MIN=5
DB_POOL_MAX=20
DATABASE_SSL=true

# Redis
REDIS_URL=rediss://user:pass@host:6379
REDIS_TLS=true

# Authentication
JWT_SECRET=<strong-secret-min-32-chars>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=<strong-secret-min-32-chars>
REFRESH_TOKEN_EXPIRES_IN=7d

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=4096

# Storage
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=remotedevai-production
S3_PREFIX=files/

# CORS
ALLOWED_ORIGINS=https://app.remotedevai.com,https://remotedevai.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
PROMETHEUS_PORT=9090

# Email (for notifications)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG...
EMAIL_FROM=noreply@remotedevai.com
```

### Secrets Management

**AWS Secrets Manager**:

```bash
# Store secret
aws secretsmanager create-secret \
  --name remotedevai/production/database-url \
  --secret-string "postgresql://..."

# Retrieve in app
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

const secret = await secretsManager.getSecretValue({
  SecretId: 'remotedevai/production/database-url'
}).promise();

process.env.DATABASE_URL = secret.SecretString;
```

**HashiCorp Vault**:

```bash
# Write secret
vault kv put secret/remotedevai/production \
  database_url="postgresql://..." \
  jwt_secret="..."

# Read in app
const vault = require('node-vault')();
const secrets = await vault.read('secret/data/remotedevai/production');
```

---

## SSL and Security

### SSL Certificate

#### Let's Encrypt (Free)

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d api.remotedevai.com

# Auto-renewal
sudo certbot renew --dry-run
```

#### Cloudflare (Proxy + SSL)

1. Add domain to Cloudflare
2. Point DNS to your server
3. Enable "Flexible" or "Full" SSL
4. Use Cloudflare Origin Certificate on server

### Security Headers

Add to Express app:

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Firewall Rules

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if needed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

---

## Monitoring

### Application Monitoring

#### Sentry (Error Tracking)

```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

#### Prometheus + Grafana (Metrics)

```javascript
const prometheus = require('prom-client');

// Collect default metrics
prometheus.collectDefaultMetrics();

// Custom metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status']
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

### Infrastructure Monitoring

#### AWS CloudWatch

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard

# Start
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

#### Datadog

```bash
# Install agent
DD_API_KEY=<key> DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Configure app
DD_ENV=production DD_SERVICE=remotedevai npm start
```

---

## Scaling

### Horizontal Scaling

#### Load Balancer Configuration

**AWS ALB**:

```bash
# Create target group
aws elbv2 create-target-group \
  --name remotedevai-targets \
  --protocol HTTP \
  --port 3001 \
  --vpc-id vpc-xxx \
  --health-check-path /health

# Create load balancer
aws elbv2 create-load-balancer \
  --name remotedevai-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx
```

#### Auto-Scaling

**ECS Auto-Scaling**:

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/remotedevai-cluster/remotedevai-service \
  --min-capacity 2 \
  --max-capacity 10

aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/remotedevai-cluster/remotedevai-service \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    }
  }'
```

### Database Scaling

#### Read Replicas

```bash
# Create read replica (AWS RDS)
aws rds create-db-instance-read-replica \
  --db-instance-identifier remotedevai-read-replica \
  --source-db-instance-identifier remotedevai-primary
```

**Use in App**:

```javascript
const writePool = new Pool({ connectionString: process.env.DATABASE_URL });
const readPool = new Pool({ connectionString: process.env.DATABASE_READ_URL });

// Write operations
await writePool.query('INSERT INTO users...');

// Read operations
await readPool.query('SELECT * FROM users...');
```

#### Connection Pooling

Use PgBouncer:

```bash
# Install
sudo apt-get install pgbouncer

# Configure /etc/pgbouncer/pgbouncer.ini
[databases]
remotedevai = host=db.example.com port=5432 dbname=remotedevai

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25

# Start
sudo systemctl start pgbouncer
```

### Caching Strategy

```javascript
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Cache frequently accessed data
async function getUser(userId) {
  const cacheKey = `user:${userId}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Fetch from database
  const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

  // Store in cache (TTL: 1 hour)
  await redis.setex(cacheKey, 3600, JSON.stringify(user));

  return user;
}
```

---

## CI/CD Pipeline

### GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

      - name: Run Database Migrations
        run: |
          npm install
          npm run migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Notify Deployment
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment completed'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

**Next**: Review [CONTRIBUTING.md](CONTRIBUTING.md) to contribute to RemoteDevAI.
