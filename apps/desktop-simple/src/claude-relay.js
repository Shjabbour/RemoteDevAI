import { spawn } from 'child_process';
import os from 'os';
import path from 'path';

/**
 * ClaudeRelay - Handles spawning Claude Code CLI and capturing output
 */
export class ClaudeRelay {
  constructor() {
    this.activeSessions = new Map();
    this.sessionCounter = 0;
  }

  /**
   * Get the Claude CLI executable path based on OS
   */
  getClaudePath() {
    const platform = os.platform();

    if (platform === 'win32') {
      // Windows: claude.exe is typically in AppData or global npm
      const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      return 'claude'; // Assume it's in PATH
    } else if (platform === 'darwin') {
      // macOS
      return 'claude';
    } else {
      // Linux
      return 'claude';
    }
  }

  /**
   * Start a new Claude CLI session
   *
   * @param {string} command - The command to send to Claude
   * @param {Function} onOutput - Callback for output chunks
   * @param {Function} onError - Callback for errors
   * @param {Function} onExit - Callback when process exits
   * @returns {string} - Session ID
   */
  startSession(command, onOutput, onError, onExit) {
    const sessionId = `session-${++this.sessionCounter}`;

    console.log(`[ClaudeRelay] Starting session ${sessionId} with command: ${command}`);

    // Get current working directory from environment or use home directory
    const cwd = process.env.CLAUDE_CWD || process.cwd();

    // Spawn Claude CLI process
    // Using interactive mode to keep session alive
    const claudeProcess = spawn(this.getClaudePath(), {
      shell: true,
      cwd: cwd,
      env: {
        ...process.env,
        FORCE_COLOR: '1', // Enable colored output
        TERM: 'xterm-256color'
      }
    });

    // Send the command to Claude via stdin
    if (command) {
      claudeProcess.stdin.write(command + '\n');
    }

    // Capture stdout
    claudeProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[ClaudeRelay] [${sessionId}] stdout:`, output);
      onOutput({ type: 'stdout', data: output });
    });

    // Capture stderr
    claudeProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`[ClaudeRelay] [${sessionId}] stderr:`, output);
      onError({ type: 'stderr', data: output });
    });

    // Handle process exit
    claudeProcess.on('exit', (code, signal) => {
      console.log(`[ClaudeRelay] [${sessionId}] exited with code ${code}, signal ${signal}`);
      this.activeSessions.delete(sessionId);
      onExit({ code, signal });
    });

    // Handle process errors
    claudeProcess.on('error', (error) => {
      console.error(`[ClaudeRelay] [${sessionId}] error:`, error);
      onError({ type: 'error', data: error.message });
    });

    // Store session
    this.activeSessions.set(sessionId, {
      process: claudeProcess,
      command,
      startTime: new Date().toISOString()
    });

    return sessionId;
  }

  /**
   * Send input to an active session
   *
   * @param {string} sessionId - Session ID
   * @param {string} input - Input to send to Claude
   */
  sendInput(sessionId, input) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    console.log(`[ClaudeRelay] Sending input to ${sessionId}:`, input);
    session.process.stdin.write(input + '\n');
  }

  /**
   * Terminate a session
   *
   * @param {string} sessionId - Session ID
   */
  terminateSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    console.log(`[ClaudeRelay] Terminating session ${sessionId}`);
    session.process.kill('SIGTERM');
    this.activeSessions.delete(sessionId);
  }

  /**
   * Execute a one-off command (simpler version)
   *
   * @param {string} command - Command to execute
   * @param {Function} onOutput - Callback for output
   * @param {Function} onError - Callback for errors
   * @param {Function} onComplete - Callback when complete
   */
  executeCommand(command, onOutput, onError, onComplete) {
    console.log(`[ClaudeRelay] Executing command: ${command}`);

    const cwd = process.env.CLAUDE_CWD || process.cwd();

    // Spawn Claude CLI with the command directly
    const claudeProcess = spawn(this.getClaudePath(), [command], {
      shell: true,
      cwd: cwd,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        TERM: 'xterm-256color'
      }
    });

    let stdout = '';
    let stderr = '';

    claudeProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      onOutput({ type: 'stdout', data: output });
    });

    claudeProcess.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      onError({ type: 'stderr', data: output });
    });

    claudeProcess.on('exit', (code) => {
      onComplete({ code, stdout, stderr });
    });

    claudeProcess.on('error', (error) => {
      onError({ type: 'error', data: error.message });
      onComplete({ code: 1, stdout, stderr, error: error.message });
    });
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount() {
    return this.activeSessions.size;
  }

  /**
   * Get all active session IDs
   */
  getActiveSessionIds() {
    return Array.from(this.activeSessions.keys());
  }
}

export default ClaudeRelay;
