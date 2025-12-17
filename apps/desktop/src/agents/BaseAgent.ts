import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { ConnectionService } from '../services/ConnectionService';

/**
 * Base class for all agents
 * Provides common functionality for listening to commands and reporting results
 */
export abstract class BaseAgent extends EventEmitter {
  protected name: string;
  protected connectionService: ConnectionService;
  protected logger: any;
  protected enabled: boolean = true;

  constructor(name: string, connectionService: ConnectionService) {
    super();
    this.name = name;
    this.connectionService = connectionService;
    this.logger = createLogger(`Agent:${name}`);
    this.setupListeners();
  }

  /**
   * Setup listeners for commands from cloud
   */
  private setupListeners(): void {
    this.connectionService.on('command', async (command) => {
      // Only handle commands for this agent
      if (command.agent !== this.name) {
        return;
      }

      if (!this.enabled) {
        this.sendResult(command.id, {
          success: false,
          error: 'Agent is disabled',
        });
        return;
      }

      this.logger.info(`Received command: ${command.action}`, command);

      try {
        const result = await this.handleCommand(command);
        this.sendResult(command.id, {
          success: true,
          result,
        });
      } catch (error: any) {
        this.logger.error(`Command failed: ${command.action}`, error);
        this.sendResult(command.id, {
          success: false,
          error: error.message,
          stack: error.stack,
        });
      }
    });
  }

  /**
   * Handle command - to be implemented by subclasses
   */
  protected abstract handleCommand(command: any): Promise<any>;

  /**
   * Send command result back to cloud
   */
  protected sendResult(commandId: string, result: any): void {
    if (this.connectionService.isConnected()) {
      this.connectionService.send('command:result', {
        commandId,
        agent: this.name,
        ...result,
      });
    }
  }

  /**
   * Send progress update
   */
  protected sendProgress(commandId: string, progress: number, message?: string): void {
    if (this.connectionService.isConnected()) {
      this.connectionService.send('command:progress', {
        commandId,
        agent: this.name,
        progress,
        message,
      });
    }
  }

  /**
   * Send log message
   */
  protected sendLog(level: string, message: string, data?: any): void {
    if (this.connectionService.isConnected()) {
      this.connectionService.send('agent:log', {
        agent: this.name,
        level,
        message,
        data,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Enable agent
   */
  enable(): void {
    this.enabled = true;
    this.logger.info('Agent enabled');
  }

  /**
   * Disable agent
   */
  disable(): void {
    this.enabled = false;
    this.logger.info('Agent disabled');
  }

  /**
   * Check if agent is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get agent name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Cleanup - called when agent is stopped
   */
  async cleanup(): Promise<void> {
    this.logger.info('Cleaning up agent');
    this.removeAllListeners();
  }
}
