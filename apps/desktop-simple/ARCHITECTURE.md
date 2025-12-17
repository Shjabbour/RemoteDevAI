# RemoteDevAI Desktop Agent - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     RemoteDevAI System                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐                                ┌──────────────┐
│              │    WebSocket (Socket.IO)       │              │
│   Mobile     │◄──────────────────────────────►│   Desktop    │
│   Client     │         port 3456              │    Agent     │
│   (Phone)    │                                │    (PC)      │
│              │    REST API (HTTP)             │              │
│              │◄──────────────────────────────►│              │
└──────────────┘                                └──────┬───────┘
                                                       │
                                                       │ Child Process
                                                       │ (spawn)
                                                       │
                                                ┌──────▼───────┐
                                                │   Claude     │
                                                │   Code CLI   │
                                                └──────────────┘
```

---

## Component Breakdown

### 1. Mobile Client (Your Phone)

```
┌─────────────────────────┐
│   Mobile Application    │
├─────────────────────────┤
│ • Socket.IO Client      │
│ • Command Input UI      │
│ • Output Display        │
│ • Connection Manager    │
└─────────────────────────┘
         │
         │ WebSocket/HTTP
         ▼
```

**Responsibilities:**
- Connect to desktop agent via WebSocket
- Send commands to Claude
- Display real-time output
- Handle connection status

**Files:**
- `example-client.html` - Reference implementation

### 2. Desktop Agent (Your PC)

```
┌─────────────────────────────────────────┐
│           Desktop Agent Server          │
├─────────────────────────────────────────┤
│  ┌─────────────┐    ┌────────────────┐ │
│  │   Express   │    │   Socket.IO    │ │
│  │  HTTP Server│    │  WS Server     │ │
│  └──────┬──────┘    └────────┬───────┘ │
│         │                    │         │
│         └──────────┬─────────┘         │
│                    │                   │
│         ┌──────────▼──────────┐        │
│         │   ClaudeRelay       │        │
│         │  Process Manager    │        │
│         └─────────────────────┘        │
└─────────────────────────────────────────┘
                 │
                 │ Child Process
                 ▼
```

**Responsibilities:**
- Accept WebSocket connections
- Handle REST API requests
- Spawn Claude CLI processes
- Stream output back to clients
- Manage session lifecycle

**Files:**
- `src/server.js` - HTTP + WebSocket server
- `src/claude-relay.js` - Process manager

### 3. Claude Code CLI (AI Assistant)

```
┌─────────────────────────┐
│    Claude Code CLI      │
├─────────────────────────┤
│ • Natural language AI   │
│ • Code analysis         │
│ • File operations       │
│ • Git integration       │
└─────────────────────────┘
```

**Responsibilities:**
- Process natural language commands
- Execute code operations
- Analyze codebase
- Return results

**Integration:**
- Spawned via Node.js `child_process`
- Communicates via stdin/stdout/stderr

---

## Data Flow

### Command Execution Flow

```
1. User Input (Mobile)
   │
   │ "List all files in this directory"
   │
   ▼

2. WebSocket Send (Mobile)
   │
   │ socket.emit('execute-command', { command: '...' })
   │
   ▼

3. Server Receives (Desktop Agent)
   │
   │ io.on('connection', (socket) => {
   │   socket.on('execute-command', (data) => { ... })
   │ })
   │
   ▼

4. Spawn Claude Process (ClaudeRelay)
   │
   │ spawn('claude', [command])
   │
   ▼

5. Claude Processes Command
   │
   │ AI analyzes and executes
   │
   ▼

6. Output Stream (Claude → Desktop Agent)
   │
   │ stdout: "file1.js\nfile2.js\n..."
   │
   ▼

7. WebSocket Emit (Desktop Agent → Mobile)
   │
   │ socket.emit('command-output', { data: '...' })
   │
   ▼

8. Display Output (Mobile)
   │
   │ Update UI with results
   │
   ▼

9. Completion (Desktop Agent → Mobile)
   │
   │ socket.emit('command-complete', { code: 0 })
   │
   ▼

10. UI Update (Mobile)
    │
    │ Show "Command completed"
    │
    ✓
