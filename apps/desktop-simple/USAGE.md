# RemoteDevAI Desktop Agent - Usage Guide

## Getting Started

### 1. Start the Desktop Agent

**Windows:**
```bash
# Option 1: Double-click start.bat
start.bat

# Option 2: Run via npm
npm start
```

**macOS/Linux:**
```bash
npm start
```

You'll see output like:
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
```

### 2. Test on Desktop Browser

1. Open `http://localhost:3456` in your browser
2. You should see the RemoteDevAI Desktop Agent test interface
3. Try the quick commands or type your own
4. Watch real-time output stream

### 3. Connect from Mobile

1. Make sure your phone is on the same WiFi network as your PC
2. Use one of the "Network access" URLs shown in the terminal
3. Your mobile app should connect via WebSocket to this URL

## WebSocket API

### Connection

```javascript
import io from 'socket.io-client';

const socket = io('http://192.168.1.100:3456');

socket.on('connect', () => {
  console.log('Connected to desktop agent');
});

socket.on('connected', (data) => {
  console.log('Session info:', data);
  // {
  //   message: 'Connected to RemoteDevAI Desktop Agent',
  //   sessionId: 'abc123',
  //   timestamp: '2025-12-17T...',
  //   localIPs: ['192.168.1.100'],
  //   hostname: 'MY-PC'
  // }
});
```

### Execute One-Off Command

```javascript
// Send command
socket.emit('execute-command', {
  command: 'List all files in this directory'
});

// Receive output
socket.on('command-output', (data) => {
  console.log('Output:', data.data);
  // data.type: 'stdout' | 'stderr'
  // data.data: actual text output
  // data.timestamp: ISO timestamp
});

// Receive errors
socket.on('command-error', (data) => {
  console.error('Error:', data.data);
});

// Command complete
socket.on('command-complete', (data) => {
  console.log('Finished with exit code:', data.code);
});
```

### Interactive Session (Advanced)

```javascript
// Start interactive session
socket.emit('start-session', {
  command: 'Help me debug this React component'
});

// Session started
socket.on('session-started', (data) => {
  console.log('Session ID:', data.sessionId);
});

// Receive session output
socket.on('session-output', (data) => {
  console.log('[Session]', data.data);
});

// Send follow-up input
socket.emit('session-input', {
  sessionId: 'session-123',
  input: 'Show me the component code'
});

// Session ends
socket.on('session-exit', (data) => {
  console.log('Session ended:', data.code);
});

// Terminate session manually
socket.emit('terminate-session', {
  sessionId: 'session-123'
});
```

## REST API

### Health Check

```bash
curl http://localhost:3456/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-17T12:00:00.000Z",
  "activeSessions": 0,
  "uptime": 123.45,
  "platform": "win32",
  "hostname": "MY-PC",
  "localIPs": ["192.168.1.100", "10.0.0.50"]
}
```

### Send Command via HTTP

```bash
curl -X POST http://localhost:3456/api/send-command \
  -H "Content-Type: application/json" \
  -d '{"command": "What files are here?"}'
```

Response:
```json
{
  "success": true,
  "message": "Command queued for execution",
  "timestamp": "2025-12-17T12:00:00.000Z"
}
```

Output will be streamed via WebSocket to all connected clients.

### Working Directory

**Get current working directory:**
```bash
curl http://localhost:3456/api/cwd
```

Response:
```json
{
  "cwd": "C:\\Users\\Charbel\\Desktop\\project",
  "home": "C:\\Users\\Charbel"
}
```

**Set working directory:**
```bash
curl -X POST http://localhost:3456/api/cwd \
  -H "Content-Type: application/json" \
  -d '{"path": "C:\\Users\\Charbel\\Desktop\\myproject"}'
```

Response:
```json
{
  "success": true,
  "cwd": "C:\\Users\\Charbel\\Desktop\\myproject"
}
```

## Mobile Integration Example

### React Native Example

