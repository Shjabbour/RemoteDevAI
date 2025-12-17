import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import crypto from 'crypto';
import { nanoid } from 'nanoid';

// ============== Configuration ==============

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_SECRET = process.env.API_SECRET || 'dev-secret-change-in-production';
const MAX_VIEWERS_PER_AGENT = parseInt(process.env.MAX_VIEWERS_PER_AGENT || '5', 10);
const PAIRING_CODE_EXPIRY_MS = parseInt(process.env.PAIRING_CODE_EXPIRY_MS || '3600000', 10); // 1 hour
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

// Allowed origins for CORS (production should be specific domains)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['*'];

const app = express();
const httpServer = createServer(app);

// Socket.IO with configurable CORS
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS[0] === '*' ? '*' : ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true
  },
  maxHttpBufferSize: 10e6, // 10MB for screen frames
  pingTimeout: 60000,
  pingInterval: 25000
});

// ============== Middleware ==============

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// CORS configuration
app.use(cors({
  origin: ALLOWED_ORIGINS[0] === '*' ? true : ALLOWED_ORIGINS,
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// ============== Rate Limiting ==============

const rateLimitStore = new Map();

function rateLimit(identifier, maxRequests = RATE_LIMIT_MAX_REQUESTS) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // Get or create rate limit entry
  let entry = rateLimitStore.get(identifier);
  if (!entry) {
    entry = { requests: [], blocked: false, blockedUntil: 0 };
    rateLimitStore.set(identifier, entry);
  }

  // Check if blocked
  if (entry.blocked && now < entry.blockedUntil) {
    return { allowed: false, remaining: 0, resetIn: entry.blockedUntil - now };
  }

  // Remove old requests outside window
  entry.requests = entry.requests.filter(time => time > windowStart);
  entry.blocked = false;

  // Check rate limit
  if (entry.requests.length >= maxRequests) {
    entry.blocked = true;
    entry.blockedUntil = now + RATE_LIMIT_WINDOW_MS;
    return { allowed: false, remaining: 0, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  // Add this request
  entry.requests.push(now);
  return { allowed: true, remaining: maxRequests - entry.requests.length, resetIn: 0 };
}

// Cleanup old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS * 2;

  rateLimitStore.forEach((entry, key) => {
    if (entry.requests.length === 0 || Math.max(...entry.requests) < cutoff) {
      rateLimitStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

// Rate limiting middleware for API routes
function rateLimitMiddleware(req, res, next) {
  const identifier = req.ip || req.connection.remoteAddress || 'unknown';
  const result = rateLimit(identifier);

  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', result.remaining);

  if (!result.allowed) {
    res.setHeader('Retry-After', Math.ceil(result.resetIn / 1000));
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil(result.resetIn / 1000)
    });
  }

  next();
}

app.use('/api', rateLimitMiddleware);

// ============== In-Memory State ==============

// Desktop agents: agentId -> { socket, info, connectedAt, viewers: Set, pairingCode, pairingCodeCreatedAt, authToken }
const agents = new Map();

// Mobile viewers: viewerId -> { socket, agentId, connectedAt, ip }
const viewers = new Map();

// Pairing codes: code -> { agentId, createdAt, attempts }
const pairingCodes = new Map();

// Failed pairing attempts by IP
const failedPairingAttempts = new Map();

// Usage statistics
const usageStats = {
  totalConnections: 0,
  totalFramesRelayed: 0,
  totalCommandsExecuted: 0,
  peakAgents: 0,
  peakViewers: 0
};

// ============== Security Functions ==============

// Generate stronger 8-character pairing code
function generatePairingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// Generate secure auth token for agents
function generateAuthToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Hash sensitive data
function hashData(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Validate pairing attempt (prevent brute force)
function validatePairingAttempt(ip) {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutes
  const maxAttempts = 10;

  let attempts = failedPairingAttempts.get(ip);
  if (!attempts) {
    attempts = { count: 0, firstAttempt: now, blockedUntil: 0 };
    failedPairingAttempts.set(ip, attempts);
  }

  // Check if blocked
  if (attempts.blockedUntil > now) {
    return { allowed: false, blockedFor: attempts.blockedUntil - now };
  }

  // Reset if outside window
  if (now - attempts.firstAttempt > windowMs) {
    attempts.count = 0;
    attempts.firstAttempt = now;
    attempts.blockedUntil = 0;
  }

  return { allowed: true, attemptsRemaining: maxAttempts - attempts.count };
}

function recordFailedPairing(ip) {
  let attempts = failedPairingAttempts.get(ip);
  if (!attempts) {
    attempts = { count: 0, firstAttempt: Date.now(), blockedUntil: 0 };
    failedPairingAttempts.set(ip, attempts);
  }

  attempts.count++;

  // Block for increasing time after multiple failures
  if (attempts.count >= 10) {
    attempts.blockedUntil = Date.now() + 15 * 60 * 1000; // 15 minutes
  } else if (attempts.count >= 5) {
    attempts.blockedUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
  }
}

// Validate input coordinates
function validateCoordinates(x, y) {
  return (
    typeof x === 'number' && typeof y === 'number' &&
    x >= 0 && x <= 1 && y >= 0 && y <= 1 &&
    !isNaN(x) && !isNaN(y)
  );
}

// Sanitize command (basic protection)
function sanitizeCommand(command) {
  if (typeof command !== 'string') return null;
  if (command.length > 10000) return null;
  // Allow command to pass through - Claude Code handles execution safety
  return command.trim();
}

// ============== REST API ==============

// Public health check
app.get('/', (req, res) => {
  res.json({
    service: 'RemoteDevAI Relay Server',
    version: '2.0.0',
    status: 'running',
    environment: NODE_ENV,
    stats: {
      agents: agents.size,
      viewers: viewers.size,
      activePairings: pairingCodes.size
    }
  });
});

// Detailed health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    agents: agents.size,
    viewers: viewers.size,
    stats: usageStats
  });
});

// Validate pairing code (for mobile to check before connecting)
app.get('/api/agent/:code', (req, res) => {
  const { code } = req.params;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Rate limit pairing attempts
  const validation = validatePairingAttempt(ip);
  if (!validation.allowed) {
    return res.status(429).json({
      success: false,
      error: 'Too many attempts. Please try again later.',
      blockedFor: Math.ceil(validation.blockedFor / 1000)
    });
  }

  const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const pairingData = pairingCodes.get(normalizedCode);

  if (!pairingData) {
    recordFailedPairing(ip);
    return res.status(404).json({ success: false, error: 'Invalid or expired pairing code' });
  }

  // Check if code expired
  if (Date.now() - pairingData.createdAt > PAIRING_CODE_EXPIRY_MS) {
    pairingCodes.delete(normalizedCode);
    recordFailedPairing(ip);
    return res.status(404).json({ success: false, error: 'Pairing code has expired' });
  }

  const agent = agents.get(pairingData.agentId);
  if (!agent) {
    pairingCodes.delete(normalizedCode);
    recordFailedPairing(ip);
    return res.status(404).json({ success: false, error: 'Agent not connected' });
  }

  // Check viewer limit
  if (agent.viewers.size >= MAX_VIEWERS_PER_AGENT) {
    return res.status(403).json({
      success: false,
      error: 'Maximum viewers reached for this agent',
      maxViewers: MAX_VIEWERS_PER_AGENT
    });
  }

  res.json({
    success: true,
    agent: {
      id: pairingData.agentId,
      name: agent.info.name,
      hostname: agent.info.hostname,
      platform: agent.info.platform,
      connectedAt: agent.connectedAt,
      viewerCount: agent.viewers.size,
      maxViewers: MAX_VIEWERS_PER_AGENT
    }
  });
});

// Admin endpoint - list agents (requires API secret)
app.get('/api/admin/agents', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const agentList = Array.from(agents.entries()).map(([id, agent]) => ({
    id,
    name: agent.info.name,
    hostname: agent.info.hostname,
    platform: agent.info.platform,
    connectedAt: agent.connectedAt,
    viewerCount: agent.viewers.size,
    pairingCode: agent.pairingCode,
    pairingCodeAge: Date.now() - (pairingCodes.get(agent.pairingCode)?.createdAt || 0)
  }));

  res.json({
    success: true,
    agents: agentList,
    stats: usageStats
  });
});

// Admin endpoint - disconnect agent
app.post('/api/admin/agents/:id/disconnect', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { id } = req.params;
  const agent = agents.get(id);

  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }

  agent.socket.disconnect(true);
  res.json({ success: true, message: 'Agent disconnected' });
});

