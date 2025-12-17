// RemoteDevAI Mobile Web Client - Production Version 2.0
class RemoteDevAI {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 1000;
        this.recognition = null;
        this.isListening = false;
        this.currentStreamMessage = null;
        this.heartbeatInterval = null;
        this.lastHeartbeat = null;

        // Screen state
        this.isStreaming = false;
        this.inputEnabled = true;
        this.screenSize = { width: 1920, height: 1080 };
        this.canvasCtx = null;
        this.frameImage = new Image();
        this.lastTouchTime = 0;
        this.touchStartPos = null;
        this.frameCount = 0;
        this.lastFpsUpdate = Date.now();
        this.currentFps = 0;

        // Relay connection state
        this.pairingCode = null;
        this.relayUrl = null;
        this.agentHostname = null;
        this.agentInfo = null;
        this.connectionState = 'disconnected'; // disconnected, connecting, awaiting_pairing, connected, error, reconnecting

        // Settings
        this.settings = {
            fps: 10,
            quality: 50,
            autoReconnect: true
        };

        // Network quality monitoring
        this.networkStats = {
            latency: 0,
            packetLoss: 0,
            lastCheck: Date.now()
        };

        // End-to-end encryption
        this.encryption = null;
        this.encryptionEnabled = false;

        this.elements = {};
        this.init();
    }

    init() {
        this.cacheElements();
        this.loadSettings();
        this.setupEventListeners();
        this.setupSpeechRecognition();
        this.setupCanvas();
        this.initEncryption();
        this.autoConnect();
    }

    async initEncryption() {
        try {
            if (typeof EncryptionContext !== 'undefined') {
                this.encryption = new EncryptionContext();
                console.log('[RemoteDevAI] Encryption module loaded');
            } else {
                console.warn('[RemoteDevAI] Encryption module not available');
            }
        } catch (error) {
            console.error('[RemoteDevAI] Failed to initialize encryption:', error);
        }
    }

    cacheElements() {
        this.elements = {
            // Status
            statusIndicator: document.getElementById('statusIndicator'),
            statusText: document.querySelector('.status-text'),
            // Pairing modal
            pairingModal: document.getElementById('pairingModal'),
            pairingCodeInput: document.getElementById('pairingCodeInput'),
            connectPairingBtn: document.getElementById('connectPairingBtn'),
            pairingError: document.getElementById('pairingError'),
            // Settings
            settingsBtn: document.getElementById('settingsBtn'),
            settingsPanel: document.getElementById('settingsPanel'),
            serverIp: document.getElementById('serverIp'),
            streamFps: document.getElementById('streamFps'),
            streamQuality: document.getElementById('streamQuality'),
            fpsValue: document.getElementById('fpsValue'),
            qualityValue: document.getElementById('qualityValue'),
            saveSettings: document.getElementById('saveSettings'),
            closeSettings: document.getElementById('closeSettings'),
            // Tabs
            tabBtns: document.querySelectorAll('.tab-btn'),
            tabContents: document.querySelectorAll('.tab-content'),
            // Screen
            screenContainer: document.getElementById('screenContainer'),
            screenPlaceholder: document.getElementById('screenPlaceholder'),
            screenCanvas: document.getElementById('screenCanvas'),
            screenOverlay: document.getElementById('screenOverlay'),
            cursorIndicator: document.getElementById('cursorIndicator'),
            screenToggleBtn: document.getElementById('screenToggleBtn'),
            fullscreenBtn: document.getElementById('fullscreenBtn'),
            inputToggleBtn: document.getElementById('inputToggleBtn'),
            keyboardBtn: document.getElementById('keyboardBtn'),
            displaySelect: document.getElementById('displaySelect'),
            hiddenKeyboardInput: document.getElementById('hiddenKeyboardInput'),
            // Terminal
            messagesContainer: document.getElementById('messagesContainer'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            voiceBtn: document.getElementById('voiceBtn'),
            // Voice
            voiceCircle: document.getElementById('voiceCircle'),
            voiceText: document.getElementById('voiceText'),
            voiceTranscript: document.getElementById('voiceTranscript'),
            voiceResponse: document.getElementById('voiceResponse')
        };
    }

    loadSettings() {
        const savedIp = localStorage.getItem('serverIp');
        const savedFps = localStorage.getItem('streamFps');
        const savedQuality = localStorage.getItem('streamQuality');

        if (savedIp) this.elements.serverIp.value = savedIp;
        else {
            const currentHost = window.location.host;
            if (currentHost) this.elements.serverIp.value = currentHost;
        }

        if (savedFps) {
            this.settings.fps = parseInt(savedFps);
            this.elements.streamFps.value = savedFps;
            this.elements.fpsValue.textContent = savedFps;
        }

        if (savedQuality) {
            this.settings.quality = parseInt(savedQuality);
            this.elements.streamQuality.value = savedQuality;
            this.elements.qualityValue.textContent = savedQuality;
        }
    }

    saveSettings() {
        const serverIp = this.elements.serverIp.value.trim();
        this.settings.fps = parseInt(this.elements.streamFps.value);
        this.settings.quality = parseInt(this.elements.streamQuality.value);

        localStorage.setItem('serverIp', serverIp);
        localStorage.setItem('streamFps', this.settings.fps);
        localStorage.setItem('streamQuality', this.settings.quality);

        if (serverIp) this.connect(serverIp);
    }

    setupEventListeners() {
        // Pairing modal
        this.elements.connectPairingBtn.addEventListener('click', () => this.submitPairingCode());
        this.elements.pairingCodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.submitPairingCode();
        });
        this.elements.pairingCodeInput.addEventListener('input', (e) => {
            // Format as uppercase, max 8 chars (alphanumeric only)
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
            this.elements.pairingError.style.display = 'none';
        });

        // Settings
        this.elements.settingsBtn.addEventListener('click', () => this.showSettings());
        this.elements.closeSettings.addEventListener('click', () => this.hideSettings());
        this.elements.saveSettings.addEventListener('click', () => {
            this.saveSettings();
            this.hideSettings();
        });
        this.elements.settingsPanel.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsPanel) this.hideSettings();
        });

        // Settings sliders
        this.elements.streamFps.addEventListener('input', (e) => {
            this.elements.fpsValue.textContent = e.target.value;
        });
        this.elements.streamQuality.addEventListener('input', (e) => {
            this.elements.qualityValue.textContent = e.target.value;
        });

        // Tabs
        this.elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Screen controls
        this.elements.screenToggleBtn.addEventListener('click', () => this.toggleScreenStream());
        this.elements.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.elements.inputToggleBtn.addEventListener('click', () => this.toggleInputControl());
        this.elements.keyboardBtn.addEventListener('click', () => this.showKeyboard());
        this.elements.displaySelect.addEventListener('change', (e) => this.selectDisplay(e.target.value));
        this.elements.screenPlaceholder.addEventListener('click', () => this.toggleScreenStream());

        // Screen input events
        this.setupScreenInputEvents();

        // Hidden keyboard input
        this.elements.hiddenKeyboardInput.addEventListener('input', (e) => {
            const text = e.target.value;
            if (text && this.socket?.connected) {
                this.socket.emit('input:type', { text });
            }
            e.target.value = '';
        });

        this.elements.hiddenKeyboardInput.addEventListener('keydown', (e) => {
            if (['Enter', 'Backspace', 'Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                if (this.socket?.connected) {
                    this.socket.emit('input:key', { key: e.key.toLowerCase() });
                }
            }
        });

        // Terminal input
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

        // Voice
        this.elements.voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
        this.elements.voiceCircle.addEventListener('click', () => this.toggleVoiceInput());
    }

    setupScreenInputEvents() {
        const container = this.elements.screenContainer;

        // Touch events for mobile
        container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        container.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        container.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        // Mouse events for desktop testing
        container.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        container.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        container.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        container.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        container.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    getNormalizedCoords(clientX, clientY) {
        const canvas = this.elements.screenCanvas;
        const rect = canvas.getBoundingClientRect();

        // Calculate position relative to canvas
        const x = (clientX - rect.left) / rect.width;
        const y = (clientY - rect.top) / rect.height;

        return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    }

    handleTouchStart(e) {
        if (!this.isStreaming || !this.inputEnabled) return;
        e.preventDefault();

        const touch = e.touches[0];
        this.touchStartPos = { x: touch.clientX, y: touch.clientY, time: Date.now() };

        const coords = this.getNormalizedCoords(touch.clientX, touch.clientY);
        this.showCursor(touch.clientX, touch.clientY);

        // Send mouse position
        if (this.socket?.connected) {
            this.socket.emit('input:mousemove', coords);
        }
    }

    handleTouchMove(e) {
        if (!this.isStreaming || !this.inputEnabled || !this.touchStartPos) return;
        e.preventDefault();

        const touch = e.touches[0];
        const coords = this.getNormalizedCoords(touch.clientX, touch.clientY);
        this.showCursor(touch.clientX, touch.clientY);

        if (this.socket?.connected) {
            this.socket.emit('input:mousemove', coords);
        }
    }

    handleTouchEnd(e) {
        if (!this.isStreaming || !this.inputEnabled || !this.touchStartPos) return;
        e.preventDefault();

        const now = Date.now();
        const touchDuration = now - this.touchStartPos.time;
        const coords = this.getNormalizedCoords(this.touchStartPos.x, this.touchStartPos.y);

        // Detect tap vs drag
        if (touchDuration < 300) {
            // Check for double tap
            if (now - this.lastTouchTime < 300) {
                // Double tap
                this.showClickEffect();
                if (this.socket?.connected) {
                    this.socket.emit('input:dblclick', coords);
                }
            } else {
                // Single tap
                this.showClickEffect();
                if (this.socket?.connected) {
                    this.socket.emit('input:click', coords);
                }
            }
            this.lastTouchTime = now;
        }

        this.touchStartPos = null;
        setTimeout(() => this.hideCursor(), 1000);
    }

    handleMouseDown(e) {
        if (!this.isStreaming || !this.inputEnabled) return;
        const coords = this.getNormalizedCoords(e.clientX, e.clientY);
        this.showCursor(e.clientX, e.clientY);
    }

    handleMouseMove(e) {
        if (!this.isStreaming || !this.inputEnabled) return;
        const coords = this.getNormalizedCoords(e.clientX, e.clientY);
        this.showCursor(e.clientX, e.clientY);

        if (e.buttons === 1 && this.socket?.connected) {
            this.socket.emit('input:mousemove', coords);
        }
    }

    handleMouseUp(e) {
        if (!this.isStreaming || !this.inputEnabled) return;
        const coords = this.getNormalizedCoords(e.clientX, e.clientY);
        this.showClickEffect();

        if (this.socket?.connected) {
            const button = e.button === 2 ? 'right' : 'left';
            this.socket.emit('input:click', { ...coords, button });
        }
    }

    handleWheel(e) {
        if (!this.isStreaming || !this.inputEnabled) return;
        e.preventDefault();

        if (this.socket?.connected) {
            this.socket.emit('input:scroll', { deltaY: e.deltaY, deltaX: e.deltaX });
        }
    }

    showCursor(x, y) {
        const rect = this.elements.screenContainer.getBoundingClientRect();
        this.elements.cursorIndicator.style.left = `${x - rect.left}px`;
        this.elements.cursorIndicator.style.top = `${y - rect.top}px`;
        this.elements.cursorIndicator.classList.add('visible');
    }

    hideCursor() {
        this.elements.cursorIndicator.classList.remove('visible');
    }

    showClickEffect() {
        this.elements.cursorIndicator.classList.add('clicking');
        setTimeout(() => this.elements.cursorIndicator.classList.remove('clicking'), 300);
    }

    showSettings() { this.elements.settingsPanel.classList.add('show'); }
    hideSettings() { this.elements.settingsPanel.classList.remove('show'); }

    switchTab(tabName) {
        this.elements.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        this.elements.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });
    }

    setupSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.elements.voiceBtn.style.display = 'none';
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.elements.voiceBtn.classList.add('listening');
            this.elements.voiceCircle.classList.add('listening');
            this.elements.voiceText.textContent = 'Listening...';
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.elements.voiceBtn.classList.remove('listening');
            this.elements.voiceCircle.classList.remove('listening');
            this.elements.voiceText.textContent = 'Tap to speak';
        };

        this.recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];
            const transcript = result[0].transcript;

            this.elements.voiceTranscript.textContent = transcript;

            if (result.isFinal) {
                this.elements.messageInput.value = transcript;
                this.sendMessage();
            }
        };

        this.recognition.onerror = () => {
            this.isListening = false;
            this.elements.voiceBtn.classList.remove('listening');
            this.elements.voiceCircle.classList.remove('listening');
            this.elements.voiceText.textContent = 'Tap to speak';
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

    setupCanvas() {
        const canvas = this.elements.screenCanvas;
        this.canvasCtx = canvas.getContext('2d');

        this.frameImage.onload = () => {
            canvas.width = this.frameImage.width;
            canvas.height = this.frameImage.height;
            this.canvasCtx.drawImage(this.frameImage, 0, 0);
        };
    }

    autoConnect() {
        // Load relay URL from settings or use current origin
        const savedRelayUrl = localStorage.getItem('relayUrl');
        if (savedRelayUrl) {
            this.relayUrl = savedRelayUrl;
        } else {
            // Default to current origin (for production deployment)
            this.relayUrl = window.location.origin;
            localStorage.setItem('relayUrl', this.relayUrl);
        }

        // Show pairing modal immediately
        this.showPairingModal();
    }

    showPairingModal() {
        this.elements.pairingModal.classList.add('show');
        this.elements.pairingCodeInput.value = '';
        this.elements.pairingError.style.display = 'none';
        this.elements.pairingCodeInput.focus();
    }

    hidePairingModal() {
        this.elements.pairingModal.classList.remove('show');
    }

    submitPairingCode() {
        const code = this.elements.pairingCodeInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

        if (code.length !== 8) {
            this.showPairingError('Pairing code must be 8 characters');
            return;
        }

        this.pairingCode = code;
        this.hidePairingModal();
        this.connectToRelay();
    }

    showPairingError(message) {
        this.elements.pairingError.textContent = message;
        this.elements.pairingError.style.display = 'block';
    }

    connectToRelay() {
        if (this.socket) this.socket.disconnect();

        this.connectionState = 'connecting';
        this.updateConnectionStatus();
        this.addSystemMessage('Connecting to relay server...');

        // Load Socket.IO from relay server
        if (typeof io === 'undefined') {
            const script = document.createElement('script');
            script.src = this.relayUrl + '/socket.io/socket.io.js';
            script.onload = () => this.initSocket();
            script.onerror = () => {
                this.connectionState = 'error';
                this.updateConnectionStatus();
                this.addSystemMessage('Failed to connect to relay server');
                this.showPairingModal();
            };
            document.head.appendChild(script);
        } else {
            this.initSocket();
        }
    }

    connect(serverIp) {
        // Legacy method - redirect to pairing flow
        this.showPairingModal();
    }

    initSocket() {
        this.socket = io(this.relayUrl, {
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: this.reconnectDelay,
            reconnectionDelayMax: 10000,
            timeout: 20000,
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;
            this.addSystemMessage('Connected to relay server');

            // Emit viewer:connect with pairing code
            this.socket.emit('viewer:connect', { pairingCode: this.pairingCode });
            this.connectionState = 'awaiting_pairing';
            this.updateConnectionStatus();

            // Start heartbeat monitoring
            this.startHeartbeat();
        });

        this.socket.on('viewer:connected', async (data) => {
            this.connectionState = 'connected';
            this.agentHostname = data.agent?.hostname || data.hostname || 'Unknown';
            this.agentInfo = data.agent || null;
            this.updateConnectionStatus();
            this.addSystemMessage(`Connected to ${this.agentHostname}`);
            this.clearWelcomeMessage();

            if (data.screenSize) {
                this.screenSize = data.screenSize;
            }

            // Store successful pairing for potential reconnection
            localStorage.setItem('lastPairingCode', this.pairingCode);

            // Initiate E2E encryption key exchange if available
            if (this.encryption && data.supportsEncryption) {
                try {
                    const publicKey = await this.encryption.initialize();
                    this.socket.emit('encryption:init', { publicKey });
                    console.log('[RemoteDevAI] Encryption key exchange initiated');
                } catch (error) {
                    console.error('[RemoteDevAI] Failed to initiate encryption:', error);
                }
            }
        });

        // Handle encryption key exchange response
        this.socket.on('encryption:ready', async (data) => {
            if (this.encryption && data.publicKey) {
                try {
                    await this.encryption.setRemotePublicKey(data.publicKey);
                    this.encryptionEnabled = true;
                    this.addSystemMessage('End-to-end encryption enabled');
                    console.log('[RemoteDevAI] E2E encryption established');
                } catch (error) {
                    console.error('[RemoteDevAI] Key exchange failed:', error);
                }
            }
        });

        this.socket.on('viewer:error', (data) => {
            this.connectionState = 'error';
            this.updateConnectionStatus();

            const errorMessage = data.error || data.message || 'Connection failed';
            this.addSystemMessage('Error: ' + errorMessage);

            // Check if it's a rate limit error
            if (data.blockedFor) {
                const waitTime = Math.ceil(data.blockedFor);
                this.showPairingError(`Too many attempts. Please wait ${waitTime} seconds.`);
                setTimeout(() => this.showPairingModal(), waitTime * 1000);
            } else {
                // Show pairing modal again for invalid code
                setTimeout(() => {
                    this.showPairingModal();
                    this.showPairingError(errorMessage);
                }, 500);
            }
        });

        this.socket.on('agent:disconnected', () => {
            this.connectionState = 'reconnecting';
            this.agentHostname = null;
            this.updateConnectionStatus();
            this.addSystemMessage('Agent disconnected. Waiting for reconnection...');
            this.isStreaming = false;
            this.stopHeartbeat();

            // Try to auto-reconnect if we have a pairing code
            if (this.settings.autoReconnect && this.pairingCode) {
                this.attemptReconnect();
            } else {
                setTimeout(() => this.showPairingModal(), 2000);
            }
        });

        this.socket.on('server:shutdown', (data) => {
            this.connectionState = 'disconnected';
            this.updateConnectionStatus();
            this.addSystemMessage('Server is shutting down for maintenance');
            this.isStreaming = false;
            this.stopHeartbeat();
        });

        // Screen events
        this.socket.on('screen:displays', (data) => {
            this.updateDisplaySelect(data.displays);
        });

        this.socket.on('screen:started', (data) => {
            console.log('Screen stream started:', data);
            this.isStreaming = true;
            this.screenSize = data.screenSize || this.screenSize;
            this.elements.screenPlaceholder.style.display = 'none';
            this.elements.screenCanvas.style.display = 'block';
            this.elements.screenToggleBtn.classList.add('streaming');
            this.elements.screenToggleBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>`;
        });

        this.socket.on('screen:frame', async (data) => {
            try {
                let frameData;

                // Check if frame is encrypted
                if (data.encrypted && this.encryption && this.encryptionEnabled) {
                    // Decrypt the frame
                    frameData = await this.encryption.decryptFrame(data);
                } else if (data.frame) {
                    // Unencrypted frame (backwards compatibility)
                    frameData = data.frame;
                } else {
                    return;
                }

                this.frameImage.src = 'data:image/jpeg;base64,' + frameData;
            } catch (error) {
                console.error('[RemoteDevAI] Frame decryption error:', error);
                // Fall back to showing encrypted data indicator
                if (data.frame) {
                    this.frameImage.src = 'data:image/jpeg;base64,' + data.frame;
                }
            }
        });

        this.socket.on('screen:stopped', () => {
            this.isStreaming = false;
            this.elements.screenPlaceholder.style.display = 'flex';
            this.elements.screenCanvas.style.display = 'none';
            this.elements.screenToggleBtn.classList.remove('streaming');
            this.elements.screenToggleBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>`;
        });

        this.socket.on('screen:error', (data) => {
            this.addSystemMessage('Screen error: ' + data.message);
        });

        // Command events
        this.socket.on('command-output', (data) => {
            this.appendToStream(data.data);
        });

        this.socket.on('command-error', (data) => {
            this.appendToStream(data.data, 'error');
        });

        this.socket.on('command-complete', (data) => {
            this.finalizeStream();
            if (data.code !== 0) {
                this.addSystemMessage('Exit code: ' + data.code);
            }
        });

        this.socket.on('disconnect', () => {
            this.connectionState = 'disconnected';
            this.updateConnectionStatus();
            this.addSystemMessage('Disconnected from relay');
            this.isStreaming = false;
        });

        this.socket.on('connect_error', () => {
            this.connectionState = 'error';
            this.updateConnectionStatus();
        });
    }

    updateConnectionStatus() {
        const statusTexts = {
            disconnected: 'Disconnected',
            connecting: 'Connecting to relay...',
            awaiting_pairing: 'Pairing...',
            connected: `Connected to ${this.agentHostname || 'agent'}`,
            reconnecting: 'Reconnecting...',
            error: 'Connection Error'
        };

        const statusClasses = {
            disconnected: 'disconnected',
            connecting: 'connecting',
            awaiting_pairing: 'connecting',
            connected: 'connected',
            reconnecting: 'connecting',
            error: 'disconnected'
        };

        this.elements.statusIndicator.className = 'status-indicator ' + statusClasses[this.connectionState];
        this.elements.statusText.textContent = statusTexts[this.connectionState] || 'Unknown';

        // Update page title to reflect connection status
        if (this.connectionState === 'connected') {
            document.title = `RemoteDevAI - ${this.agentHostname}`;
        } else {
            document.title = 'RemoteDevAI';
        }
    }

    updateDisplaySelect(displays) {
        const select = this.elements.displaySelect;
        select.innerHTML = '';
        displays.forEach((display, index) => {
            const option = document.createElement('option');
            option.value = display.id;
            option.textContent = `${display.name} (${display.width}x${display.height})${display.primary ? ' *' : ''}`;
            select.appendChild(option);
        });
    }

    toggleScreenStream() {
        if (!this.socket?.connected) {
            this.addSystemMessage('Not connected. Configure server first.');
            return;
        }

        if (this.isStreaming) {
            this.socket.emit('screen:stop');
        } else {
            this.socket.emit('screen:start', {
                fps: this.settings.fps,
                quality: this.settings.quality,
                displayId: parseInt(this.elements.displaySelect.value)
            });
        }
    }

    toggleFullscreen() {
        const container = document.querySelector('.container');
        if (document.fullscreenElement) {
            document.exitFullscreen();
            container.classList.remove('fullscreen');
        } else {
            container.requestFullscreen().then(() => {
                container.classList.add('fullscreen');
            }).catch(() => {});
        }
    }

    toggleInputControl() {
        this.inputEnabled = !this.inputEnabled;
        this.elements.inputToggleBtn.classList.toggle('active', this.inputEnabled);

        if (this.socket?.connected) {
            this.socket.emit('input:toggle', { enabled: this.inputEnabled });
        }
    }

    showKeyboard() {
        this.elements.hiddenKeyboardInput.focus();
    }

    selectDisplay(displayId) {
        if (this.socket?.connected && this.isStreaming) {
            this.socket.emit('screen:display', { displayId: parseInt(displayId) });
        }
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

        if (!this.socket?.connected) {
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

        // Show response in voice tab too
        this.elements.voiceResponse.textContent = 'Processing...';
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
        if (!this.currentStreamMessage) {
            this.currentStreamMessage = this.createStreamMessage();
        }
        const span = document.createElement('span');
        if (type === 'error') span.className = 'error-text';
        span.textContent = data;
        this.currentStreamMessage.appendChild(span);
        this.scrollToBottom();

        // Update voice response
        this.elements.voiceResponse.textContent = data.substring(0, 200) + (data.length > 200 ? '...' : '');
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

    // Heartbeat monitoring
    startHeartbeat() {
        this.stopHeartbeat();
        this.lastHeartbeat = Date.now();

        this.heartbeatInterval = setInterval(() => {
            if (this.socket?.connected) {
                const now = Date.now();
                // Check if we've received any data recently
                if (now - this.lastHeartbeat > 30000) {
                    console.warn('[Heartbeat] No activity for 30s, connection may be stale');
                    this.addSystemMessage('Connection may be unstable');
                }
            }
        }, 10000);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    // Reconnection logic with exponential backoff
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.addSystemMessage('Max reconnection attempts reached. Please enter a new pairing code.');
            this.showPairingModal();
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000);

        this.addSystemMessage(`Reconnecting in ${Math.ceil(delay / 1000)}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

        setTimeout(() => {
            if (this.socket?.connected && this.pairingCode) {
                this.socket.emit('viewer:connect', { pairingCode: this.pairingCode });
            } else {
                this.connectToRelay();
            }
        }, delay);
    }

    // Update FPS counter
    updateFpsCounter() {
        this.frameCount++;
        const now = Date.now();
        if (now - this.lastFpsUpdate >= 1000) {
            this.currentFps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }
    }

    // Get connection quality indicator
    getConnectionQuality() {
        if (!this.socket?.connected) return 'poor';
        if (this.networkStats.latency < 100) return 'excellent';
        if (this.networkStats.latency < 300) return 'good';
        if (this.networkStats.latency < 500) return 'fair';
        return 'poor';
    }

    // Cleanup on page unload
    destroy() {
        this.stopHeartbeat();
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        if (this.recognition) {
            this.recognition.stop();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new RemoteDevAI();

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Page is hidden, pause non-essential operations
            if (window.app.isStreaming) {
                console.log('[App] Page hidden, stream continues in background');
            }
        } else {
            // Page is visible again, refresh connection if needed
            if (window.app.socket?.connected && window.app.connectionState === 'connected') {
                console.log('[App] Page visible, connection active');
            }
        }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
        window.app.destroy();
    });
});