```

---

## Server Architecture

### Express + Socket.IO Server

```
src/server.js
├── Express App
│   ├── Middleware
│   │   ├── CORS
│   │   ├── JSON Parser
│   │   └── Static Files
│   │
│   └── Routes
│       ├── GET  /api/health
│       ├── POST /api/send-command
│       ├── GET  /api/cwd
│       ├── POST /api/cwd
│       └── GET  / (index.html)
│
└── Socket.IO Server
    └── Events
        ├── connection
        ├── execute-command
        ├── start-session
        ├── session-input
        └── terminate-session
```

### ClaudeRelay Process Manager

```
src/claude-relay.js
├── ClaudeRelay Class
│   ├── Properties
│   │   ├── activeSessions (Map)
│   │   └── sessionCounter (Number)
│   │
│   ├── Methods
│   │   ├── getClaudePath()
│   │   ├── startSession()
│   │   ├── executeCommand()
│   │   ├── sendInput()
│   │   ├── terminateSession()
│   │   └── getActiveSessionsCount()
│   │
│   └── Process Management
│       ├── spawn() - Create process
│       ├── stdout.on('data') - Capture output
│       ├── stderr.on('data') - Capture errors
│       ├── on('exit') - Handle completion
│       └── kill() - Terminate process
```

---

## Communication Protocols

### WebSocket Events

#### Client → Server

```javascript
// Execute one-off command
socket.emit('execute-command', {
  command: string
});

// Start interactive session
socket.emit('start-session', {
  command: string
});

// Send input to session
socket.emit('session-input', {
  sessionId: string,
  input: string
});

// Terminate session
socket.emit('terminate-session', {
  sessionId: string
});
```

#### Server → Client

```javascript
// Connection established
socket.emit('connected', {
  message: string,
  sessionId: string,
  timestamp: string,
  localIPs: string[],
  hostname: string
});

// Command output (stdout)
socket.emit('command-output', {
  type: 'stdout',
  data: string,
  timestamp: string
});

// Command error (stderr)
socket.emit('command-error', {
  type: 'stderr',
  data: string,
  timestamp: string
});

// Command completed
socket.emit('command-complete', {
  code: number,
  timestamp: string
});

// Session started
socket.emit('session-started', {
  sessionId: string,
  timestamp: string
});

// Session output
socket.emit('session-output', {
  sessionId: string,
  type: string,
  data: string,
  timestamp: string
});

// Session exit
socket.emit('session-exit', {
  sessionId: string,
  code: number,
  signal: string,
  timestamp: string
});
```

### REST API

```
GET /api/health
Response: {
  status: 'ok',
  timestamp: string,
  activeSessions: number,
  uptime: number,
  platform: string,
  hostname: string,
  localIPs: string[]
}

POST /api/send-command
Request: { command: string }
Response: {
  success: boolean,
  message: string,
  timestamp: string
}

GET /api/cwd
Response: {
  cwd: string,
  home: string
}

POST /api/cwd
Request: { path: string }
Response: {
  success: boolean,
  cwd: string
}
```

---

## Process Lifecycle

### One-Off Command

```
Start
  │
  ├─► executeCommand()
  │     │
  │     ├─► spawn('claude', [command])
  │     │     │
  │     │     ├─► Process starts
  │     │     │     │
  │     │     │     ├─► stdout.on('data') → Emit to client
  │     │     │     ├─► stderr.on('data') → Emit to client
  │     │     │     │
  │     │     │     └─► on('exit')
  │     │     │           │
  │     │     │           ├─► Emit 'command-complete'
  │     │     │           └─► Cleanup
  │     │     │
  │     │     └─► Done
  │     │
  │     └─► Return
  │
End
```

### Interactive Session

```
Start
  │
  ├─► startSession()
  │     │
  │     ├─► Generate sessionId
  │     │
  │     ├─► spawn('claude')
  │     │     │
  │     │     ├─► stdin.write(command)
  │     │     │
  │     │     ├─► Store in activeSessions Map
  │     │     │
  │     │     └─► Return sessionId
  │     │
  │     └─► Emit 'session-started'
  │
  ├─► sendInput(sessionId, input)
  │     │
  │     ├─► Get session from Map
  │     │
  │     └─► stdin.write(input)
  │
  ├─► terminateSession(sessionId)
  │     │
  │     ├─► Get session from Map
  │     │
  │     ├─► process.kill('SIGTERM')
  │     │
  │     └─► Delete from Map
  │
