import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { nanoid } from 'nanoid';

const PORT = process.env.PORT || 3001;
const app = express();
const httpServer = createServer(app);

// Socket.IO with permissive CORS for mobile access
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 10e6, // 10MB for screen frames
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors());
app.use(express.json());

// ============== In-Memory State ==============

// Desktop agents: agentId -> { socket, info, connectedAt, viewers: Set }
const agents = new Map();

// Mobile viewers: viewerId -> { socket, agentId, connectedAt }
const viewers = new Map();

// Pairing codes: code -> agentId (temporary, expires after use)
const pairingCodes = new Map();

// ============== REST API ==============

app.get('/', (req, res) => {
  res.json({
    service: 'RemoteDevAI Relay Server',
    version: '1.0.0',
    status: 'running',
    stats: {
      agents: agents.size,
      viewers: viewers.size,
      activePairings: pairingCodes.size
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    agents: agents.size,
    viewers: viewers.size
  });
});

// Get agent by pairing code (for mobile to find agent)
app.get('/api/agent/:code', (req, res) => {
  const { code } = req.params;
  const agentId = pairingCodes.get(code.toUpperCase());

  if (!agentId) {
    return res.status(404).json({ success: false, error: 'Invalid or expired pairing code' });
  }

  const agent = agents.get(agentId);
  if (!agent) {
    pairingCodes.delete(code.toUpperCase());
    return res.status(404).json({ success: false, error: 'Agent not connected' });
  }

  res.json({
    success: true,
    agent: {
      id: agentId,
      name: agent.info.name,
      hostname: agent.info.hostname,
      platform: agent.info.platform,
      connectedAt: agent.connectedAt,
      viewerCount: agent.viewers.size
    }
  });
});

// List all online agents (for authenticated users - simplified for now)
app.get('/api/agents', (req, res) => {
  const agentList = Array.from(agents.entries()).map(([id, agent]) => ({
    id,
    name: agent.info.name,
    hostname: agent.info.hostname,
    platform: agent.info.platform,
    connectedAt: agent.connectedAt,
    viewerCount: agent.viewers.size,
    pairingCode: agent.pairingCode
  }));

  res.json({ success: true, agents: agentList });
});

// ============== WebSocket Handlers ==============

io.on('connection', (socket) => {
  console.log(`[Relay] New connection: ${socket.id}`);

  // -------- Desktop Agent Events --------

  // Agent registers itself
  socket.on('agent:register', (data) => {
    const agentId = nanoid(12);
    const pairingCode = generatePairingCode();

    const agentInfo = {
      socket,
      info: {
        name: data.name || 'Desktop Agent',
        hostname: data.hostname || 'unknown',
        platform: data.platform || 'unknown',
        version: data.version || '1.0.0',
        capabilities: data.capabilities || {}
      },
      connectedAt: new Date().toISOString(),
      viewers: new Set(),
      pairingCode
    };

    agents.set(agentId, agentInfo);
    pairingCodes.set(pairingCode, agentId);
    socket.agentId = agentId;
    socket.role = 'agent';

    console.log(`[Relay] Agent registered: ${agentId} (${agentInfo.info.hostname}) - Code: ${pairingCode}`);

    socket.emit('agent:registered', {
      agentId,
      pairingCode,
      message: 'Agent registered successfully. Share this pairing code with your mobile device.'
    });
  });

  // Agent sends screen frame
  socket.on('screen:frame', (frameData) => {
    if (socket.role !== 'agent' || !socket.agentId) return;

    const agent = agents.get(socket.agentId);
    if (!agent) return;

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

  // Viewer connects using pairing code
  socket.on('viewer:connect', (data) => {
    const { pairingCode, code } = data;
    const codeToUse = (pairingCode || code || '').toUpperCase();

    const agentId = pairingCodes.get(codeToUse);
    if (!agentId) {
      socket.emit('viewer:error', { error: 'Invalid pairing code' });
      return;
    }

    const agent = agents.get(agentId);
    if (!agent) {
      socket.emit('viewer:error', { error: 'Agent not connected' });
      return;
    }

    const viewerId = socket.id;
    viewers.set(viewerId, {
      socket,
      agentId,
      connectedAt: new Date().toISOString()
    });

    agent.viewers.add(viewerId);
    socket.agentId = agentId;
    socket.role = 'viewer';

    console.log(`[Relay] Viewer ${viewerId} connected to agent ${agentId}`);

    socket.emit('viewer:connected', {
      agentId,
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

    // Forward to agent
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

    agent.socket.emit('screen:settings', data);
  });

  // -------- Input Events (Viewer -> Agent) --------

  socket.on('input:click', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;
    const agent = agents.get(socket.agentId);
    if (agent) agent.socket.emit('input:click', data);
  });

  socket.on('input:dblclick', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;
    const agent = agents.get(socket.agentId);
    if (agent) agent.socket.emit('input:dblclick', data);
  });

  socket.on('input:rightclick', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;
    const agent = agents.get(socket.agentId);
    if (agent) agent.socket.emit('input:rightclick', data);
  });

  socket.on('input:mousemove', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;
    const agent = agents.get(socket.agentId);
    if (agent) agent.socket.emit('input:mousemove', data);
  });

  socket.on('input:type', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;
    const agent = agents.get(socket.agentId);
    if (agent) agent.socket.emit('input:type', data);
  });

  socket.on('input:key', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;
    const agent = agents.get(socket.agentId);
    if (agent) agent.socket.emit('input:key', data);
  });

  socket.on('input:scroll', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;
    const agent = agents.get(socket.agentId);
    if (agent) agent.socket.emit('input:scroll', data);
  });

  // -------- Command Events (Viewer -> Agent) --------

  socket.on('execute-command', (data) => {
    if (socket.role !== 'viewer' || !socket.agentId) return;
    const agent = agents.get(socket.agentId);
    if (agent) agent.socket.emit('execute-command', data);
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
});

// ============== Utility Functions ==============

function generatePairingCode() {
  // Generate 6-character alphanumeric code (easy to type on phone)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0,O,1,I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Cleanup expired pairing codes every 10 minutes
setInterval(() => {
  const now = Date.now();
  pairingCodes.forEach((agentId, code) => {
    if (!agents.has(agentId)) {
      pairingCodes.delete(code);
    }
  });
}, 10 * 60 * 1000);

// ============== Start Server ==============

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('=================================================');
  console.log('  RemoteDevAI Relay Server - RUNNING');
  console.log('=================================================');
  console.log(`  Port: ${PORT}`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log('');
  console.log('  This server relays connections between:');
  console.log('  - Desktop agents (your computer)');
  console.log('  - Mobile viewers (your phone)');
  console.log('');
  console.log('  Deploy this to a cloud service for internet access!');
  console.log('=================================================');
  console.log('');
});
