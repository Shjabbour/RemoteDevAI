// RemoteDevAI Mobile Web Client
class RemoteDevAI {
    constructor() {
        this.ws = null;
        this.reconnectTimeout = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.recognition = null;
        this.isListening = false;

        this.elements = {
            messagesContainer: document.getElementById('messagesContainer'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            voiceBtn: document.getElementById('voiceBtn'),
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.querySelector('.status-text'),
            settingsBtn: document.getElementById('settingsBtn'),
            settingsPanel: document.getElementById('settingsPanel'),
            serverIp: document.getElementById('serverIp'),
            saveSettings: document.getElementById('saveSettings'),
            closeSettings: document.getElementById('closeSettings')
        };

        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.setupSpeechRecognition();
        this.autoConnect();
    }

    loadSettings() {
        const savedIp = localStorage.getItem('serverIp');
        if (savedIp) {
            this.elements.serverIp.value = savedIp;
        }
    }

    saveSettings() {
        const serverIp = this.elements.serverIp.value.trim();
        if (serverIp) {
            localStorage.setItem('serverIp', serverIp);
            this.connect(serverIp);
        }
    }

    setupEventListeners() {
        // Send message
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.elements.messageInput.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
        });

        // Voice input
        this.elements.voiceBtn.addEventListener('click', () => this.toggleVoiceInput());

        // Settings
        this.elements.settingsBtn.addEventListener('click', () => this.showSettings());
        this.elements.closeSettings.addEventListener('click', () => this.hideSettings());
        this.elements.saveSettings.addEventListener('click', () => {
            this.saveSettings();
            this.hideSettings();
        });

        // Close settings on background click
        this.elements.settingsPanel.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsPanel) {
                this.hideSettings();
            }
        });
    }

    showSettings() {
        this.elements.settingsPanel.classList.add('show');
    }

    hideSettings() {
        this.elements.settingsPanel.classList.remove('show');
    }

    setupSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            this.elements.voiceBtn.style.display = 'none';
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.elements.voiceBtn.classList.add('listening');
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.elements.voiceBtn.classList.remove('listening');
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.elements.messageInput.value = transcript;
            this.elements.messageInput.focus();
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            this.elements.voiceBtn.classList.remove('listening');

            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                this.addSystemMessage('Voice input error: ' + event.error);
            }
        };
    }

    toggleVoiceInput() {
        if (!this.recognition) return;

        if (this.isListening) {
            this.recognition.stop();
        } else {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Failed to start recognition:', error);
            }
        }
    }

    autoConnect() {
        const savedIp = localStorage.getItem('serverIp');
        if (savedIp) {
            this.connect(savedIp);
        }
    }

    connect(serverIp) {
        if (this.ws) {
            this.ws.close();
        }

        // Clean up server IP (remove protocol if present)
        serverIp = serverIp.replace(/^(ws|http|https):\/\//, '');

        const wsUrl = `ws://${serverIp}`;

        this.updateStatus('connecting');
        this.addSystemMessage('Connecting to ' + serverIp + '...');

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                this.reconnectAttempts = 0;
                this.updateStatus('connected');
                this.addSystemMessage('Connected to RemoteDevAI');
                this.clearWelcomeMessage();
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateStatus('disconnected');
            };

            this.ws.onclose = () => {
                this.updateStatus('disconnected');
                this.addSystemMessage('Disconnected from server');
                this.scheduleReconnect(serverIp);
            };

        } catch (error) {
            console.error('Connection error:', error);
            this.updateStatus('disconnected');
            this.addSystemMessage('Failed to connect: ' + error.message);
        }
    }

    scheduleReconnect(serverIp) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.addSystemMessage('Max reconnection attempts reached. Tap ⚙️ to reconnect manually.');
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;

        this.addSystemMessage(`Reconnecting in ${delay / 1000}s... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        this.reconnectTimeout = setTimeout(() => {
            this.connect(serverIp);
        }, delay);
    }

    updateStatus(status) {
        this.elements.statusIndicator.className = 'status-indicator ' + status;

        const statusTexts = {
            connected: 'Connected',
            connecting: 'Connecting...',
            disconnected: 'Disconnected'
        };

        this.elements.statusText.textContent = statusTexts[status] || 'Unknown';
    }

    clearWelcomeMessage() {
        const welcomeMsg = this.elements.messagesContainer.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }
    }

    sendMessage() {
        const text = this.elements.messageInput.value.trim();
        if (!text) return;

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.addSystemMessage('Not connected to server');
            return;
        }

        // Add user message to UI
        this.addMessage('user', text);

        // Send to server
        this.ws.send(JSON.stringify({
            type: 'command',
            content: text
        }));

        // Clear input
        this.elements.messageInput.value = '';
        this.elements.messageInput.style.height = 'auto';

        // Show typing indicator
        this.showTypingIndicator();
    }

    handleMessage(data) {
        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'response':
                    this.hideTypingIndicator();
                    this.addMessage('assistant', message.content);
                    break;

                case 'stream':
                    this.hideTypingIndicator();
                    this.appendToLastMessage(message.content);
                    break;

                case 'error':
                    this.hideTypingIndicator();
                    this.addSystemMessage('Error: ' + message.content);
                    break;

                case 'status':
                    this.addSystemMessage(message.content);
                    break;

                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Failed to parse message:', error);
        }
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;

        bubbleDiv.appendChild(contentDiv);
        messageDiv.appendChild(bubbleDiv);

        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();

        return messageDiv;
    }

    addSystemMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message system';

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        bubbleDiv.textContent = content;

        messageDiv.appendChild(bubbleDiv);
        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        // Remove existing indicator
        this.hideTypingIndicator();

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant typing-indicator-container';
        messageDiv.id = 'typingIndicator';

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';

        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';

        bubbleDiv.appendChild(typingDiv);
        messageDiv.appendChild(bubbleDiv);

        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    appendToLastMessage(content) {
        const messages = this.elements.messagesContainer.querySelectorAll('.message.assistant:not(.typing-indicator-container)');
        let lastMessage = messages[messages.length - 1];

        if (!lastMessage) {
            lastMessage = this.addMessage('assistant', '');
        }

        const contentDiv = lastMessage.querySelector('.message-content');
        contentDiv.textContent += content;

        this.scrollToBottom();
    }

    scrollToBottom() {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new RemoteDevAI();
    });
} else {
    new RemoteDevAI();
}
