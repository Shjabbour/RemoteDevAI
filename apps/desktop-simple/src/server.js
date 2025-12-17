import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ClaudeRelay } from './claude-relay.js';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3456;
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins for mobile access
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
// Serve mobile web interface
const mobileWebPath = join(__dirname, '../../mobile-web');
app.use(express.static(mobileWebPath));
app.use('/desktop', express.static(__dirname));

// Initialize Claude Relay
const claudeRelay = new ClaudeRelay();

// Get local IP addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }

  return ips;
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeSessions: claudeRelay.getActiveSessionsCount(),
    uptime: process.uptime(),
    platform: os.platform(),
    hostname: os.hostname(),
    localIPs: getLocalIPs()
  });
});

app.post('/api/send-command', (req, res) => {
  const { command } = req.body;

  if (!command) {
    return res.status(400).json({
      success: false,
      error: 'Command is required'
    });
  }

  console.log(`[API] Received command: ${command}`);

  // Execute command and stream results via Socket.IO
  claudeRelay.executeCommand(
    command,
    (output) => {
      // Broadcast output to all connected clients
      io.emit('command-output', {
        type: output.type,
        data: output.data,
        timestamp: new Date().toISOString()
      });
    },
    (error) => {
      // Broadcast error to all connected clients
      io.emit('command-error', {
        type: error.type,
        data: error.data,
        timestamp: new Date().toISOString()
      });
    },
    (result) => {
      // Broadcast completion to all connected clients
      io.emit('command-complete', {
        code: result.code,
        timestamp: new Date().toISOString()
      });
    }
  );

  res.json({
    success: true,
    message: 'Command queued for execution',
    timestamp: new Date().toISOString()
  });
});

// Get working directory
app.get('/api/cwd', (req, res) => {
  res.json({
    cwd: process.env.CLAUDE_CWD || process.cwd(),
    home: os.homedir()
  });
});

// Set working directory
app.post('/api/cwd', (req, res) => {
  const { path } = req.body;

  if (!path) {
    return res.status(400).json({
      success: false,
      error: 'Path is required'
    });
  }

  process.env.CLAUDE_CWD = path;

  res.json({
    success: true,
    cwd: path
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id}`);

  socket.emit('connected', {
    message: 'Connected to RemoteDevAI Desktop Agent',
    sessionId: socket.id,
    timestamp: new Date().toISOString(),
    localIPs: getLocalIPs(),
    hostname: os.hostname()
  });

  // Handle command from client
  socket.on('execute-command', (data) => {
    const { command, sessionId } = data;

    console.log(`[WebSocket] Executing command from ${socket.id}: ${command}`);

    claudeRelay.executeCommand(
      command,
      (output) => {
        socket.emit('command-output', {
          sessionId,
          type: output.type,
          data: output.data,
          timestamp: new Date().toISOString()
        });
      },
      (error) => {
        socket.emit('command-error', {
          sessionId,
          type: error.type,
          data: error.data,
          timestamp: new Date().toISOString()
        });
      },
      (result) => {
        socket.emit('command-complete', {
          sessionId,
          code: result.code,
          timestamp: new Date().toISOString()
        });
      }
    );
  });

  // Handle interactive session start
  socket.on('start-session', (data) => {
    const { command } = data;

    console.log(`[WebSocket] Starting interactive session for ${socket.id}: ${command}`);

    const sessionId = claudeRelay.startSession(
      command,
      (output) => {
        socket.emit('session-output', {
          sessionId,
          type: output.type,
          data: output.data,
          timestamp: new Date().toISOString()
        });
      },
      (error) => {
        socket.emit('session-error', {
          sessionId,
          type: error.type,
          data: error.data,
          timestamp: new Date().toISOString()
        });
      },
      (result) => {
        socket.emit('session-exit', {
          sessionId,
          code: result.code,
          signal: result.signal,
          timestamp: new Date().toISOString()
        });
      }
    );

    socket.emit('session-started', {
      sessionId,
      timestamp: new Date().toISOString()
    });
  });

  // Handle input to active session
  socket.on('session-input', (data) => {
    const { sessionId, input } = data;

    try {
      claudeRelay.sendInput(sessionId, input);
      socket.emit('session-input-ack', {
        sessionId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      socket.emit('session-error', {
        sessionId,
        type: 'error',
        data: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle session termination
  socket.on('terminate-session', (data) => {
    const { sessionId } = data;

    try {
      claudeRelay.terminateSession(sessionId);
      socket.emit('session-terminated', {
        sessionId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      socket.emit('session-error', {
        sessionId,
        type: 'error',
        data: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);
  });
});

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  const localIPs = getLocalIPs();

  console.log('\n=================================================');
  console.log('  RemoteDevAI Desktop Agent - RUNNING');
  console.log('=================================================');
  console.log(`\nServer started on port ${PORT}`);
  console.log(`\nLocal access:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`\nNetwork access (connect from mobile):`);
  localIPs.forEach(ip => {
    console.log(`  http://${ip}:${PORT}`);
  });
  console.log('\n=================================================');
  console.log(`\nTest page: Open any URL above in your browser`);
  console.log(`Mobile app: Connect to any network URL from your phone\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