End
```

---

## Network Architecture

### Local Network Setup

```
┌─────────────────────────────────────────────────┐
│            Home WiFi Network                    │
│         (e.g., 192.168.1.0/24)                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────┐           ┌──────────────┐   │
│  │   Router     │           │  Firewall    │   │
│  └──────┬───────┘           └──────┬───────┘   │
│         │                          │           │
│    ┌────┴─────────────────────────┴────┐      │
│    │                                    │      │
│    │                                    │      │
│  ┌─▼────────────┐          ┌───────────▼──┐   │
│  │   Desktop    │          │    Mobile    │   │
│  │ 192.168.1.100│          │192.168.1.50  │   │
│  │  Port 3456   │◄────────►│   Client     │   │
│  └──────────────┘          └──────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Connection:**
- Desktop agent binds to `0.0.0.0:3456` (all interfaces)
- Mobile connects to `http://192.168.1.100:3456`
- WebSocket upgrade on same connection
- Real-time bidirectional communication

---

## Session Management

### Session States

```
┌──────────┐
│  Idle    │
└────┬─────┘
     │ startSession()
     ▼
┌──────────┐
│  Active  │
└────┬─────┘
     │
     ├─► sendInput() ──┐
     │                 │
     │◄────────────────┘
     │
     │ terminateSession() or on('exit')
     ▼
┌──────────┐
│  Ended   │
└──────────┘
```

### Session Storage

```javascript
// Map structure
activeSessions: Map {
  'session-1' => {
    process: ChildProcess,
    command: 'Initial command',
    startTime: '2025-12-17T12:00:00.000Z'
  },
  'session-2' => {
    process: ChildProcess,
    command: 'Another command',
    startTime: '2025-12-17T12:01:00.000Z'
  }
}
```

---

## Error Handling

### Error Flow

```
Error Occurs
  │
  ├─► Process Error
  │     │
  │     ├─► claudeProcess.on('error')
  │     │     │
  │     │     └─► Emit 'command-error'
  │     │
  │     └─► Client receives error
  │
  ├─► Network Error
  │     │
  │     ├─► Socket disconnect
  │     │     │
  │     │     └─► Update UI status
  │     │
  │     └─► Auto-reconnect (client-side)
  │
  └─► API Error
        │
        ├─► try/catch block
        │     │
        │     └─► Return error response
        │
        └─► Client handles error
```

---

## Security Layers

```
┌─────────────────────────────────────┐
│         Application Layer           │
│  • No authentication (dev only)     │
│  • CORS enabled for all origins     │
│  • No rate limiting                 │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│         Transport Layer             │
│  • HTTP (no encryption)             │
│  • WebSocket (no TLS)               │
│  • Plain text communication         │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│         Network Layer               │
│  • Local network only (recommended) │
│  • Firewall protection              │
│  • Router NAT                       │
└─────────────────────────────────────┘
```

**Recommendations:**
- Use on trusted networks only
- Add authentication for production
- Implement HTTPS/WSS
- Add rate limiting
- Implement user sessions

---

## Performance Characteristics

### Latency

```
User Action → Mobile UI: ~10ms
Mobile UI → Network: ~10ms
Network → Desktop: ~20ms (local WiFi)
Desktop → Claude Spawn: ~100ms
Claude Processing: ~1-5s (varies)
Claude → Desktop: ~10ms
Desktop → Network: ~20ms
Network → Mobile: ~10ms
Mobile → UI Update: ~10ms

Total: ~1.2-5.2s (depends on Claude)
```

### Throughput

```
WebSocket:
- Connection: Persistent
- Bandwidth: Minimal (<1KB per message)
- Concurrent: Unlimited clients supported

HTTP:
- Connection: Request/response
- Bandwidth: Minimal (<1KB per request)
- Concurrent: Node.js default limits

Process:
- Memory: ~50MB base + Claude processes
- CPU: Minimal (event-driven)
- Disk: None (no persistence)
```

---

## Scaling Considerations

### Current Implementation (Single Process)

```
           ┌───────────┐
           │  Desktop  │
           │   Agent   │
           └─────┬─────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼───┐    ┌──▼───┐    ┌──▼───┐
│Client1│    │Client2│    │Client3│
└───────┘    └──────┘    └──────┘
```