// ============== WebSocket Handlers ==============

io.on('connection', (socket) => {
  const ip = socket.handshake.address || 'unknown';
  console.log(`[Relay] New connection: ${socket.id} from ${ip}`);
  usageStats.totalConnections++;

  // -------- Desktop Agent Events --------

  socket.on('agent:register', (data) => {
    // Rate limit agent registrations
    const rl = rateLimit(`agent:${ip}`, 10); // Max 10 registrations per minute per IP
    if (!rl.allowed) {
      socket.emit('agent:error', { error: 'Too many registration attempts' });
      return;
    }

    const agentId = nanoid(16);
    const pairingCode = generatePairingCode();
    const authToken = generateAuthToken();

    const agentInfo = {
      socket,
      info: {
        name: String(data.name || 'Desktop Agent').slice(0, 100),
        hostname: String(data.hostname || 'unknown').slice(0, 100),
        platform: String(data.platform || 'unknown').slice(0, 50),
        version: String(data.version || '1.0.0').slice(0, 20),
        capabilities: data.capabilities || {}
      },
      connectedAt: new Date().toISOString(),
      viewers: new Set(),
      pairingCode,
      authToken,
      ip
    };

    agents.set(agentId, agentInfo);
    pairingCodes.set(pairingCode, {
      agentId,
      createdAt: Date.now(),
      attempts: 0
    });

    socket.agentId = agentId;
    socket.role = 'agent';
    socket.authToken = authToken;

    // Update peak stats
    if (agents.size > usageStats.peakAgents) {
      usageStats.peakAgents = agents.size;
    }

    console.log(`[Relay] Agent registered: ${agentId} (${agentInfo.info.hostname}) - Code: ${pairingCode}`);

    socket.emit('agent:registered', {
      agentId,
      pairingCode,
      authToken, // Agent should store this for reconnection
      expiresIn: PAIRING_CODE_EXPIRY_MS,
      message: 'Agent registered successfully. Share this pairing code with your mobile device.'
    });
  });

  // Agent refreshes pairing code
  socket.on('agent:refresh-code', () => {
    if (socket.role !== 'agent' || !socket.agentId) return;

    const agent = agents.get(socket.agentId);
    if (!agent) return;

    // Delete old code
    pairingCodes.delete(agent.pairingCode);

    // Generate new code
    const newCode = generatePairingCode();
    agent.pairingCode = newCode;
    pairingCodes.set(newCode, {
      agentId: socket.agentId,
      createdAt: Date.now(),
      attempts: 0
    });

    socket.emit('agent:code-refreshed', {
      pairingCode: newCode,
      expiresIn: PAIRING_CODE_EXPIRY_MS
    });

    console.log(`[Relay] Agent ${socket.agentId} refreshed code: ${newCode}`);
  });

  // Agent sends screen frame
  socket.on('screen:frame', (frameData) => {
    if (socket.role !== 'agent' || !socket.agentId) return;

    const agent = agents.get(socket.agentId);
    if (!agent) return;

    usageStats.totalFramesRelayed++;

    // Broadcast frame to all viewers of this agent
    agent.viewers.forEach(viewerId => {
      const viewer = viewers.get(viewerId);
      if (viewer && viewer.socket.connected) {
        viewer.socket.emit('screen:frame', frameData);
      }
    });
  });

  // Agent sends displays list
  socket.on('screen:displays', (data) => {
    if (socket.role !== 'agent' || !socket.agentId) return;

    const agent = agents.get(socket.agentId);
    if (!agent) return;

    agent.viewers.forEach(viewerId => {
      const viewer = viewers.get(viewerId);
      if (viewer && viewer.socket.connected) {
        viewer.socket.emit('screen:displays', data);
      }
    });
  });

  // Agent confirms stream started
  socket.on('screen:started', (data) => {
    if (socket.role !== 'agent' || !socket.agentId) return;

    const agent = agents.get(socket.agentId);
    if (!agent) return;

    agent.viewers.forEach(viewerId => {
      const viewer = viewers.get(viewerId);
      if (viewer && viewer.socket.connected) {
        viewer.socket.emit('screen:started', data);
      }
    });
  });

  // Agent confirms stream stopped
  socket.on('screen:stopped', (data) => {
    if (socket.role !== 'agent' || !socket.agentId) return;

    const agent = agents.get(socket.agentId);
    if (!agent) return;

    agent.viewers.forEach(viewerId => {
      const viewer = viewers.get(viewerId);
      if (viewer && viewer.socket.connected) {
        viewer.socket.emit('screen:stopped', data);
      }
    });
  });

  // Agent sends command output
  socket.on('command-output', (data) => {
    if (socket.role !== 'agent' || !socket.agentId) return;

    const agent = agents.get(socket.agentId);
    if (!agent) return;

    agent.viewers.forEach(viewerId => {
      const viewer = viewers.get(viewerId);
      if (viewer && viewer.socket.connected) {
        viewer.socket.emit('command-output', data);
      }
    });
  });

  // Agent sends command complete
  socket.on('command-complete', (data) => {
    if (socket.role !== 'agent' || !socket.agentId) return;

    const agent = agents.get(socket.agentId);
    if (!agent) return;

    agent.viewers.forEach(viewerId => {
      const viewer = viewers.get(viewerId);
      if (viewer && viewer.socket.connected) {
        viewer.socket.emit('command-complete', data);
      }
    });
  });

  // -------- Mobile Viewer Events --------

  socket.on('viewer:connect', (data) => {
    const { pairingCode, code } = data;
    const viewerIp = socket.handshake.address || 'unknown';

    // Validate pairing attempt
    const validation = validatePairingAttempt(viewerIp);
    if (!validation.allowed) {
      socket.emit('viewer:error', {
        error: 'Too many failed attempts. Please try again later.',
        blockedFor: Math.ceil(validation.blockedFor / 1000)
      });
      return;
    }

    const codeToUse = String(pairingCode || code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (codeToUse.length !== 8) {
      recordFailedPairing(viewerIp);
      socket.emit('viewer:error', { error: 'Invalid pairing code format' });
      return;
    }

    const pairingData = pairingCodes.get(codeToUse);
    if (!pairingData) {
      recordFailedPairing(viewerIp);
      socket.emit('viewer:error', { error: 'Invalid pairing code' });
      return;
    }

    // Check if code expired
    if (Date.now() - pairingData.createdAt > PAIRING_CODE_EXPIRY_MS) {
      pairingCodes.delete(codeToUse);
      recordFailedPairing(viewerIp);
      socket.emit('viewer:error', { error: 'Pairing code has expired' });
      return;
    }

    const agent = agents.get(pairingData.agentId);
    if (!agent) {
      recordFailedPairing(viewerIp);
      socket.emit('viewer:error', { error: 'Agent not connected' });
      return;
    }

    // Check viewer limit
    if (agent.viewers.size >= MAX_VIEWERS_PER_AGENT) {
      socket.emit('viewer:error', {
        error: 'Maximum viewers reached for this agent',
        maxViewers: MAX_VIEWERS_PER_AGENT
      });
      return;
    }

    const viewerId = socket.id;
    viewers.set(viewerId, {
      socket,
      agentId: pairingData.agentId,
      connectedAt: new Date().toISOString(),
      ip: viewerIp
    });

    agent.viewers.add(viewerId);
    socket.agentId = pairingData.agentId;
    socket.role = 'viewer';

    // Update peak stats
    if (viewers.size > usageStats.peakViewers) {
      usageStats.peakViewers = viewers.size;
    }

    console.log(`[Relay] Viewer ${viewerId} connected to agent ${pairingData.agentId}`);

    socket.emit('viewer:connected', {
      agentId: pairingData.agentId,
      agent: {
        name: agent.info.name,
        hostname: agent.info.hostname,
        platform: agent.info.platform
      },
      message: 'Connected to desktop agent'
    });

    // Notify agent of new viewer
    agent.socket.emit('viewer:joined', {
      viewerId,
      viewerCount: agent.viewers.size
    });
  });

  // Viewer requests screen stream
  socket.on('screen:start', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;

    const agent = agents.get(socket.agentId);
    if (!agent) return;

    agent.socket.emit('screen:start', data);
  });

  // Viewer stops screen stream
  socket.on('screen:stop', () => {
    if (socket.role !== 'viewer' || !socket.agentId) return;

    const agent = agents.get(socket.agentId);
    if (!agent) return;

    agent.socket.emit('screen:stop', { viewerId: socket.id });
  });

  // Viewer changes display
  socket.on('screen:display', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;

    const agent = agents.get(socket.agentId);
    if (!agent) return;

    agent.socket.emit('screen:display', data);
  });

  // Viewer updates settings
  socket.on('screen:settings', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;

    const agent = agents.get(socket.agentId);
    if (!agent) return;

    // Validate settings
    const sanitizedData = {
      fps: Math.min(Math.max(parseInt(data.fps, 10) || 10, 1), 30),
      quality: Math.min(Math.max(parseInt(data.quality, 10) || 50, 10), 100),
      scale: Math.min(Math.max(parseFloat(data.scale) || 1, 0.1), 2)
    };

    agent.socket.emit('screen:settings', sanitizedData);
  });

  // -------- Input Events (Viewer -> Agent) --------

  socket.on('input:click', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;

    // Validate coordinates
    if (data.x !== undefined && data.y !== undefined) {
      if (!validateCoordinates(data.x, data.y)) return;
    }

    const agent = agents.get(socket.agentId);
    if (agent) agent.socket.emit('input:click', data);
  });

  socket.on('input:dblclick', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;

    if (data.x !== undefined && data.y !== undefined) {
      if (!validateCoordinates(data.x, data.y)) return;
    }

    const agent = agents.get(socket.agentId);
    if (agent) agent.socket.emit('input:dblclick', data);
  });

  socket.on('input:rightclick', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;

    if (data.x !== undefined && data.y !== undefined) {
      if (!validateCoordinates(data.x, data.y)) return;
    }

    const agent = agents.get(socket.agentId);
    if (agent) agent.socket.emit('input:rightclick', data);
  });

  socket.on('input:mousemove', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;

    if (!validateCoordinates(data.x, data.y)) return;

    const agent = agents.get(socket.agentId);
    if (agent) agent.socket.emit('input:mousemove', data);
  });

  socket.on('input:type', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;

    // Limit text length
    const text = String(data.text || '').slice(0, 5000);
    if (!text) return;

    const agent = agents.get(socket.agentId);
    if (agent) agent.socket.emit('input:type', { text });
  });

  socket.on('input:key', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;

    // Validate key
    const key = String(data.key || '').slice(0, 50);
    if (!key) return;

    // Validate modifiers
    const validModifiers = ['ctrl', 'alt', 'shift', 'meta', 'command'];
    const modifiers = Array.isArray(data.modifiers)
      ? data.modifiers.filter(m => validModifiers.includes(String(m).toLowerCase()))
      : [];

    const agent = agents.get(socket.agentId);
    if (agent) agent.socket.emit('input:key', { key, modifiers });
  });

  socket.on('input:scroll', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;

    // Validate scroll values
    const deltaY = Math.min(Math.max(parseInt(data.deltaY, 10) || 0, -1000), 1000);
    const deltaX = Math.min(Math.max(parseInt(data.deltaX, 10) || 0, -1000), 1000);

    const agent = agents.get(socket.agentId);
    if (agent) agent.socket.emit('input:scroll', { deltaY, deltaX });
  });

  // -------- Command Events (Viewer -> Agent) --------

  socket.on('execute-command', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;

    // Rate limit commands per viewer
    const rl = rateLimit(`cmd:${socket.id}`, 30); // Max 30 commands per minute
    if (!rl.allowed) {
      socket.emit('command-error', {
        type: 'error',
        data: 'Too many commands. Please slow down.'
      });
      return;
    }

    const command = sanitizeCommand(data.command);
    if (!command) {
      socket.emit('command-error', {
        type: 'error',
        data: 'Invalid command'
      });
      return;
    }

    usageStats.totalCommandsExecuted++;

    const agent = agents.get(socket.agentId);
    if (agent) {
      agent.socket.emit('execute-command', {
        command,
        sessionId: data.sessionId
      });
    }
  });

  // -------- Disconnect Handler --------

  socket.on('disconnect', () => {
    console.log(`[Relay] Disconnected: ${socket.id} (role: ${socket.role || 'unknown'})`);

    if (socket.role === 'agent' && socket.agentId) {
      const agent = agents.get(socket.agentId);
      if (agent) {
        // Notify all viewers that agent disconnected
        agent.viewers.forEach(viewerId => {
          const viewer = viewers.get(viewerId);
          if (viewer && viewer.socket.connected) {
            viewer.socket.emit('agent:disconnected', {
              message: 'Desktop agent disconnected'
            });
          }
        });

        // Cleanup
        pairingCodes.delete(agent.pairingCode);
        agents.delete(socket.agentId);
      }
    }

    if (socket.role === 'viewer') {
      const viewer = viewers.get(socket.id);
      if (viewer) {
        const agent = agents.get(viewer.agentId);
        if (agent) {
          agent.viewers.delete(socket.id);
          agent.socket.emit('viewer:left', {
            viewerId: socket.id,
            viewerCount: agent.viewers.size
          });
        }
        viewers.delete(socket.id);
      }
    }
  });

  // Error handler
  socket.on('error', (error) => {
    console.error(`[Relay] Socket error for ${socket.id}:`, error.message);
  });
});

