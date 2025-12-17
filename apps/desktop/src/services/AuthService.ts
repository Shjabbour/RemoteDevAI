import { EventEmitter } from 'events';
import * as keytar from 'keytar';
import { createLogger } from '../utils/logger';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger('AuthService');

const SERVICE_NAME = 'RemoteDevAI';
const TOKEN_ACCOUNT = 'auth-token';
const DEVICE_ID_FILE = 'device-id';

export class AuthService extends EventEmitter {
  private deviceId: string | null = null;

  constructor() {
    super();
    this.initialize();
  }

  /**
   * Initialize auth service
   */
  private async initialize(): Promise<void> {
    try {
      // Load or generate device ID
      await this.loadDeviceId();
      logger.info('Auth service initialized');
    } catch (error) {
      logger.error('Failed to initialize auth service:', error);
    }
  }

  /**
   * Load or generate device ID
   */
  private async loadDeviceId(): Promise<void> {
    const deviceIdPath = path.join(config.userDataPath, DEVICE_ID_FILE);

    try {
      if (fs.existsSync(deviceIdPath)) {
        this.deviceId = fs.readFileSync(deviceIdPath, 'utf-8').trim();
        logger.info('Device ID loaded:', this.deviceId);
      } else {
        // Generate new device ID
        this.deviceId = this.generateDeviceId();
        fs.writeFileSync(deviceIdPath, this.deviceId, 'utf-8');
        logger.info('New device ID generated:', this.deviceId);
      }
    } catch (error) {
      logger.error('Failed to load device ID:', error);
      // Fallback to in-memory device ID
      this.deviceId = this.generateDeviceId();
    }
  }

  /**
   * Generate unique device ID
   */
  private generateDeviceId(): string {
    const hostname = os.hostname();
    const platform = os.platform();
    const arch = os.arch();
    const uuid = uuidv4();

    return `${platform}-${arch}-${hostname}-${uuid}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  }

  /**
   * Get device ID
   */
  async getDeviceId(): Promise<string> {
    if (!this.deviceId) {
      await this.loadDeviceId();
    }
    return this.deviceId!;
  }

  /**
   * Get auth token from secure storage
   */
  async getAuthToken(): Promise<string | null> {
    try {
      const token = await keytar.getPassword(SERVICE_NAME, TOKEN_ACCOUNT);
      if (token) {
        logger.debug('Auth token retrieved from secure storage');
      }
      return token;
    } catch (error) {
      logger.error('Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Set auth token in secure storage
   */
  async setAuthToken(token: string): Promise<void> {
    try {
      await keytar.setPassword(SERVICE_NAME, TOKEN_ACCOUNT, token);
      logger.info('Auth token stored in secure storage');
      this.emit('token-changed', token);
    } catch (error) {
      logger.error('Failed to set auth token:', error);
      throw error;
    }
  }

  /**
   * Clear auth token from secure storage
   */
  async clearAuthToken(): Promise<void> {
    try {
      await keytar.deletePassword(SERVICE_NAME, TOKEN_ACCOUNT);
      logger.info('Auth token cleared from secure storage');
      this.emit('token-cleared');
    } catch (error) {
      logger.error('Failed to clear auth token:', error);
      throw error;
    }
  }

  /**
   * Check if auth token exists
   */
  async hasAuthToken(): Promise<boolean> {
    const token = await this.getAuthToken();
    return token !== null;
  }

  /**
   * Get device info
   */
  getDeviceInfo(): {
    deviceId: string;
    hostname: string;
    platform: string;
    arch: string;
    version: string;
  } {
    return {
      deviceId: this.deviceId || 'unknown',
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      version: config.appVersion,
    };
  }
}
