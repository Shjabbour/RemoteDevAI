# RemoteDevAI Desktop Agent (Simple)

A lightweight desktop agent that relays commands to Claude Code CLI and streams output to mobile clients in real-time.

## Features

- **Simple Express + Socket.IO server** running on your PC
- **WebSocket-based real-time communication** with mobile clients
- **Claude Code CLI integration** - spawns and manages Claude processes
- **Output streaming** - real-time stdout/stderr streaming to clients
- **Network discovery** - automatically shows local IP addresses for mobile connection
- **Test interface** - built-in web UI for testing

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The server will start on port 3456 and display connection URLs:

```
=================================================
  RemoteDevAI Desktop Agent - RUNNING
=================================================

Server started on port 3456

Local access:
  http://localhost:3456

Network access (connect from mobile):
  http://192.168.1.100:3456
  http://10.0.0.50:3456

=================================================

Test page: Open any URL above in your browser
Mobile app: Connect to any network URL from your phone
```

## Usage

### From Web Browser (Testing)

1. Open `http://localhost:3456` in your browser
2. Type a command for Claude (e.g., "List all files in this directory")
3. Click "Send Command" or press Enter
4. Watch the output stream in real-time

### From Mobile App

Connect to the desktop agent using one of the network URLs (e.g., `http://192.168.1.100:3456`).

**WebSocket Events:**

**Client → Server:**
- `execute-command` - Execute a one-off command
  ```javascript
  socket.emit('execute-command', { command: 'What files are here?' });
  ```

- `start-session` - Start an interactive Claude session
  ```javascript
  socket.emit('start-session', { command: 'Help me debug this code' });
  ```

- `session-input` - Send input to active session
  ```javascript
  socket.emit('session-input', { sessionId, input: 'Show me the logs' });
  ```

- `terminate-session` - End an active session
  ```javascript
  socket.emit('terminate-session', { sessionId });
  ```

**Server → Client:**
- `connected` - Connection established
- `command-output` - Command stdout output
- `command-error` - Command stderr output
- `command-complete` - Command finished
- `session-started` - Interactive session started
- `session-output` - Session output stream
- `session-error` - Session error
- `session-exit` - Session ended

### REST API

**Health Check:**
```bash
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-17T...",
  "activeSessions": 0,
  "uptime": 123.45,
  "platform": "win32",
  "hostname": "MY-PC",
  "localIPs": ["192.168.1.100"]
}
```

**Send Command:**
```bash
POST /api/send-command
Content-Type: application/json

{
  "command": "List all files"
}
```

Response:
```json
{
  "success": true,
  "message": "Command queued for execution",
  "timestamp": "2025-12-17T..."
}
```

**Get/Set Working Directory:**
```bash
GET /api/cwd
POST /api/cwd
Content-Type: application/json

{
  "path": "/path/to/project"
}
```

## Architecture

```
Mobile Client (Phone)
    ↓ WebSocket
Desktop Agent (PC)
    ↓ Child Process
Claude Code CLI
    ↓ AI Processing
Response Stream
    ↓ WebSocket
Mobile Client (Phone)
```

## Files

- `src/server.js` - Main Express + Socket.IO server
- `src/claude-relay.js` - Claude CLI process manager
- `src/index.html` - Test web interface
- `package.json` - Dependencies and scripts

## Requirements

- Node.js 16+ (ES modules support)
- Claude Code CLI installed and in PATH
- Network connectivity between PC and mobile device

## Environment Variables

```bash
PORT=3456                    # Server port (default: 3456)
CLAUDE_CWD=/path/to/project  # Working directory for Claude CLI
```

## Troubleshooting

**Command not found: claude**
- Ensure Claude Code CLI is installed
- Add Claude to your system PATH
- Restart terminal/server after installation

**Mobile can't connect:**
- Ensure PC and phone are on same network
- Check firewall allows port 3456
- Try different network URL from the list
- Disable VPN if active

**No output streaming:**
- Check browser console for WebSocket errors
- Verify Socket.IO connection status
- Try refreshing the page

## Development

```bash
# Watch mode (auto-restart on file changes)
npm run dev
```

## Security Notes

- This is a **development tool** - not for production use
- No authentication implemented
- Accepts connections from any origin
- Claude CLI runs with your user permissions
- Use only on trusted networks

## License

MIT
