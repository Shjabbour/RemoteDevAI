import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { config } from '../config';
import { AuthService } from './AuthService';
import { getOfflineService } from './OfflineService';

const logger = createLogger('ConnectionService');

export interface ConnectionStats {
  connected: boolean;
  connectedAt?: Date;
  disconnectedAt?: Date;
  reconnectAttempts: number;
  messagesSent: number;
  messagesReceived: number;
  bytesTransferred: number;
  lastHeartbeat?: Date;
  latency?: number;
}

// Enhanced reconnection configuration
const RECONNECTION_CONFIG = {
  enabled: true,
  initialDelay: 1000,
  maxDelay: 30000,
  maxAttempts: 10,
  backoffMultiplier: 1.5,
  heartbeatInterval: 30000,
}

export class ConnectionService extends EventEmitter {
  private socket: Socket | null = null;
  private authService: AuthService;
  private offlineService = getOfflineService();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private stats: ConnectionStats = {
    connected: false,
    reconnectAttempts: 0,
    messagesSent: 0,
    messagesReceived: 0,
    bytesTransferred: 0,
  };

  constructor(authService: AuthService) {
    super();
    this.authService = authService;

    // Initialize offline service
    this.offlineService.init().catch((error) => {
      logger.error('Failed to initialize offline service:', error);
    });
  }

  /**
   * Connect to the cloud server with enhanced reconnection
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      logger.warn('Already connected');
      return;
    }

    try {
      logger.info(`Connecting to ${config.cloudWsUrl}...`);

      const token = await this.authService.getAuthToken();
      const deviceId = await this.authService.getDeviceId();

      this.socket = io(config.cloudWsUrl, {
        auth: {
          token,
          deviceId,
        },
        reconnection: RECONNECTION_CONFIG.enabled,
        reconnectionDelay: RECONNECTION_CONFIG.initialDelay,
        reconnectionDelayMax: RECONNECTION_CONFIG.maxDelay,
        reconnectionAttempts: RECONNECTION_CONFIG.maxAttempts,
        timeout: 10000,
        transports: ['websocket', 'polling'],
      });

      this.setupSocketHandlers();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.socket!.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.socket!.once('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      logger.info('Connected successfully');
    } catch (error) {
      logger.error('Connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the cloud server
   */
  async disconnect(): Promise<void> {
    if (!this.socket) {
      return;
    }

    logger.info('Disconnecting...');

    this.stopHeartbeat();
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;

    this.stats.connected = false;
    this.stats.disconnectedAt = new Date();

    this.emit('disconnected');
    logger.info('Disconnected');
  }

  /**
   * Setup socket event handlers with enhanced features
   */
  private setupSocketHandlers(): void {
    if (!this.socket) return;

    // Connection established
    this.socket.on('connect', () => {
      logger.info('Socket connected');
      this.stats.connected = true;
      this.stats.connectedAt = new Date();
      this.stats.reconnectAttempts = 0;
      this.emit('connected');

      // Start heartbeat
      this.startHeartbeat();

      // Sync pending offline commands
      if (this.stats.disconnectedAt) {
        this.syncOfflineCommands();

        // Request missed messages
        this.socket?.emit('request:missed-messages', {
          since: this.stats.disconnectedAt.toISOString(),
        });
      }
    });

    // Disconnected
    this.socket.on('disconnect', (reason) => {
      logger.warn('Socket disconnected:', reason);
      this.stats.connected = false;
      this.stats.disconnectedAt = new Date();
      this.stopHeartbeat();
      this.emit('disconnected', reason);

      // Auto-reconnect on client-side disconnect
      if (reason === 'io client disconnect') {
        this.socket?.connect();
      }
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      logger.error('Connection error:', error);
      this.stats.reconnectAttempts++;
      this.emit('error', error);
    });

    // Reconnection attempt
    this.socket.on('reconnect_attempt', (attempt) => {
      logger.info(`Reconnection attempt ${attempt}/${RECONNECTION_CONFIG.maxAttempts}`);
      this.stats.reconnectAttempts = attempt;
      this.emit('reconnecting', attempt);
    });

    // Reconnection error
    this.socket.on('reconnect_error', (error) => {
      logger.error('Reconnection error:', error);
      this.emit('reconnect-error', error);
    });

    // Reconnection failed
    this.socket.on('reconnect_failed', () => {
      logger.error('Reconnection failed after maximum attempts');
      this.emit('reconnect-failed');
    });

    // Successful reconnection
    this.socket.on('reconnect', (attempt) => {
      logger.info(`Reconnected after ${attempt} attempts`);
      this.stats.reconnectAttempts = 0;
      this.emit('reconnected', attempt);
    });

    // Pong response for heartbeat
    this.socket.on('pong', (data: { timestamp: number }) => {
      const latency = Date.now() - data.timestamp;
      this.stats.lastHeartbeat = new Date();
      this.stats.latency = latency;
      logger.debug(`Heartbeat latency: ${latency}ms`);
      this.emit('heartbeat', latency);
    });

    // Generic message handler
    this.socket.onAny((event, ...args) => {
      logger.debug(`Received event: ${event}`, args);
      this.stats.messagesReceived++;

      // Calculate approximate bytes
      try {
        const data = JSON.stringify(args);
        this.stats.bytesTransferred += data.length;
      } catch {
        // Ignore
      }

      // Emit to listeners
      this.emit(`message:${event}`, ...args);
    });

    // Handle specific events
    this.socket.on('task', (task) => {
      logger.info('Received task:', task);
      this.emit('task', task);
    });

    this.socket.on('command', (command) => {
      logger.info('Received command:', command);
      this.emit('command', command);
    });

    this.socket.on('config', (config) => {
      logger.info('Received config update');
      this.emit('config', config);
    });
  }