```typescript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function ClaudeRemote() {
  const [socket, setSocket] = useState(null);
  const [output, setOutput] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connect to desktop agent
    const newSocket = io('http://192.168.1.100:3456');

    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('command-output', (data) => {
      setOutput(prev => [...prev, {
        type: 'output',
        text: data.data,
        timestamp: data.timestamp
      }]);
    });

    newSocket.on('command-error', (data) => {
      setOutput(prev => [...prev, {
        type: 'error',
        text: data.data,
        timestamp: data.timestamp
      }]);
    });

    newSocket.on('command-complete', (data) => {
      setOutput(prev => [...prev, {
        type: 'complete',
        text: `Command finished (exit code: ${data.code})`,
        timestamp: data.timestamp
      }]);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const sendCommand = (command) => {
    if (socket && connected) {
      socket.emit('execute-command', { command });
      setOutput(prev => [...prev, {
        type: 'input',
        text: command,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  return (
    <View>
      <Text>Status: {connected ? 'Connected' : 'Disconnected'}</Text>

      <ScrollView>
        {output.map((item, i) => (
          <Text key={i} style={{ color: item.type === 'error' ? 'red' : 'white' }}>
            {item.text}
          </Text>
        ))}
      </ScrollView>

      <TextInput
        onSubmitEditing={(e) => sendCommand(e.nativeEvent.text)}
        placeholder="Ask Claude..."
      />
    </View>
  );
}
```

## Environment Variables

Create a `.env` file in the desktop-simple directory:

```env
# Server configuration
PORT=3456

# Claude working directory
CLAUDE_CWD=C:\Users\Charbel\Desktop\myproject
```

## Troubleshooting

### Claude Command Not Found

**Problem:** "claude: command not found" or similar error

**Solution:**
1. Install Claude Code CLI: `npm install -g @anthropic-ai/claude-code`
2. Verify installation: `claude --version`
3. Restart terminal and desktop agent

### Mobile Can't Connect

**Problem:** Mobile app shows "Disconnected" or connection timeout

**Solutions:**
1. Ensure PC and phone are on same WiFi network
2. Check Windows Firewall:
   - Open Windows Defender Firewall
   - Click "Allow an app through firewall"
   - Allow Node.js on Private networks
3. Try different IP address from the list shown
4. Disable VPN if active on either device
5. Test with desktop browser first

### No Output Streaming

**Problem:** Commands execute but no output appears

**Solutions:**
1. Check browser console for errors
2. Verify WebSocket connection status (should show "Connected")
3. Try refreshing the page
4. Check that Claude CLI is properly installed
5. Try a simple command like "/help"

### Port Already in Use

**Problem:** "Error: listen EADDRINUSE: address already in use :::3456"

**Solutions:**
1. Stop other instance of desktop agent
2. Change port: `PORT=3457 npm start`
3. Kill process using port:
   ```bash
   # Windows
   netstat -ano | findstr :3456
   taskkill /PID <PID> /F

   # macOS/Linux
   lsof -ti:3456 | xargs kill
   ```

## Advanced Usage

### Custom Port

```bash
PORT=8080 npm start
```

### Set Working Directory

```bash
CLAUDE_CWD=/path/to/project npm start
```

### Background Process (Linux/macOS)

```bash
nohup npm start > desktop-agent.log 2>&1 &
```

### Auto-start on Boot (Windows)

1. Create shortcut to `start.bat`
2. Press Win+R, type `shell:startup`, press Enter
3. Move shortcut to Startup folder

## Security Considerations

- **Network Security:** Only use on trusted networks (home WiFi, not public WiFi)
- **No Authentication:** This version has no auth - anyone on network can connect
- **Command Execution:** Claude runs with your user permissions
- **Development Only:** Not intended for production use
- **Firewall:** Consider firewall rules to restrict access

## Next Steps

- **Mobile App Integration:** Use the WebSocket API to connect your mobile app
- **Authentication:** Add token-based auth for production use
- **HTTPS:** Set up SSL/TLS for secure communication
- **Multi-User:** Implement user sessions and isolation
- **Database:** Store command history and session data

## Support

For issues or questions:
1. Check this guide first
2. Review the README.md
3. Test with the web interface at `http://localhost:3456`
4. Check Claude Code CLI installation

## Example Commands

**File Operations:**
- "List all files in this directory"
- "Show me the contents of package.json"
- "Find all TypeScript files in src/"

**Git Operations:**
- "Show git status"
- "What's in the latest commit?"
- "Show me uncommitted changes"

**Code Analysis:**
- "Explain what this project does"
- "Find all TODO comments"
- "Show me the main entry point"

**Development:**
- "Run npm install"
- "What npm scripts are available?"
- "Check for TypeScript errors"

**Interactive:**
- "Help me debug this React component"
- "Review my code changes"
- "Suggest improvements to this function"
