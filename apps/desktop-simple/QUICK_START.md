# Quick Start - RemoteDevAI Desktop Agent

## 60-Second Setup

### 1. Install & Start (30 seconds)

```bash
cd C:/Users/Charbel/Desktop/github/Shjabbour/RemoteDevAI/apps/desktop-simple
npm install
npm start
```

### 2. Test in Browser (15 seconds)

Open: `http://localhost:3456`

Try command: "List all files in this directory"

### 3. Connect from Phone (15 seconds)

Use the IP shown in terminal (e.g., `http://192.168.1.100:3456`)

**Done!** You're now controlling Claude Code from your phone.

---

## Mobile Client - Minimal Code

```javascript
import io from 'socket.io-client';

// 1. Connect
const socket = io('http://192.168.1.100:3456');

// 2. Send command
socket.emit('execute-command', {
  command: 'What files are in this directory?'
});

// 3. Receive output
socket.on('command-output', (data) => {
  console.log(data.data); // Claude's response
});

socket.on('command-complete', (data) => {
  console.log('Done!');
});
```

That's it! Just 3 steps.

---

## API Quick Reference

### WebSocket Events

**Send:**
- `execute-command` → Run Claude command
- `start-session` → Start interactive session
- `session-input` → Send follow-up input
- `terminate-session` → End session

**Receive:**
- `connected` → Connection info
- `command-output` → Claude's response (stdout)
- `command-error` → Error messages (stderr)
- `command-complete` → Command finished

### REST Endpoints

```bash
# Health check
GET /api/health

# Send command
POST /api/send-command
{ "command": "..." }

# Get/Set working directory
GET /api/cwd
POST /api/cwd
{ "path": "/path/to/project" }
```

---

## Example Commands

```javascript
// File operations
socket.emit('execute-command', { command: 'Show me package.json' });

// Git operations
socket.emit('execute-command', { command: 'What changed in the last commit?' });

// Code analysis
socket.emit('execute-command', { command: 'Explain this project structure' });

// Development
socket.emit('execute-command', { command: 'Find all TODO comments' });
```

---

## Troubleshooting

**Can't connect from phone?**
1. Same WiFi network?
2. Firewall blocking port 3456?
3. Try different IP from the list

**Claude not found?**
```bash
npm install -g @anthropic-ai/claude-code
```

**Port in use?**
```bash
PORT=3457 npm start
```

---

## Files

- `src/server.js` - Main server
- `src/claude-relay.js` - Claude CLI integration
- `src/index.html` - Test interface
- `example-client.html` - Mobile client example

---

## Next Steps

1. Read `USAGE.md` for detailed documentation
2. Check `example-client.html` for mobile UI reference
3. Integrate WebSocket client into your mobile app
4. Start coding with Claude on the go!

---

## Security Note

**For development only!** No authentication. Use on trusted networks only.

---

**Questions?** Check `README.md` and `USAGE.md` for details.
