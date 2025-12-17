# RemoteDevAI Security

Security considerations, best practices, and implementation details for RemoteDevAI.

## Table of Contents

- [Security Model](#security-model)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Data Encryption](#data-encryption)
- [Code Execution Sandboxing](#code-execution-sandboxing)
- [API Security](#api-security)
- [Secrets Management](#secrets-management)
- [Vulnerability Reporting](#vulnerability-reporting)
- [Security Best Practices](#security-best-practices)
- [Compliance](#compliance)

## Security Model

RemoteDevAI implements defense-in-depth security with multiple layers:

```
┌────────────────────────────────────────────┐
│         Transport Security (TLS)           │
│  - HTTPS/WSS encryption                    │
│  - Certificate pinning (mobile)            │
└────────────────┬───────────────────────────┘
                 │
┌────────────────▼───────────────────────────┐
│         Authentication Layer               │
│  - JWT tokens with short expiry            │
│  - Refresh token rotation                  │
│  - OAuth 2.0 providers                     │
│  - API key authentication                  │
└────────────────┬───────────────────────────┘
                 │
┌────────────────▼───────────────────────────┐
│         Authorization Layer                │
│  - Role-based access control (RBAC)        │
│  - Resource ownership validation           │
│  - Project-level permissions               │
└────────────────┬───────────────────────────┘
                 │
┌────────────────▼───────────────────────────┐
│         Input Validation                   │
│  - Schema validation (express-validator)   │
│  - SQL injection prevention                │
│  - XSS prevention                          │
└────────────────┬───────────────────────────┘
                 │
┌────────────────▼───────────────────────────┐
│         Execution Sandbox                  │
│  - Isolated containers (Docker)            │
│  - Resource limits (CPU, memory, time)     │
│  - Network isolation                       │
└────────────────┬───────────────────────────┘
                 │
┌────────────────▼───────────────────────────┐
│         Data Encryption                    │
│  - At rest (AES-256)                       │
│  - In transit (TLS 1.3)                    │
│  - Field-level for sensitive data          │
└────────────────┬───────────────────────────┘
                 │
┌────────────────▼───────────────────────────┐
│         Audit Logging                      │
│  - All actions logged                      │
│  - Tamper-proof logs                       │
│  - Compliance tracking                     │
└────────────────────────────────────────────┘
```

## Authentication

### JWT-Based Authentication

RemoteDevAI uses JSON Web Tokens (JWT) for stateless authentication.

**Token Types:**

1. **Access Token**
   - Short-lived (15 minutes)
   - Used for API requests
   - Stored in memory (not localStorage)

2. **Refresh Token**
   - Longer-lived (7 days)
   - Used to obtain new access tokens
   - Stored securely (httpOnly cookie)
   - Rotated on use

### Authentication Flow

```
┌──────────┐                                    ┌──────────┐
│  Client  │                                    │  Server  │
└────┬─────┘                                    └────┬─────┘
     │                                               │
     │  POST /auth/login                             │
     │  { email, password }                          │
     ├──────────────────────────────────────────────>│
     │                                               │
     │                                               ├─ Verify credentials
     │                                               ├─ Hash password (bcrypt)
     │                                               ├─ Generate tokens
     │                                               │
     │  { accessToken, refreshToken }                │
     │<──────────────────────────────────────────────┤
     │                                               │
     │  Store accessToken in memory                  │
     │  Store refreshToken in httpOnly cookie        │
     │                                               │
     │  Subsequent requests                          │
     │  Authorization: Bearer <accessToken>          │
     ├──────────────────────────────────────────────>│
     │                                               │
     │                                               ├─ Verify JWT signature
     │                                               ├─ Check expiration
     │                                               ├─ Extract user context
     │                                               │
     │  { success: true, data: ... }                 │
     │<──────────────────────────────────────────────┤
     │                                               │
     │  When accessToken expires:                    │
     │  POST /auth/refresh                           │
     │  { refreshToken }                             │
     ├──────────────────────────────────────────────>│
     │                                               │
     │                                               ├─ Verify refresh token
     │                                               ├─ Generate new tokens
     │                                               ├─ Rotate refresh token
     │                                               │
     │  { accessToken, refreshToken }                │
     │<──────────────────────────────────────────────┤
     │                                               │
```

### Implementation

**Token Generation:**

```javascript
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function generateTokens(user) {
  // Access token - short lived
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '15m',
      algorithm: 'HS256'
    }
  );

  // Refresh token - longer lived
  const refreshToken = jwt.sign(
    {
      userId: user.id,
      tokenId: crypto.randomBytes(16).toString('hex')
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: '7d',
      algorithm: 'HS256'
    }
  );

  return { accessToken, refreshToken };
}
```

**Token Verification Middleware:**

```javascript
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'No token provided'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Token has expired'
      });
    }

    return res.status(403).json({
      success: false,
      error: 'INVALID_TOKEN',
      message: 'Invalid token'
    });
  }
}
```

### Password Security

**Hashing with bcrypt:**

```javascript
const bcrypt = require('bcrypt');

// Hash password (on registration)
async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password (on login)
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

```javascript
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    throw new Error('Password must be at least 8 characters');
  }

  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    throw new Error('Password must contain uppercase, lowercase, number, and special character');
  }

  return true;
}
```

### OAuth 2.0 Support

Support for third-party authentication:

```javascript
// GitHub OAuth
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: "https://api.remotedevai.com/auth/github/callback"
},
async (accessToken, refreshToken, profile, done) => {
  // Find or create user
  let user = await User.findOne({ githubId: profile.id });

  if (!user) {
    user = await User.create({
      githubId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      avatar: profile.photos[0].value
    });
  }

  return done(null, user);
}));
```

## Authorization

### Role-Based Access Control (RBAC)

**Roles:**
- `user` - Standard user
- `pro` - Pro plan user (more features)
- `admin` - Administrator

**Permissions:**

```javascript
const permissions = {
  user: [
    'project:create',
    'project:read:own',
    'project:update:own',
    'project:delete:own',
    'agent:execute',
  ],
  pro: [
    ...permissions.user,
    'agent:execute:advanced',
    'project:share',
    'team:create',
  ],
  admin: [
    ...permissions.pro,
    'user:manage',
    'project:read:all',
    'system:configure',
  ]
};
```

**Authorization Middleware:**

```javascript
function authorize(...requiredPermissions) {
  return (req, res, next) => {
    const userPermissions = permissions[req.user.role] || [];

    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
}

// Usage
router.delete('/projects/:id',
  authenticateToken,
  authorize('project:delete:own'),
  deleteProject
);
```

### Resource Ownership

Verify user owns resource before allowing access:

```javascript
async function verifyProjectOwnership(req, res, next) {
  const { projectId } = req.params;
  const userId = req.user.userId;

  const project = await Project.findById(projectId);

  if (!project) {
    return res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Project not found'
    });
  }

  if (project.ownerId !== userId) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: 'You do not own this project'
    });
  }

  req.project = project;
  next();
}
```

## Data Encryption

### Encryption at Rest

**Database Field Encryption:**

```javascript
const crypto = require('crypto');

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decrypt(encrypted, iv, authTag) {
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Usage
const sensitiveData = 'API_KEY_12345';
const { encrypted, iv, authTag } = encrypt(sensitiveData);

// Store encrypted, iv, and authTag in database
await db.query(
  'INSERT INTO secrets (encrypted, iv, auth_tag) VALUES ($1, $2, $3)',
  [encrypted, iv, authTag]
);

// Retrieve and decrypt
const { encrypted, iv, authTag } = await db.query('SELECT * FROM secrets...');
const decrypted = decrypt(encrypted, iv, authTag);
```

### Encryption in Transit

**TLS Configuration:**

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem'),
  minVersion: 'TLSv1.3',
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ].join(':'),
  honorCipherOrder: true
};

https.createServer(options, app).listen(443);
```

**Force HTTPS:**

```javascript
function forceHTTPS(req, res, next) {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    return next();
  }

  res.redirect(301, `https://${req.headers.host}${req.url}`);
}