  /**
   * Start heartbeat mechanism
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping', { timestamp: Date.now() });
      }
    }, RECONNECTION_CONFIG.heartbeatInterval);
  }

  /**
   * Stop heartbeat mechanism
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Sync pending offline commands
   */
  private async syncOfflineCommands(): Promise<void> {
    try {
      logger.info('Syncing pending offline commands...');
      await this.offlineService.syncPendingCommands(async (command) => {
        if (this.socket?.connected) {
          this.socket.emit(command.type, command.payload);
        } else {
          throw new Error('Socket not connected');
        }
      });
      logger.info('Offline commands synced successfully');
    } catch (error) {
      logger.error('Failed to sync offline commands:', error);
    }
  }

  /**
   * Send a message to the cloud server (queues if offline)
   */
  send(event: string, data: any): void {
    if (this.socket?.connected) {
      logger.debug(`Sending event: ${event}`, data);
      this.socket.emit(event, data);
      this.stats.messagesSent++;

      // Calculate approximate bytes
      try {
        const payload = JSON.stringify(data);
        this.stats.bytesTransferred += payload.length;
      } catch {
        // Ignore
      }
    } else {
      // Queue for later when reconnected
      logger.warn(`Not connected, queuing event: ${event}`);
      this.offlineService.queueCommand(event as any, data);
    }
  }

  /**
   * Send a message and wait for response (with offline support)
   */
  async sendWithAck(event: string, data: any, timeout = 5000): Promise<any> {
    if (!this.socket?.connected) {
      // Try to use cached response
      const cached = this.offlineService.getCachedResponse(`${event}:${JSON.stringify(data)}`);
      if (cached) {
        logger.info('Using cached response for offline request');
        return cached;
      }

      // Queue and throw error
      await this.offlineService.queueCommand(event as any, data);
      throw new Error('Not connected - request queued for later');
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, timeout);

      this.socket!.emit(event, data, (response: any) => {
        clearTimeout(timer);
        if (response.error) {
          reject(new Error(response.error));
        } else {
          // Cache the response
          this.offlineService.cacheResponse(
            `${event}:${JSON.stringify(data)}`,
            response
          );
          resolve(response);
        }
      });
    });
  }

  /**
   * Manually trigger reconnection
   */
  reconnect(): void {
    if (this.socket) {
      logger.info('Manual reconnection triggered');
      this.socket.connect();
    }
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    connecting: boolean;
    error: boolean;
  } {
    return {
      connected: this.socket?.connected || false,
      connecting: this.socket?.connecting || false,
      error: !this.socket || (!this.socket.connected && !this.socket.connecting),
    };
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get offline queue count
   */
  getOfflineQueueCount(): number {
    return this.offlineService.getQueueCount();
  }

  /**
   * Clear offline queue
   */
  async clearOfflineQueue(): Promise<void> {
    await this.offlineService.clearQueue();
  }
}
