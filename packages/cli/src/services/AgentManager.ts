import { execa, ExecaChildProcess } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { configManager } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export interface AgentStatus {
  running: boolean;
  pid?: number;
  uptime?: number;
  version?: string;
  lastHeartbeat?: Date;
}

export class AgentManager {
  private agentProcess: ExecaChildProcess | null = null;
  private pidFile: string;
  private agentExecutable: string;

  constructor() {
    const agentDir = configManager.getAgentDir();
    this.pidFile = path.join(agentDir, 'agent.pid');

    // Determine executable name based on platform
    const platform = os.platform();
    const execName = platform === 'win32' ? 'remotedevai-agent.exe' : 'remotedevai-agent';
    this.agentExecutable = path.join(agentDir, 'bin', execName);
  }

  /**
   * Start the desktop agent
   */
  async start(options: { detached?: boolean } = {}): Promise<void> {
    // Check if agent is already running
    if (await this.isRunning()) {
      throw new Error('Agent is already running');
    }

    // Check if agent executable exists
    if (!(await fs.pathExists(this.agentExecutable))) {
      throw new Error('Agent executable not found. Please run: remotedevai update');
    }

    // Get configuration
    const config = await configManager.read();
    if (!config.apiKey) {
      throw new Error('Not authenticated. Please run: remotedevai login');
    }

    // Prepare environment variables
    const env = {
      ...process.env,
      REMOTEDEVAI_API_KEY: config.apiKey,
      REMOTEDEVAI_API_URL: config.apiUrl || configManager.getDefaultApiUrl(),
      REMOTEDEVAI_PROJECT_ID: config.projectId || '',
      REMOTEDEVAI_LOG_LEVEL: config.logLevel || 'info',
    };

    try {
      if (options.detached) {
        // Start agent as detached process
        this.agentProcess = execa(this.agentExecutable, [], {
          env,
          detached: true,
          stdio: 'ignore',
        });

        // Save PID
        if (this.agentProcess.pid) {
          await this.savePid(this.agentProcess.pid);
        }

        // Unref so parent process can exit
        this.agentProcess.unref();

        logger.success('Agent started in background');
      } else {
        // Start agent in foreground
        this.agentProcess = execa(this.agentExecutable, [], {
          env,
          stdio: 'inherit',
        });

        // Save PID
        if (this.agentProcess.pid) {
          await this.savePid(this.agentProcess.pid);
        }

        // Wait for process to exit
        await this.agentProcess;
      }
    } catch (error) {
      await this.deletePid();
      throw error;
    }
  }