**Limitations:**
- Single point of failure
- All load on one process
- Memory scales with concurrent sessions

**Suitable for:**
- Personal use
- Small team (5-10 users)
- Development/testing

### Future Scaling (If Needed)

```
      ┌──────────────┐
      │ Load Balancer│
      └──────┬───────┘
             │
    ┌────────┼────────┐
┌───▼───┐ ┌──▼───┐ ┌──▼───┐
│Agent 1│ │Agent 2│ │Agent 3│
└───┬───┘ └──┬───┘ └──┬───┘
    │        │        │
    └────────┼────────┘
             │
      ┌──────▼───────┐
      │   Database   │
      │  (Sessions)  │
      └──────────────┘
```

**Enhancements:**
- Multiple agent instances
- Load balancing
- Shared session storage
- Database for persistence

---

## File Organization

```
apps/desktop-simple/
├── src/                     # Source code
│   ├── server.js           # Main server (HTTP + WS)
│   ├── claude-relay.js     # Process manager
│   └── index.html          # Test UI
│
├── docs/                    # Documentation
│   ├── README.md
│   ├── QUICK_START.md
│   ├── USAGE.md
│   ├── PROJECT_SUMMARY.md
│   ├── DELIVERABLES.md
│   ├── ARCHITECTURE.md     # This file
│   └── INDEX.md
│
├── examples/                # Examples
│   └── example-client.html # Mobile client
│
├── tests/                   # Tests
│   └── test-server.js      # Automated tests
│
├── scripts/                 # Helper scripts
│   ├── start.bat           # Windows startup
│   └── verify.bat          # Installation check
│
└── config/                  # Configuration
    ├── package.json        # Dependencies
    └── .gitignore          # Git ignores
```

---

## Technology Stack

```
┌─────────────────────────────────────┐
│          Frontend (Mobile)          │
├─────────────────────────────────────┤
│ • JavaScript/TypeScript             │
│ • Socket.IO Client                  │
│ • React/React Native (optional)     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│       Backend (Desktop Agent)       │
├─────────────────────────────────────┤
│ • Node.js 16+ (ES Modules)          │
│ • Express 4.x (HTTP Server)         │
│ • Socket.IO 4.x (WebSocket)         │
│ • CORS 2.x (CORS Middleware)        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│         AI Layer (Claude)           │
├─────────────────────────────────────┤
│ • Claude Code CLI                   │
│ • Node.js child_process             │
└─────────────────────────────────────┘
```

---

## Deployment Architecture

### Development Setup

```
Developer Machine
├── Desktop Agent (running)
├── Mobile Browser (testing)
└── Claude CLI (installed)

Network: localhost/127.0.0.1
Security: None required
```

### Production Setup (Future)

```
Corporate Network
├── Desktop Agents (multiple machines)
├── Load Balancer (HAProxy/nginx)
├── Database (Session storage)
├── Mobile Clients (team members)
└── Monitoring (Logging/Metrics)

Network: VPN/Private network
Security: Auth + HTTPS/WSS
```

---

## Summary

### Key Architectural Decisions

1. **Express + Socket.IO**
   - Reason: Simple, proven, well-documented
   - Trade-off: Not the most performant, but sufficient

2. **Child Process (spawn)**
   - Reason: Direct CLI integration, minimal overhead
   - Trade-off: Blocking, but acceptable for this use case

3. **No Database**
   - Reason: Simplicity for v1.0
   - Trade-off: No persistence, lost on restart

4. **No Authentication**
   - Reason: Development use only
   - Trade-off: Not production-ready

5. **Single Process**
   - Reason: Simple deployment
   - Trade-off: Limited scalability

### Architecture Strengths

- ✅ Simple and easy to understand
- ✅ Minimal dependencies
- ✅ Fast development
- ✅ Easy to deploy
- ✅ Easy to test
- ✅ Cross-platform

### Architecture Limitations

- ⚠️ No authentication
- ⚠️ No encryption
- ⚠️ Single process (SPOF)
- ⚠️ No persistence
- ⚠️ Limited scalability

### Future Improvements

1. Add authentication layer
2. Implement HTTPS/WSS
3. Add database for sessions
4. Implement clustering
5. Add monitoring/logging
6. Rate limiting
7. Command history
8. File upload/download

---

**Version:** 1.0.0
**Last Updated:** 2025-12-17