app.use(forceHTTPS);
```

## Code Execution Sandboxing

### Docker-Based Sandboxing

Execute user code in isolated Docker containers:

```javascript
const Docker = require('dockerode');
const docker = new Docker();

async function executeCodeSandboxed(code, language) {
  // Create container with security constraints
  const container = await docker.createContainer({
    Image: `remotedevai/sandbox-${language}:latest`,
    Cmd: ['node', '-e', code],
    HostConfig: {
      Memory: 512 * 1024 * 1024,      // 512MB RAM limit
      MemorySwap: 512 * 1024 * 1024,  // No swap
      CpuQuota: 50000,                // 50% of one CPU core
      CpuPeriod: 100000,
      PidsLimit: 50,                  // Max 50 processes
      NetworkMode: 'none',            // No network access
      ReadonlyRootfs: true,           // Read-only filesystem
      CapDrop: ['ALL'],               // Drop all Linux capabilities
      SecurityOpt: ['no-new-privileges']
    },
    Volumes: {
      '/workspace': {}
    }
  });

  // Start container
  await container.start();

  // Set execution timeout
  const timeout = setTimeout(async () => {
    await container.kill();
  }, 30000); // 30 second timeout

  try {
    // Wait for container to finish
    const data = await container.wait();

    clearTimeout(timeout);

    // Get output
    const logs = await container.logs({
      stdout: true,
      stderr: true
    });

    // Clean up
    await container.remove();

    return {
      exitCode: data.StatusCode,
      output: logs.toString()
    };

  } catch (error) {
    clearTimeout(timeout);
    await container.remove();
    throw error;
  }
}
```

### VM2 Sandboxing (Node.js)

For lightweight sandboxing:

```javascript
const { VM } = require('vm2');

