import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { config } from '../config';
import { ConnectionService } from './ConnectionService';
import * as path from 'path';
import * as fs from 'fs';

const logger = createLogger('ClaudeCodeService');

export interface ClaudeCodeOptions {
  workspace?: string;
  model?: string;
  autoApprove?: boolean;
  verbose?: boolean;
  additionalArgs?: string[];
}

export interface ClaudeCodeStatus {
  running: boolean;
  pid?: number;
  startedAt?: Date;
  workspace?: string;
  lastOutput?: string;
}

export class ClaudeCodeService extends EventEmitter {
  private process: ChildProcess | null = null;
  private connectionService: ConnectionService;
  private status: ClaudeCodeStatus = {
    running: false,
  };
  private outputBuffer: string[] = [];
  private maxBufferSize = 1000;

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
      if (command.type === 'claude:execute') {
        try {
          const result = await this.executeCommand(command.command);
          this.connectionService.send('command:result', {
            commandId: command.id,
            success: true,
            result,
          });
        } catch (error: any) {
          this.connectionService.send('command:result', {
            commandId: command.id,
            success: false,
            error: error.message,
          });
        }
      }
    });
  }

  /**
   * Start Claude Code CLI
   */
  async start(options: ClaudeCodeOptions = {}): Promise<void> {
    if (this.process) {
      logger.warn('Claude Code is already running');
      return;
    }

    const workspace = options.workspace || config.claudeCodeWorkspace;

    // Validate workspace
    if (!fs.existsSync(workspace)) {
      throw new Error(`Workspace does not exist: ${workspace}`);
    }

    logger.info(`Starting Claude Code in ${workspace}...`);

    try {
      const args = this.buildCommandArgs(options);

      this.process = spawn(config.claudeCodePath, args, {
        cwd: workspace,
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.setupProcessHandlers(workspace);

      this.status = {
        running: true,
        pid: this.process.pid,
        startedAt: new Date(),
        workspace,
      };

      this.emit('started', this.status);
      this.sendStatusUpdate();

      logger.info(`Claude Code started with PID ${this.process.pid}`);
    } catch (error) {
      logger.error('Failed to start Claude Code:', error);
      throw error;
    }
  }

  /**
   * Build command line arguments
   */
  private buildCommandArgs(options: ClaudeCodeOptions): string[] {
    const args: string[] = [];

    if (options.model) {
      args.push('--model', options.model);
    }

    if (options.autoApprove) {
      args.push('--auto-approve');
    }

    if (options.verbose) {
      args.push('--verbose');
    }

    if (options.additionalArgs) {
      args.push(...options.additionalArgs);
    }

    return args;
  }

  /**
   * Setup process event handlers
   */
  private setupProcessHandlers(workspace: string): void {
    if (!this.process) return;

    this.process.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.handleOutput(output);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      this.handleError(output);
    });

    this.process.on('error', (error: Error) => {
      logger.error('Process error:', error);
      this.emit('error', error);
      this.sendStatusUpdate();
    });

    this.process.on('exit', (code: number | null, signal: string | null) => {
      logger.info(`Claude Code exited with code ${code}, signal ${signal}`);

      this.status = {
        running: false,
      };

      this.emit('stopped', { code, signal });
      this.sendStatusUpdate();

      this.process = null;
    });
  }

  /**
   * Handle stdout output
   */
  private handleOutput(output: string): void {
    logger.debug('Claude output:', output);

    // Add to buffer
    this.outputBuffer.push(output);
    if (this.outputBuffer.length > this.maxBufferSize) {
      this.outputBuffer.shift();
    }

    this.status.lastOutput = output;

    // Send to cloud
    if (this.connectionService.isConnected()) {
      this.connectionService.send('claude:output', {
        type: 'stdout',
        data: output,
        timestamp: new Date().toISOString(),
      });
    }

    this.emit('output', output);
  }

  /**
   * Handle stderr output
   */
  private handleError(output: string): void {
    logger.debug('Claude error:', output);

    // Add to buffer
    this.outputBuffer.push(`[ERROR] ${output}`);
    if (this.outputBuffer.length > this.maxBufferSize) {
      this.outputBuffer.shift();
    }

    this.status.lastOutput = output;

    // Send to cloud
    if (this.connectionService.isConnected()) {
      this.connectionService.send('claude:output', {
        type: 'stderr',
        data: output,
        timestamp: new Date().toISOString(),
      });
    }

    this.emit('error-output', output);
  }

  /**
   * Stop Claude Code CLI
   */
  async stop(): Promise<void> {
    if (!this.process) {
      logger.warn('Claude Code is not running');
      return;
    }

    logger.info('Stopping Claude Code...');

    try {
      // Try graceful shutdown first
      this.process.stdin?.write('\x03'); // Ctrl+C

      // Wait for process to exit
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          // Force kill if not exited
          if (this.process) {
            logger.warn('Force killing Claude Code');
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
      this.status = {
        running: false,
      };

      this.emit('stopped', {});
      this.sendStatusUpdate();

      logger.info('Claude Code stopped');
    } catch (error) {
      logger.error('Failed to stop Claude Code:', error);
      throw error;
    }
  }

  /**
   * Execute a command in Claude Code
   */
  async executeCommand(command: string): Promise<string> {
    if (!this.process) {
      throw new Error('Claude Code is not running');
    }

    logger.info('Executing command:', command);

    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error('Process not available'));
        return;
      }

      // Capture output
      const outputLines: string[] = [];
      const timeout = setTimeout(() => {
        reject(new Error('Command execution timeout'));
      }, 30000);

      const outputHandler = (data: string) => {
        outputLines.push(data);

        // Simple heuristic: if output ends with prompt or newline, consider done
        if (data.includes('\n') || data.includes('>')) {
          clearTimeout(timeout);
          this.removeListener('output', outputHandler);
          resolve(outputLines.join(''));
        }
      };

      this.on('output', outputHandler);

      // Write command
      this.process.stdin.write(command + '\n');
    });
  }

  /**
   * Send input to Claude Code
   */
  sendInput(input: string): void {
    if (!this.process || !this.process.stdin) {
      throw new Error('Claude Code is not running');
    }

    this.process.stdin.write(input);
  }

  /**
   * Get current status
   */
  getStatus(): ClaudeCodeStatus {
    return { ...this.status };
  }

  /**
   * Get output buffer
   */
  getOutputBuffer(): string[] {
    return [...this.outputBuffer];
  }

  /**
   * Clear output buffer
   */
  clearOutputBuffer(): void {
    this.outputBuffer = [];
  }

  /**
   * Send status update to cloud
   */
  private sendStatusUpdate(): void {
    if (this.connectionService.isConnected()) {
      this.connectionService.send('claude:status', this.status);
    }
  }
}
