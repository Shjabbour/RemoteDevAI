import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { createLogger } from '../utils/logger';
import { ConnectionService } from './ConnectionService';
import { config } from '../config';

const logger = createLogger('TunnelService');

export interface TunnelOptions {
  port?: number;
  subdomain?: string;
  region?: string;
}

export interface TunnelStatus {
  running: boolean;
  provider: string;
  publicUrl?: string;
  startedAt?: Date;
}

export class TunnelService extends EventEmitter {
  private connectionService: ConnectionService;
  private process: ChildProcess | null = null;
  private status: TunnelStatus = {
    running: false,
    provider: config.tunnelProvider,
  };
  private publicUrl: string | null = null;

  constructor(connectionService: ConnectionService) {
    super();
    this.connectionService = connectionService;
    this.setupConnectionHandlers();
  }

  /**
   * Setup handlers for cloud commands
   */
  private setupConnectionHandlers(): void {
    this.connectionService.on('command', async (command) => {
      switch (command.type) {
        case 'tunnel:start':
          try {
            await this.start(command.options);
            this.connectionService.send('command:result', {
              commandId: command.id,
              success: true,
              result: {
                publicUrl: this.publicUrl,
              },
            });
          } catch (error: any) {
            this.connectionService.send('command:result', {
              commandId: command.id,
              success: false,
              error: error.message,
            });
          }
          break;

        case 'tunnel:stop':
          try {
            await this.stop();
            this.connectionService.send('command:result', {
              commandId: command.id,
              success: true,
            });
          } catch (error: any) {
            this.connectionService.send('command:result', {
              commandId: command.id,
              success: false,
              error: error.message,
            });
          }
          break;
      }
    });
  }

  /**
   * Start tunnel
   */
  async start(options: TunnelOptions = {}): Promise<void> {
    if (this.process) {
      throw new Error('Tunnel already running');
    }

    if (config.tunnelProvider === 'none') {
      throw new Error('Tunnel provider not configured');
    }

    logger.info(`Starting ${config.tunnelProvider} tunnel...`);

    try {
      if (config.tunnelProvider === 'cloudflare') {
        await this.startCloudflare(options);
      } else if (config.tunnelProvider === 'ngrok') {
        await this.startNgrok(options);
      } else {
        throw new Error(`Unknown tunnel provider: ${config.tunnelProvider}`);
      }

      this.status = {
        running: true,
        provider: config.tunnelProvider,
        publicUrl: this.publicUrl || undefined,
        startedAt: new Date(),
      };

      logger.info(`Tunnel started: ${this.publicUrl}`);

      // Notify cloud
      if (this.connectionService.isConnected()) {
        this.connectionService.send('tunnel:started', {
          provider: config.tunnelProvider,
          publicUrl: this.publicUrl,
        });
      }

      this.emit('started', this.publicUrl);
    } catch (error) {
      logger.error('Failed to start tunnel:', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Start Cloudflare tunnel
   */
  private async startCloudflare(options: TunnelOptions): Promise<void> {
    const port = options.port || 3000;
    const args = ['tunnel', '--url', `http://localhost:${port}`];

    if (config.tunnelAuthToken) {
      args.push('--token', config.tunnelAuthToken);
    }

    this.process = spawn('cloudflared', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.setupProcessHandlers();

    // Wait for tunnel URL
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Tunnel startup timeout'));
      }, 30000);

      const outputHandler = (data: Buffer) => {
        const output = data.toString();
        logger.debug('Cloudflare output:', output);

        // Extract URL from output
        const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (urlMatch) {
          this.publicUrl = urlMatch[0];
          clearTimeout(timeout);
          this.process?.stdout?.removeListener('data', outputHandler);
          resolve();
        }
      };

      this.process!.stdout?.on('data', outputHandler);

      this.process!.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.process!.once('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`Process exited with code ${code}`));
      });
    });
  }

  /**
   * Start ngrok tunnel
   */
  private async startNgrok(options: TunnelOptions): Promise<void> {
    const port = options.port || 3000;
    const args = ['http', port.toString()];

    if (config.tunnelAuthToken) {
      args.push('--authtoken', config.tunnelAuthToken);
    }

    if (options.subdomain) {
      args.push('--subdomain', options.subdomain);
    }

    if (options.region) {
      args.push('--region', options.region);
    }

    this.process = spawn('ngrok', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.setupProcessHandlers();

    // Wait for tunnel to start and get URL from API
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(async () => {
        try {
          // Query ngrok API for tunnel URL
          const axios = require('axios');
          const response = await axios.get('http://localhost:4040/api/tunnels');
          const tunnels = response.data.tunnels;

          if (tunnels && tunnels.length > 0) {
            this.publicUrl = tunnels[0].public_url;
            resolve();
          } else {
            reject(new Error('No tunnels found'));
          }
        } catch (error) {
          reject(new Error('Failed to get tunnel URL from ngrok API'));
        }
      }, 5000);

      this.process!.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.process!.once('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`Process exited with code ${code}`));
      });
    });
  }

  /**
   * Setup process event handlers
   */
  private setupProcessHandlers(): void {
    if (!this.process) return;

    this.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      logger.debug('Tunnel output:', output);
      this.emit('output', output);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      logger.debug('Tunnel error:', output);
      this.emit('error-output', output);
    });

    this.process.on('error', (error: Error) => {
      logger.error('Tunnel process error:', error);
      this.emit('error', error);
    });

    this.process.on('exit', (code: number | null, signal: string | null) => {
      logger.info(`Tunnel process exited with code ${code}, signal ${signal}`);

      this.status = {
        running: false,
        provider: config.tunnelProvider,
      };

      this.publicUrl = null;

      // Notify cloud
      if (this.connectionService.isConnected()) {
        this.connectionService.send('tunnel:stopped', {});
      }

      this.emit('stopped', { code, signal });

      this.process = null;
    });
  }

  /**
   * Stop tunnel
   */
  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    logger.info('Stopping tunnel...');

    try {
      this.process.kill('SIGTERM');

      // Wait for process to exit
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.process) {
            logger.warn('Force killing tunnel process');
            this.process.kill('SIGKILL');
          }
          resolve();
        }, 5000);

        this.process!.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.process = null;
      this.publicUrl = null;

      this.status = {
        running: false,
        provider: config.tunnelProvider,
      };

      logger.info('Tunnel stopped');
    } catch (error) {
      logger.error('Failed to stop tunnel:', error);
      throw error;
    }
  }

  /**
   * Get tunnel status
   */
  getStatus(): TunnelStatus {
    return { ...this.status };
  }

  /**
   * Get public URL
   */
  getPublicUrl(): string | null {
    return this.publicUrl;
  }
}