  /**
   * Stop the desktop agent
   */
  async stop(): Promise<void> {
    const pid = await this.getPid();
    if (!pid) {
      throw new Error('Agent is not running');
    }

    try {
      // Send SIGTERM
      process.kill(pid, 'SIGTERM');

      // Wait for process to exit (max 10 seconds)
      const timeout = setTimeout(() => {
        // Force kill if still running
        try {
          process.kill(pid, 'SIGKILL');
        } catch {
          // Process already dead
        }
      }, 10000);

      // Poll until process is dead
      while (await this.isRunning()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      clearTimeout(timeout);
      await this.deletePid();

      logger.success('Agent stopped');
    } catch (error) {
      if ((error as any).code === 'ESRCH') {
        // Process doesn't exist, clean up PID file
        await this.deletePid();
        throw new Error('Agent process not found');
      }
      throw error;
    }
  }

  /**
   * Restart the desktop agent
   */
  async restart(options: { detached?: boolean } = {}): Promise<void> {
    if (await this.isRunning()) {
      await this.stop();
    }
    await this.start(options);
  }

  /**
   * Get agent status
   */
  async getStatus(): Promise<AgentStatus> {
    const pid = await this.getPid();

    if (!pid) {
      return { running: false };
    }

    const running = await this.isRunning();
    if (!running) {
      await this.deletePid();
      return { running: false };
    }

    // Get process info
    const uptime = await this.getProcessUptime(pid);
    const version = await this.getAgentVersion();

    return {
      running: true,
      pid,
      uptime,
      version,
    };
  }

  /**
   * Check if agent is running
   */
  async isRunning(): Promise<boolean> {
    const pid = await this.getPid();
    if (!pid) {
      return false;
    }

    try {
      // Send signal 0 to check if process exists
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get agent version
   */
  async getAgentVersion(): Promise<string | undefined> {
    try {
      const versionFile = path.join(path.dirname(this.agentExecutable), '..', 'version.txt');
      if (await fs.pathExists(versionFile)) {
        const version = await fs.readFile(versionFile, 'utf-8');
        return version.trim();
      }
    } catch {
      // Ignore errors
    }
    return undefined;
  }

  /**
   * Save PID to file
   */
  private async savePid(pid: number): Promise<void> {
    await fs.ensureDir(path.dirname(this.pidFile));
    await fs.writeFile(this.pidFile, pid.toString(), 'utf-8');
  }

  /**
   * Get PID from file
   */
  private async getPid(): Promise<number | null> {
    try {
      if (await fs.pathExists(this.pidFile)) {
        const content = await fs.readFile(this.pidFile, 'utf-8');
        const pid = parseInt(content.trim(), 10);
        return isNaN(pid) ? null : pid;
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  /**
   * Delete PID file
   */
  private async deletePid(): Promise<void> {
    try {
      if (await fs.pathExists(this.pidFile)) {
        await fs.remove(this.pidFile);
      }
    } catch {
      // Ignore errors
    }
  }

  /**
   * Get process uptime in seconds
   */
  private async getProcessUptime(pid: number): Promise<number | undefined> {
    try {
      if (os.platform() === 'win32') {
        // Windows: use WMIC
        const { stdout } = await execa('wmic', [
          'process',
          'where',
          `ProcessId=${pid}`,
          'get',
          'CreationDate',
        ]);
        const match = stdout.match(/(\d{14})/);
        if (match) {
          const startTime = new Date(
            parseInt(match[1].substr(0, 4)),
            parseInt(match[1].substr(4, 2)) - 1,
            parseInt(match[1].substr(6, 2)),
            parseInt(match[1].substr(8, 2)),
            parseInt(match[1].substr(10, 2)),
            parseInt(match[1].substr(12, 2))
          );
          return Math.floor((Date.now() - startTime.getTime()) / 1000);
        }
      } else {
        // Unix: use ps
        const { stdout } = await execa('ps', ['-o', 'etime=', '-p', pid.toString()]);
        const parts = stdout.trim().split(/[-:]/);
        let seconds = 0;
        if (parts.length === 1) {
          // ss
          seconds = parseInt(parts[0]);
        } else if (parts.length === 2) {
          // mm:ss
          seconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        } else if (parts.length === 3) {
          // hh:mm:ss
          seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
        } else if (parts.length === 4) {
          // dd-hh:mm:ss
          seconds = parseInt(parts[0]) * 86400 + parseInt(parts[1]) * 3600 + parseInt(parts[2]) * 60 + parseInt(parts[3]);
        }
        return seconds;
      }
    } catch {
      // Ignore errors
    }
    return undefined;
  }

  /**
   * Get agent logs directory
   */
  getLogsDir(): string {
    return path.join(configManager.getAgentDir(), 'logs');
  }

  /**
   * Get latest log file
   */
  async getLatestLogFile(): Promise<string | null> {
    const logsDir = this.getLogsDir();
    if (!(await fs.pathExists(logsDir))) {
      return null;
    }

    const files = await fs.readdir(logsDir);
    const logFiles = files.filter(f => f.endsWith('.log')).sort().reverse();

    return logFiles.length > 0 ? path.join(logsDir, logFiles[0]) : null;
  }
}

export const agentManager = new AgentManager();
