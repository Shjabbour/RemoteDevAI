import { spawn as spawnPty, IPty } from 'node-pty';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import { ConnectionService } from './ConnectionService';
import { v4 as uuidv4 } from 'uuid';
import * as os from 'os';

const logger = createLogger('TerminalService');

export interface Terminal {
  id: string;
  pty: IPty;
  pid: number;
  cwd: string;
  createdAt: Date;
  lastActivity: Date;
}

export interface TerminalOptions {
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
  shell?: string;
}

export class TerminalService extends EventEmitter {
  private terminals: Map<string, Terminal> = new Map();
  private connectionService: ConnectionService;

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
        case 'terminal:create':
          try {
            const terminal = await this.createTerminal(command.options);
            this.connectionService.send('command:result', {
              commandId: command.id,
              success: true,
              result: {
                terminalId: terminal.id,
                pid: terminal.pid,
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

        case 'terminal:write':
          try {
            this.write(command.terminalId, command.data);
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

        case 'terminal:resize':
          try {
            this.resize(command.terminalId, command.cols, command.rows);
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

        case 'terminal:kill':
          try {
            await this.kill(command.terminalId);
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
   * Create a new terminal
   */
  async createTerminal(options: TerminalOptions = {}): Promise<Terminal> {
    const id = uuidv4();
    const cwd = options.cwd || process.cwd();
    const shell = options.shell || this.getDefaultShell();
    const cols = options.cols || 80;
    const rows = options.rows || 24;

    logger.info(`Creating terminal ${id} with shell ${shell}`);

    try {
      const pty = spawnPty(shell, [], {
        name: 'xterm-color',
        cols,
        rows,
        cwd,
        env: {
          ...process.env,
          ...options.env,
        } as any,
      });

      const terminal: Terminal = {
        id,
        pty,
        pid: pty.pid,
        cwd,
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      this.terminals.set(id, terminal);

      // Setup PTY handlers
      this.setupPtyHandlers(terminal);

      logger.info(`Terminal ${id} created with PID ${pty.pid}`);

      // Notify cloud
      if (this.connectionService.isConnected()) {
        this.connectionService.send('terminal:created', {
          terminalId: id,
          pid: pty.pid,
          cwd,
        });
      }

      return terminal;
    } catch (error) {
      logger.error(`Failed to create terminal ${id}:`, error);
      throw error;
    }
  }

  /**
   * Setup PTY event handlers
   */
  private setupPtyHandlers(terminal: Terminal): void {
    terminal.pty.onData((data: string) => {
      terminal.lastActivity = new Date();

      // Send to cloud
      if (this.connectionService.isConnected()) {
        this.connectionService.send('terminal:data', {
          terminalId: terminal.id,
          data,
        });
      }

      this.emit('data', terminal.id, data);
    });

    terminal.pty.onExit((event: { exitCode: number; signal?: number }) => {
      logger.info(`Terminal ${terminal.id} exited with code ${event.exitCode}`);

      // Notify cloud
      if (this.connectionService.isConnected()) {
        this.connectionService.send('terminal:exited', {
          terminalId: terminal.id,
          exitCode: event.exitCode,
          signal: event.signal,
        });
      }

      this.emit('exit', terminal.id, event.exitCode);

      // Remove from map
      this.terminals.delete(terminal.id);
    });
  }

  /**
   * Write data to terminal
   */
  write(terminalId: string, data: string): void {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`Terminal ${terminalId} not found`);
    }

    terminal.lastActivity = new Date();
    terminal.pty.write(data);
  }

  /**
   * Resize terminal
   */
  resize(terminalId: string, cols: number, rows: number): void {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`Terminal ${terminalId} not found`);
    }

    logger.debug(`Resizing terminal ${terminalId} to ${cols}x${rows}`);
    terminal.pty.resize(cols, rows);
  }

  /**
   * Kill terminal
   */
  async kill(terminalId: string): Promise<void> {
    const terminal = this.terminals.get(terminalId);
    if (!terminal) {
      throw new Error(`Terminal ${terminalId} not found`);
    }

    logger.info(`Killing terminal ${terminalId}`);

    try {
      terminal.pty.kill();
      this.terminals.delete(terminalId);

      // Notify cloud
      if (this.connectionService.isConnected()) {
        this.connectionService.send('terminal:killed', {
          terminalId,
        });
      }
    } catch (error) {
      logger.error(`Failed to kill terminal ${terminalId}:`, error);
      throw error;
    }
  }

  /**
   * Get terminal
   */
  getTerminal(terminalId: string): Terminal | undefined {
    return this.terminals.get(terminalId);
  }

  /**
   * List all terminals
   */
  listTerminals(): Array<{
    id: string;
    pid: number;
    cwd: string;
    createdAt: Date;
    lastActivity: Date;
  }> {
    return Array.from(this.terminals.values()).map((t) => ({
      id: t.id,
      pid: t.pid,
      cwd: t.cwd,
      createdAt: t.createdAt,
      lastActivity: t.lastActivity,
    }));
  }

  /**
   * Cleanup all terminals
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up all terminals...');

    const promises = Array.from(this.terminals.keys()).map((id) =>
      this.kill(id).catch((err) => {
        logger.error(`Error killing terminal ${id}:`, err);
      })
    );

    await Promise.all(promises);
    this.terminals.clear();

    logger.info('All terminals cleaned up');
  }

  /**
   * Get default shell based on platform
   */
  private getDefaultShell(): string {
    const platform = os.platform();

    if (platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
    } else if (platform === 'darwin') {
      return process.env.SHELL || '/bin/zsh';
    } else {
      return process.env.SHELL || '/bin/bash';
    }
  }
}
