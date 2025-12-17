// RemoteDevAI Mobile Web Client - Socket.IO Version
class RemoteDevAI {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.recognition = null;
        this.isListening = false;
        this.currentStreamMessage = null;

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
        } else {
            const currentHost = window.location.host;
            if (currentHost) {
                this.elements.serverIp.value = currentHost;
            }
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
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.elements.messageInput.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
        });

        this.elements.voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
        this.elements.settingsBtn.addEventListener('click', () => this.showSettings());
        this.elements.closeSettings.addEventListener('click', () => this.hideSettings());
        this.elements.saveSettings.addEventListener('click', () => {
            this.saveSettings();
            this.hideSettings();
        });

        this.elements.settingsPanel.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsPanel) {
                this.hideSettings();
            }
        });
    }

    showSettings() { this.elements.settingsPanel.classList.add('show'); }
    hideSettings() { this.elements.settingsPanel.classList.remove('show'); }

    setupSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
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
            this.sendMessage();
        };

        this.recognition.onerror = (event) => {
            this.isListening = false;
            this.elements.voiceBtn.classList.remove('listening');
        };
    }

    toggleVoiceInput() {
        if (!this.recognition) return;
        if (this.isListening) {
            this.recognition.stop();
        } else {
            try { this.recognition.start(); } catch (e) {}
        }
    }

    autoConnect() {
        const savedIp = localStorage.getItem('serverIp');
        if (savedIp) {
            this.connect(savedIp);
        } else {
            const currentHost = window.location.host;
            if (currentHost) this.connect(currentHost);
        }
    }

    connect(serverIp) {
        if (this.socket) this.socket.disconnect();

        serverIp = serverIp.replace(/^(ws|wss|http|https):\/\//, '');
        const serverUrl = 'http://' + serverIp;

        this.updateStatus('connecting');
        this.addSystemMessage('Connecting to ' + serverIp + '...');

        if (typeof io === 'undefined') {
            const script = document.createElement('script');
            script.src = serverUrl + '/socket.io/socket.io.js';
            script.onload = () => this.initSocket(serverUrl);
            script.onerror = () => {
                this.updateStatus('disconnected');
                this.addSystemMessage('Server not found. Is it running?');
            };
            document.head.appendChild(script);
        } else {
            this.initSocket(serverUrl);
        }
    }

    initSocket(serverUrl) {
        this.socket = io(serverUrl, {
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            this.reconnectAttempts = 0;
            this.updateStatus('connected');
            this.addSystemMessage('Connected to RemoteDevAI!');
            this.clearWelcomeMessage();
        });

        this.socket.on('connected', (data) => {
            this.addSystemMessage('Ready on ' + data.hostname);
        });

        this.socket.on('command-output', (data) => {
            this.appendToStream(data.data);
        });

        this.socket.on('command-error', (data) => {
            this.appendToStream(data.data, 'error');
        });

        this.socket.on('command-complete', (data) => {
            this.finalizeStream();
            if (data.code !== 0) this.addSystemMessage('Exit code: ' + data.code);
        });

        this.socket.on('disconnect', () => {
            this.updateStatus('disconnected');
            this.addSystemMessage('Disconnected');
        });

        this.socket.on('connect_error', () => this.updateStatus('disconnected'));
    }

    updateStatus(status) {
        this.elements.statusIndicator.className = 'status-indicator ' + status;
        const texts = { connected: 'Connected', connecting: 'Connecting...', disconnected: 'Disconnected' };
        this.elements.statusText.textContent = texts[status] || 'Unknown';
    }

    clearWelcomeMessage() {
        const w = this.elements.messagesContainer.querySelector('.welcome-message');
        if (w) w.remove();
    }

    sendMessage() {
        const text = this.elements.messageInput.value.trim();
        if (!text) return;

        if (!this.socket || !this.socket.connected) {
            this.addSystemMessage('Not connected. Tap settings to connect.');
            return;
        }

        this.addMessage('user', text);
        this.elements.messageInput.value = '';
        this.elements.messageInput.style.height = 'auto';
        this.currentStreamMessage = this.createStreamMessage();

        this.socket.emit('execute-command', {
            command: text,
            sessionId: Date.now().toString()
        });
    }

    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + role;
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

    createStreamMessage() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant streaming';
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        const contentPre = document.createElement('pre');
        contentPre.className = 'stream-content';
        bubbleDiv.appendChild(contentPre);
        messageDiv.appendChild(bubbleDiv);
        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        return contentPre;
    }

    appendToStream(data, type = 'output') {
        if (!this.currentStreamMessage) this.currentStreamMessage = this.createStreamMessage();
        const span = document.createElement('span');
        if (type === 'error') span.className = 'error-text';
        span.textContent = data;
        this.currentStreamMessage.appendChild(span);
        this.scrollToBottom();
    }

    finalizeStream() {
        if (this.currentStreamMessage) {
            this.currentStreamMessage.parentElement.parentElement.classList.remove('streaming');
            this.currentStreamMessage = null;
        }
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

    scrollToBottom() {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }
}

document.addEventListener('DOMContentLoaded', () => new RemoteDevAI());