function executeInSandbox(code, timeout = 5000) {
  const vm = new VM({
    timeout,
    sandbox: {
      console: {
        log: (...args) => console.log('[Sandbox]', ...args)
      }
    },
    eval: false,
    wasm: false,
    fixAsync: true
  });

  try {
    const result = vm.run(code);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## API Security

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

// General API rate limit
const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:api:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: 'RATE_LIMITED',
    message: 'Too many requests, please try again later'
  }
});

// Stricter limit for authentication endpoints
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);
```

### Input Validation

```javascript
const { body, param, validationResult } = require('express-validator');

// Validation rules
const createUserValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),

  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be 1-100 characters')
];

// Validation middleware
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }

  next();
}

// Usage
router.post('/users',
  createUserValidation,
  validate,
  createUser
);
```

### SQL Injection Prevention

Always use parameterized queries:

```javascript
// GOOD - Parameterized query
async function getUserByEmail(email) {
  const result = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0];
}

// BAD - String concatenation (vulnerable to SQL injection)
async function getUserByEmailBad(email) {
  const result = await db.query(
    `SELECT * FROM users WHERE email = '${email}'`
  );
  return result.rows[0];
}
```

### XSS Prevention

```javascript
const xss = require('xss');
const helmet = require('helmet');

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Sanitize user input
function sanitizeInput(input) {
  return xss(input, {
    whiteList: {},        // No HTML tags allowed
    stripIgnoreTag: true, // Remove unknown tags
    stripIgnoreTagBody: ['script'] // Remove script content
  });
}

// Usage
router.post('/projects', async (req, res) => {
  const name = sanitizeInput(req.body.name);
  const description = sanitizeInput(req.body.description);

  // Create project...
});
```

## Secrets Management

### Environment Variables

Never commit secrets to version control:

```bash
# .gitignore
.env
.env.*
!.env.example
```

**Use .env.example as template:**

```bash
# .env.example
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
ANTHROPIC_API_KEY=your_api_key_here
JWT_SECRET=your_jwt_secret_here
```

### Secret Rotation

**JWT Secret Rotation:**

```javascript
// Support multiple secrets for graceful rotation
const JWT_SECRETS = [
  process.env.JWT_SECRET,        // Current
  process.env.JWT_SECRET_PREV    // Previous (for grace period)
].filter(Boolean);

