import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ClaudeRelay } from './claude-relay.js';
import { ScreenCapture } from './screen-capture.js';
import { InputControl } from './input-control.js';
import { RelayConnector } from './relay-connector.js';
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
  },
  maxHttpBufferSize: 10e6 // 10MB for large frames
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve mobile web interface
const mobileWebPath = join(__dirname, '../../mobile-web');
app.use(express.static(mobileWebPath));
app.use('/desktop', express.static(__dirname));

// Initialize services
const claudeRelay = new ClaudeRelay();
const screenCapture = new ScreenCapture();
const inputControl = new InputControl();

// Initialize relay connector
const relayConnector = new RelayConnector({
  relayUrl: process.env.RELAY_URL || 'http://localhost:3001',
  screenCapture,
  inputControl,
  claudeRelay
});

// Track connected viewers
const viewers = new Map();

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

// ============== REST API Routes ==============

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeSessions: claudeRelay.getActiveSessionsCount(),
    uptime: process.uptime(),
    platform: os.platform(),
    hostname: os.hostname(),
    localIPs: getLocalIPs(),
    screenCapture: screenCapture.getStats(),
    viewers: viewers.size,
    relayConnector: relayConnector.getStatus()
  });
});

// Get available displays
app.get('/api/displays', async (req, res) => {
  try {
    const displays = await screenCapture.getDisplays();
    res.json({ success: true, displays });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Capture single screenshot
app.get('/api/screenshot', async (req, res) => {
  try {
    const frame = await screenCapture.captureFrame();
    res.json({
      success: true,
      frame: frame,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send command
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

// ============== WebSocket Event Handlers ==============

io.on('connection', async (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id}`);

  // Track viewer
  viewers.set(socket.id, {
    connectedAt: Date.now(),
    isViewing: false
  });

  // Send initial connection info
  socket.emit('connected', {
    message: 'Connected to RemoteDevAI Desktop Agent',
    sessionId: socket.id,
    timestamp: new Date().toISOString(),
    localIPs: getLocalIPs(),
    hostname: os.hostname(),
    platform: os.platform(),
    screenSize: inputControl.getScreenSize(),
    features: {
      screenShare: true,
      inputControl: true,
      voiceCommands: true,
      claudeIntegration: true
    }
  });

  // -------- Screen Sharing Events --------

  // Start screen streaming
  socket.on('screen:start', async (data) => {
    const { fps = 10, quality = 50, displayId = 0 } = data || {};

    console.log(`[WebSocket] ${socket.id} requested screen stream (${fps} FPS, Q${quality})`);

    // Get displays first
    const displays = await screenCapture.getDisplays();
    socket.emit('screen:displays', { displays });

    // Set options
    screenCapture.setFPS(fps);
    screenCapture.setQuality(quality);
    screenCapture.selectDisplay(displayId);

    // Subscribe this socket to frames
    const viewer = viewers.get(socket.id);
    if (viewer) {
      viewer.isViewing = true;
      viewer.unsubscribe = screenCapture.subscribe((frameData) => {
        socket.emit('screen:frame', frameData);
      });
    }

    // Start streaming if not already
    if (!screenCapture.isStreaming) {
      screenCapture.startStreaming(fps);
    }

    socket.emit('screen:started', {
      fps: screenCapture.fps,
      quality: screenCapture.quality,
      displayId: screenCapture.currentDisplay,
      screenSize: inputControl.getScreenSize()
    });
  });

  // Stop screen streaming for this client
  socket.on('screen:stop', () => {
    console.log(`[WebSocket] ${socket.id} stopped screen stream`);

    const viewer = viewers.get(socket.id);
    if (viewer) {
      viewer.isViewing = false;
      if (viewer.unsubscribe) {
        viewer.unsubscribe();
        viewer.unsubscribe = null;
      }
    }

    // Check if any viewers are still watching
    const activeViewers = Array.from(viewers.values()).filter(v => v.isViewing);
    if (activeViewers.length === 0) {
      screenCapture.stopStreaming();
    }

    socket.emit('screen:stopped');
  });

  // Change display
  socket.on('screen:display', async (data) => {
    const { displayId } = data;
    screenCapture.selectDisplay(displayId);
    socket.emit('screen:display-changed', { displayId });
  });

  // Update stream settings
  socket.on('screen:settings', (data) => {
    const { fps, quality, scale } = data;
    if (fps) screenCapture.setFPS(fps);
    if (quality) screenCapture.setQuality(quality);
    if (scale) screenCapture.setScale(scale);
    socket.emit('screen:settings-updated', screenCapture.getStats());
  });

  // Request single frame (screenshot)
  socket.on('screen:snapshot', async () => {
    try {
      const frame = await screenCapture.captureFrame();
      socket.emit('screen:snapshot', {
        frame,
        timestamp: Date.now(),
        screenSize: inputControl.getScreenSize()
      });
    } catch (error) {
      socket.emit('screen:error', { message: error.message });
    }
  });

  // -------- Input Control Events --------

  // Mouse move
  socket.on('input:mousemove', async (data) => {
    const { x, y } = data; // Normalized 0-1 coordinates
    await inputControl.moveMouse(x, y);
  });

  // Mouse click
  socket.on('input:click', async (data) => {
    const { x, y, button = 'left' } = data;
    if (x !== undefined && y !== undefined) {
      await inputControl.clickAt(x, y, button);
    } else {
      await inputControl.click(button);
    }
  });

  // Double click
  socket.on('input:dblclick', async (data) => {
    const { x, y } = data || {};
    if (x !== undefined && y !== undefined) {
      await inputControl.moveMouse(x, y);
      await new Promise(r => setTimeout(r, 50));
    }
    await inputControl.doubleClick();
  });

  // Right click
  socket.on('input:rightclick', async (data) => {
    const { x, y } = data || {};
    if (x !== undefined && y !== undefined) {
      await inputControl.clickAt(x, y, 'right');
    } else {
      await inputControl.click('right');
    }
  });

  // Type text
  socket.on('input:type', async (data) => {
    const { text } = data;
    if (text) {
      await inputControl.typeText(text);
    }
  });

  // Press key
  socket.on('input:key', async (data) => {
    const { key, modifiers } = data;
    if (modifiers && modifiers.length > 0) {
      await inputControl.pressCombo(modifiers, key);
    } else {
      await inputControl.pressKey(key);
    }
  });

  // Scroll
  socket.on('input:scroll', async (data) => {
    const { deltaY, deltaX = 0 } = data;
    await inputControl.scroll(deltaY, deltaX);
  });

  // Toggle input control
  socket.on('input:toggle', (data) => {
    const { enabled } = data;
    inputControl.setEnabled(enabled);
    socket.emit('input:toggled', { enabled: inputControl.isEnabled });
  });

  // -------- Claude Command Events --------

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

  // -------- Disconnect Handler --------

  socket.on('disconnect', () => {
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);

    // Clean up viewer
    const viewer = viewers.get(socket.id);
    if (viewer) {
      if (viewer.unsubscribe) {
        viewer.unsubscribe();
      }
      viewers.delete(socket.id);
    }

    // Stop streaming if no viewers
    const activeViewers = Array.from(viewers.values()).filter(v => v.isViewing);
    if (activeViewers.length === 0 && screenCapture.isStreaming) {
      screenCapture.stopStreaming();
    }
  });
});

// Start server
httpServer.listen(PORT, '0.0.0.0', async () => {
  const localIPs = getLocalIPs();

  // Initialize displays
  await screenCapture.getDisplays();

  // Connect to relay server
  try {
    await relayConnector.connect();
    console.log('[RelayConnector] Successfully connected to relay server');
  } catch (error) {
    console.error('[RelayConnector] Failed to connect to relay server:', error.message);
    console.log('[RelayConnector] Continuing in local-only mode...');
  }

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
  console.log('\n-------------------------------------------------');
  console.log('Relay Server:');
  console.log(`  URL: ${relayConnector.relayUrl}`);
  console.log(`  Status: ${relayConnector.isConnected ? 'Connected' : 'Disconnected'}`);
  if (relayConnector.pairingCode) {
    console.log(`  Pairing Code: ${relayConnector.pairingCode}`);
  }
  console.log('-------------------------------------------------');
  console.log('Features enabled:');
  console.log('  - Screen sharing (live view from mobile)');
  console.log('  - Remote input control (mouse/keyboard)');
  console.log('  - Voice commands via Claude Code');
  console.log('  - Interactive terminal sessions');
  console.log('  - Internet relay access (if connected)');
  console.log('-------------------------------------------------');
  console.log(`\nOpen any URL above on your mobile device to start!\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  screenCapture.stopStreaming();
  relayConnector.disconnect();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down gracefully...');
  screenCapture.stopStreaming();
  relayConnector.disconnect();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
