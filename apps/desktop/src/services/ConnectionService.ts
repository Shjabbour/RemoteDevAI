import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { config } from '../config';
import { AuthService } from './AuthService';

const logger = createLogger('ConnectionService');

export interface ConnectionStats {
  connected: boolean;
  connectedAt?: Date;
  disconnectedAt?: Date;
  reconnectAttempts: number;
  messagesSent: number;
  messagesReceived: number;
  bytesTransferred: number;
}

export class ConnectionService extends EventEmitter {
  private socket: Socket | null = null;
  private authService: AuthService;
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
  }

  /**
   * Connect to the cloud server
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
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        transports: ['websocket'],
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

    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.socket = null;

    this.stats.connected = false;
    this.stats.disconnectedAt = new Date();

    this.emit('disconnected');
    logger.info('Disconnected');
  }

  /**
   * Setup socket event handlers
   */
  private setupSocketHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      logger.info('Socket connected');
      this.stats.connected = true;
      this.stats.connectedAt = new Date();
      this.stats.reconnectAttempts = 0;
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      logger.warn('Socket disconnected:', reason);
      this.stats.connected = false;
      this.stats.disconnectedAt = new Date();
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      logger.error('Connection error:', error);
      this.stats.reconnectAttempts++;
      this.emit('error', error);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      logger.info(`Reconnection attempt ${attempt}`);
      this.stats.reconnectAttempts = attempt;
      this.emit('reconnecting', attempt);
    });

    this.socket.on('reconnect', (attempt) => {
      logger.info(`Reconnected after ${attempt} attempts`);
      this.stats.reconnectAttempts = 0;
      this.emit('reconnected', attempt);
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
   * Send a message to the cloud server
   */
  send(event: string, data: any): void {
    if (!this.socket?.connected) {
      logger.warn('Cannot send message: not connected');
      throw new Error('Not connected');
    }

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
  }

  /**
   * Send a message and wait for response
   */
  async sendWithAck(event: string, data: any, timeout = 5000): Promise<any> {
    if (!this.socket?.connected) {
      throw new Error('Not connected');
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
          resolve(response);
        }
      });
    });
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
}