function verifyToken(token) {
  for (const secret of JWT_SECRETS) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      continue;
    }
  }
  throw new Error('Invalid token');
}
```

### API Key Management

**Secure API key storage:**

```javascript
const crypto = require('crypto');

function generateAPIKey() {
  return 'rda_' + crypto.randomBytes(32).toString('hex');
}

async function hashAPIKey(apiKey) {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
}

// Store only hashed version
async function createAPIKey(userId, name) {
  const apiKey = generateAPIKey();
  const hashedKey = await hashAPIKey(apiKey);

  await db.query(
    'INSERT INTO api_keys (user_id, name, key_hash) VALUES ($1, $2, $3)',
    [userId, name, hashedKey]
  );

  // Return raw key only once
  return apiKey;
}

// Verify API key
async function verifyAPIKey(apiKey) {
  const hashedKey = await hashAPIKey(apiKey);

  const result = await db.query(
    'SELECT * FROM api_keys WHERE key_hash = $1',
    [hashedKey]
  );

  return result.rows[0];
}
```

## Vulnerability Reporting

### Responsible Disclosure

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email security@remotedevai.com with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Your contact information

3. We will respond within 48 hours
4. We will work with you to verify and fix the issue
5. Once fixed, we will publicly acknowledge your contribution

### Bug Bounty Program

We offer rewards for valid security vulnerabilities:

- **Critical**: $500 - $2,000
- **High**: $200 - $500
- **Medium**: $50 - $200
- **Low**: Recognition in security.txt

## Security Best Practices

### For Developers

1. **Never commit secrets** to version control
2. **Always use parameterized queries** to prevent SQL injection
3. **Validate and sanitize all input** from users
4. **Use HTTPS** for all API requests
5. **Implement proper error handling** (don't leak stack traces)
6. **Keep dependencies updated** regularly
7. **Use linters and security scanners** in CI/CD
8. **Follow principle of least privilege** for permissions

### For Users

1. **Use strong, unique passwords** for your account
2. **Enable two-factor authentication** when available
3. **Keep your API keys secure** - never share them
4. **Review account activity** regularly
5. **Report suspicious activity** immediately
6. **Keep desktop agent updated** to latest version
7. **Don't run untrusted code** in your projects

### Security Checklist

- [ ] All secrets in environment variables
- [ ] HTTPS enforced in production
- [ ] Rate limiting on all endpoints
- [ ] Input validation on all user input
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitization + CSP headers)
- [ ] CSRF protection (where applicable)
- [ ] Secure password hashing (bcrypt with salt)
- [ ] JWT with short expiry and refresh tokens
- [ ] Authorization checks on all protected resources
- [ ] Audit logging for sensitive operations
- [ ] Dependencies scanned for vulnerabilities
- [ ] Code execution in isolated sandboxes
- [ ] Regular security audits
- [ ] Incident response plan in place

## Compliance

### GDPR Compliance

RemoteDevAI is GDPR compliant:

- **Right to Access**: Users can export all their data
- **Right to Erasure**: Users can delete their account and data
- **Right to Portability**: Data export in standard formats
- **Privacy by Design**: Minimal data collection
- **Consent**: Clear consent for data processing

### SOC 2 Type II

We are working towards SOC 2 Type II certification:

- Access controls
- Change management
- Risk assessment
- Incident response
- Continuous monitoring

---

## Security Updates

Stay informed about security updates:

- **Security Advisories**: https://github.com/Shjabbour/RemoteDevAI/security/advisories
- **Changelog**: https://github.com/Shjabbour/RemoteDevAI/blob/main/CHANGELOG.md
- **Twitter**: @RemoteDevAI
- **Email**: Subscribe to security-announce@remotedevai.com

---

**Last Updated**: 2025-01-15

For security inquiries: security@remotedevai.com
