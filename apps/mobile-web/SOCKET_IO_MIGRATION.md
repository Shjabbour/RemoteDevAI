# Socket.IO Migration Instructions

This document describes the changes needed to convert app.js from raw WebSocket to Socket.IO.

## Changes Required:

### 1. Constructor (lines 3-9)
Replace:
```javascript
this.ws = null;
```

With:
```javascript
this.socket = null;
this.sessionId = this.generateSessionId();
```

Add after `this.isListening = false;`:
```javascript
this.serverUrl = null;
```

### 2. Add generateSessionId method (after constructor, before init method)
```javascript
generateSessionId() {
    return 'mobile-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}
```

### 3. Update loadSettings method (around line 35)
Add else clause:
```javascript
} else {
    // Default to current host if no saved IP
    this.elements.serverIp.value = window.location.host;
}
```

### 4. Update autoConnect method (around line 147)
Replace entire method with:
```javascript
autoConnect() {
    let serverIp = localStorage.getItem('serverIp');

    // If no saved IP, use current window location
    if (!serverIp) {
        serverIp = window.location.host;
        this.elements.serverIp.value = serverIp;
    }

    if (serverIp) {
        this.connect(serverIp);
    }
}
```

### 5. Add loadSocketIO method (before connect method)
```javascript
loadSocketIO(serverUrl, callback) {
    // Check if Socket.IO is already loaded
    if (window.io) {
        callback();
        return;
    }

    // Dynamically load Socket.IO client from server
    const script = document.createElement('script');
    script.src = serverUrl + '/socket.io/socket.io.js';
    script.onload = () => {
        console.log('Socket.IO client loaded');
        callback();
    };
    script.onerror = (error) => {
        console.error('Failed to load Socket.IO client:', error);
        this.updateStatus('disconnected');
        this.addSystemMessage('Failed to load Socket.IO client. Check server connection.');
    };
    document.head.appendChild(script);
}
```

### 6. Replace connect method entirely (around line 154)
```javascript
connect(serverIp) {
    if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
    }

    // Clean up server IP (remove protocol if present)
    serverIp = serverIp.replace(/^(ws|wss|http|https):\/\//, '');

    // Build server URL with http protocol
    this.serverUrl = `http://${serverIp}`;

    this.updateStatus('connecting');
    this.addSystemMessage('Connecting to ' + serverIp + '...');

    // Load Socket.IO client and then connect
    this.loadSocketIO(this.serverUrl, () => {
        try {
            // Create Socket.IO connection
            this.socket = io(this.serverUrl, {
                transports: ['websocket', 'polling'],
                reconnection: false // We handle reconnection manually
            });

            this.setupSocketHandlers();

        } catch (error) {
            console.error('Connection error:', error);
            this.updateStatus('disconnected');
            this.addSystemMessage('Failed to connect: ' + error.message);
        }
    });
}
```

### 7. Add new setupSocketHandlers method (after connect method)
```javascript
setupSocketHandlers() {
    // Connection successful
    this.socket.on('connect', () => {
        console.log('Socket.IO connected');
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
        this.addSystemMessage('Connected to RemoteDevAI');
        this.clearWelcomeMessage();
    });

    // Command output
    this.socket.on('command-output', (data) => {
        this.hideTypingIndicator();
        if (data.output) {
            this.appendToLastMessage(data.output);
        }
    });

    // Command error
    this.socket.on('command-error', (data) => {
        this.hideTypingIndicator();
        this.addSystemMessage('Error: ' + (data.error || 'Unknown error'));
    });

    // Command complete
    this.socket.on('command-complete', (data) => {
        this.hideTypingIndicator();
        if (data.output) {
            this.addMessage('assistant', data.output);
        }
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        this.updateStatus('disconnected');
    });

    // Disconnection
    this.socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', reason);
        this.updateStatus('disconnected');
        this.addSystemMessage('Disconnected from server');

        // Schedule reconnect if not a manual disconnect
        if (reason !== 'io client disconnect') {
            const savedIp = localStorage.getItem('serverIp') || window.location.host;
            this.scheduleReconnect(savedIp);
        }
    });
}
```

### 8. DELETE handleMessage method entirely (around line 260-290)
Remove the entire `handleMessage(data)` method as it's no longer needed.

### 9. Replace sendMessage method (around line 234)
Replace WebSocket check and send:
```javascript
if (!this.socket || !this.socket.connected) {
    this.addSystemMessage('Not connected to server');
    return;
}

// Add user message to UI
this.addMessage('user', text);

// Send command to server using Socket.IO
this.socket.emit('execute-command', {
    command: text,
    sessionId: this.sessionId
});
```

### 10. Update error message in scheduleReconnect (around line 201)
Change:
```javascript
this.addSystemMessage('Max reconnection attempts reached. Tap ⚙️ to reconnect manually.');
```
To:
```javascript
this.addSystemMessage('Max reconnection attempts reached. Tap settings to reconnect manually.');
```

## Summary of Changes:
- Replaced `this.ws` with `this.socket`
- Added `sessionId` generation
- Dynamically load Socket.IO client from server
- Use Socket.IO events instead of WebSocket messages
- Listen for 'command-output', 'command-error', 'command-complete' events
- Use `socket.emit('execute-command', {...})` instead of ws.send()
- Auto-connect to window.location.host if no saved IP
- Removed handleMessage method (Socket.IO handles events differently)