// ============== Cleanup Tasks ==============

// Cleanup expired pairing codes every minute
setInterval(() => {
  const now = Date.now();

  pairingCodes.forEach((data, code) => {
    // Remove if expired or agent no longer exists
    if (now - data.createdAt > PAIRING_CODE_EXPIRY_MS || !agents.has(data.agentId)) {
      pairingCodes.delete(code);
    }
  });

  // Cleanup old failed pairing attempts
  failedPairingAttempts.forEach((attempts, ip) => {
    if (now - attempts.firstAttempt > 30 * 60 * 1000) { // 30 minutes
      failedPairingAttempts.delete(ip);
    }
  });
}, 60 * 1000);

// ============== Graceful Shutdown ==============

function shutdown(signal) {
  console.log(`\n[Relay] Received ${signal}, shutting down gracefully...`);

  // Notify all connected clients
  agents.forEach((agent) => {
    agent.socket.emit('server:shutdown', { message: 'Server is shutting down' });
    agent.socket.disconnect(true);
  });

  viewers.forEach((viewer) => {
    viewer.socket.emit('server:shutdown', { message: 'Server is shutting down' });
    viewer.socket.disconnect(true);
  });

  httpServer.close(() => {
    console.log('[Relay] Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.log('[Relay] Forcing shutdown...');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ============== Start Server ==============

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('=================================================');
  console.log('  RemoteDevAI Relay Server v2.0.0 - RUNNING');
  console.log('=================================================');
  console.log(`  Environment: ${NODE_ENV}`);
  console.log(`  Port: ${PORT}`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log('');
  console.log('  Security Features:');
  console.log('  - 8-character pairing codes');
  console.log('  - Rate limiting enabled');
  console.log('  - Input validation');
  console.log('  - Brute-force protection');
  console.log(`  - Max ${MAX_VIEWERS_PER_AGENT} viewers per agent`);
  console.log(`  - Pairing codes expire in ${PAIRING_CODE_EXPIRY_MS / 1000 / 60} minutes`);
  console.log('');
  console.log('  This server relays connections between:');
  console.log('  - Desktop agents (your computer)');
  console.log('  - Mobile viewers (your phone)');
  console.log('=================================================');
  console.log('');
});
