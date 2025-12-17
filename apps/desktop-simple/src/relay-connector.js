import os from 'os';
import { EncryptionContext } from './encryption.js';

/**
 * RelayConnector - Connects to the cloud relay server for internet access
 * This enables mobile clients to connect from anywhere, not just local WiFi
 */
export class RelayConnector {
  constructor(options = {}) {
    this.relayUrl = options.relayUrl || process.env.RELAY_URL || 'http://localhost:3001';
    this.screenCapture = options.screenCapture;
    this.inputControl = options.inputControl;
    this.claudeRelay = options.claudeRelay;

    this.socket = null;
    this.io = null;
    this.isConnected = false;
    this.agentId = null;
    this.pairingCode = null;
    this.viewerCount = 0;

    // E2E encryption per viewer
    this.viewerEncryption = new Map(); // viewerId -> EncryptionContext
  }

  /**
   * Connect to relay server
   */
  async connect() {
    console.log(`[RelayConnector] Connecting to relay: ${this.relayUrl}`);

    // Load socket.io-client using createRequire (ESM workaround)
    try {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const socketModule = require('socket.io-client');
      this.io = socketModule.io || socketModule;
    } catch (err) {
      console.error('[RelayConnector] Failed to load socket.io-client:', err.message);
      throw new Error('socket.io-client not available');
    }

    this.socket = this.io(this.relayUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 15000);

      this.socket.once('connect', () => {
        clearTimeout(timeout);
        this.registerAgent();
        resolve();
      });

      this.socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Setup socket event handlers
   */
  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('[RelayConnector] Connected to relay server');
      this.isConnected = true;
      if (!this.agentId) {
        this.registerAgent();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[RelayConnector] Disconnected: ${reason}`);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('[RelayConnector] Connection error:', error.message);
    });

    // Agent registered successfully
    this.socket.on('agent:registered', (data) => {
      this.agentId = data.agentId;
      this.pairingCode = data.pairingCode;
      console.log('');
      console.log('=========================================');
      console.log('  PAIRING CODE: ' + this.pairingCode);
      console.log('=========================================');
      console.log('  Enter this code on your mobile device');
      console.log('  to connect from anywhere!');
      console.log('=========================================');
      console.log('');
    });

    // Viewer joined
    this.socket.on('viewer:joined', (data) => {
      this.viewerCount = data.viewerCount;
      console.log(`[RelayConnector] Viewer joined (total: ${this.viewerCount})`);
    });

    // Viewer left
    this.socket.on('viewer:left', (data) => {
      this.viewerCount = data.viewerCount;
      console.log(`[RelayConnector] Viewer left (total: ${this.viewerCount})`);

      // Clean up viewer encryption context
      if (data.viewerId) {
        this.viewerEncryption.delete(data.viewerId);
      }

      // Stop streaming if no viewers
      if (this.viewerCount === 0 && this.screenCapture?.isStreaming) {
        this.screenCapture.stopStreaming();
      }
    });

    // -------- E2E Encryption Key Exchange --------

    this.socket.on('encryption:init', (data) => {
      const { viewerId, publicKey } = data;
      console.log(`[RelayConnector] Encryption init from viewer ${viewerId}`);

      try {
        // Create encryption context for this viewer
        const encryption = new EncryptionContext();
        const ourPublicKey = encryption.initialize();

        // Complete key exchange with viewer's public key
        encryption.setRemotePublicKey(publicKey);

        // Store for this viewer
        this.viewerEncryption.set(viewerId, encryption);

        // Send our public key back to viewer
        this.socket.emit('encryption:ready', {
          viewerId,
          publicKey: ourPublicKey
        });

        console.log(`[RelayConnector] E2E encryption established with viewer ${viewerId}`);
      } catch (error) {
        console.error('[RelayConnector] Encryption init failed:', error);
      }
    });

    // -------- Screen Events from Viewer --------

    this.socket.on('screen:start', async (data) => {
      console.log('[RelayConnector] Screen stream requested');

      if (!this.screenCapture) return;

      const { fps = 10, quality = 50, displayId = 0 } = data || {};

      // Get displays
      const displays = await this.screenCapture.getDisplays();
      this.socket.emit('screen:displays', { displays });

      // Configure
      this.screenCapture.setFPS(fps);
      this.screenCapture.setQuality(quality);
      this.screenCapture.selectDisplay(displayId);

      // Subscribe to frames and forward to relay (with optional encryption)
      this.screenCapture.subscribe((frameData) => {
        // If any viewer has encryption enabled, encrypt the frame
        // For simplicity, we'll encrypt for all viewers if any have encryption
        if (this.viewerEncryption.size > 0) {
          // Use first viewer's encryption context (all should have same key exchange)
          const encryption = this.viewerEncryption.values().next().value;
          if (encryption && encryption.isReady) {
            try {
              const encrypted = encryption.encryptFrame(frameData.frame);
              this.socket.emit('screen:frame', {
                ...frameData,
                frame: null, // Clear plaintext
                encrypted: true,
                data: encrypted.data,
                iv: encrypted.iv
              });
              return;
            } catch (error) {
              console.error('[RelayConnector] Frame encryption failed:', error);
            }
          }
        }
        // Fallback: send unencrypted frame
        this.socket.emit('screen:frame', frameData);
      });

      // Start streaming
      if (!this.screenCapture.isStreaming) {
        this.screenCapture.startStreaming(fps);
      }

      this.socket.emit('screen:started', {
        fps: this.screenCapture.fps,
        quality: this.screenCapture.quality,
        displayId: this.screenCapture.currentDisplay
      });
    });

    this.socket.on('screen:stop', (data) => {
      console.log('[RelayConnector] Screen stream stop requested');

      if (this.screenCapture?.isStreaming) {
        this.screenCapture.stopStreaming();
      }

      this.socket.emit('screen:stopped');
    });

    this.socket.on('screen:display', (data) => {
      if (this.screenCapture) {
        this.screenCapture.selectDisplay(data.displayId);
      }
    });

    this.socket.on('screen:settings', (data) => {
      if (!this.screenCapture) return;

      if (data.fps) this.screenCapture.setFPS(data.fps);
      if (data.quality) this.screenCapture.setQuality(data.quality);
      if (data.scale) this.screenCapture.setScale(data.scale);
    });

    // -------- Input Events from Viewer --------

    this.socket.on('input:click', async (data) => {
      if (!this.inputControl) return;
      const { x, y, button = 'left' } = data;
      if (x !== undefined && y !== undefined) {
        await this.inputControl.clickAt(x, y, button);
      } else {
        await this.inputControl.click(button);
      }
    });

    this.socket.on('input:dblclick', async (data) => {
      if (!this.inputControl) return;
      const { x, y } = data || {};
      if (x !== undefined && y !== undefined) {
        await this.inputControl.moveMouse(x, y);
        await new Promise(r => setTimeout(r, 50));
      }
      await this.inputControl.doubleClick();
    });

    this.socket.on('input:rightclick', async (data) => {
      if (!this.inputControl) return;
      const { x, y } = data || {};
      if (x !== undefined && y !== undefined) {
        await this.inputControl.clickAt(x, y, 'right');
      } else {
        await this.inputControl.click('right');
      }
    });

    this.socket.on('input:mousemove', async (data) => {
      if (!this.inputControl) return;
      await this.inputControl.moveMouse(data.x, data.y);
    });

    this.socket.on('input:type', async (data) => {
      if (!this.inputControl) return;
      await this.inputControl.typeText(data.text);
    });

    this.socket.on('input:key', async (data) => {
      if (!this.inputControl) return;
      if (data.modifiers && data.modifiers.length > 0) {
        await this.inputControl.pressCombo(data.modifiers, data.key);
      } else {
        await this.inputControl.pressKey(data.key);
      }
    });

    this.socket.on('input:scroll', async (data) => {
      if (!this.inputControl) return;
      await this.inputControl.scroll(data.deltaY, data.deltaX);
    });

    // -------- Command Events from Viewer --------

    this.socket.on('execute-command', (data) => {
      if (!this.claudeRelay) return;

      const { command, sessionId } = data;
      console.log(`[RelayConnector] Executing command: ${command}`);

      this.claudeRelay.executeCommand(
        command,
        (output) => {
          this.socket.emit('command-output', {
            sessionId,
            type: output.type,
            data: output.data,
            timestamp: new Date().toISOString()
          });
        },
        (error) => {
          this.socket.emit('command-output', {
            sessionId,
            type: 'error',
            data: error.data,
            timestamp: new Date().toISOString()
          });
        },
        (result) => {
          this.socket.emit('command-complete', {
            sessionId,
            code: result.code,
            timestamp: new Date().toISOString()
          });
        }
      );
    });
  }

  /**
   * Register this agent with the relay server
   */
  registerAgent() {
    const agentInfo = {
      name: `${os.hostname()}-desktop`,
      hostname: os.hostname(),
      platform: os.platform(),
      version: '1.0.0',
      capabilities: {
        screenCapture: !!this.screenCapture,
        inputControl: !!this.inputControl,
        claudeRelay: !!this.claudeRelay
      }
    };

    console.log('[RelayConnector] Registering agent...');
    this.socket.emit('agent:register', agentInfo);
  }

  /**
   * Disconnect from relay server
   */
  disconnect() {
    if (this.socket) {
      console.log('[RelayConnector] Disconnecting from relay');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.agentId = null;
      this.pairingCode = null;
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      relayUrl: this.relayUrl,
      agentId: this.agentId,
      pairingCode: this.pairingCode,
      viewerCount: this.viewerCount
    };
  }
}

export default RelayConnector;
