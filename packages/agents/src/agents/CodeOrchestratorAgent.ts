/**
 * CodeOrchestratorAgent - Main agent that communicates with Claude Code CLI
 *
 * Features:
 * - Spawns child process for claude-code CLI
 * - Manages conversation context
 * - Handles tool calls
 * - Streams responses back
 * - Executes code changes
 */

import { spawn, ChildProcess } from 'child_process';
import { BaseAgent } from '../base/BaseAgent';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentType,
  MessageType,
  ParsedIntent,
} from '../types';

interface CodeRequest {
  intent: ParsedIntent;
  prompt: string;
  workingDirectory: string;
  streamResponse?: boolean;
}

interface CodeResponse {
  success: boolean;
  output: string;
  filesChanged?: string[];
  commandsExecuted?: string[];
  error?: string;
}

/**
 * Code Orchestrator Agent
 * Manages interaction with Claude Code CLI
 */
export class CodeOrchestratorAgent extends BaseAgent {
  private claudeProcess: ChildProcess | null = null;
  private currentSession: string | null = null;
  private outputBuffer: string[] = [];

  constructor(config: Partial<AgentConfig> = {}) {
    super({
      name: 'Code Orchestrator Agent',
      type: AgentType.CODE_ORCHESTRATOR,
      enabled: true,
      retryAttempts: 2,
      timeout: 300000, // 5 minutes for code operations
      logLevel: 'info',
      ...config,
    });
  }

  /**
   * Initialize the agent
   */
  protected async onInitialize(): Promise<void> {
    this.logger.info('Code Orchestrator Agent initialized');
    // Verify claude-code CLI is available
    await this.verifyClaudeCLI();
  }

  /**
   * Verify Claude Code CLI is installed
   */
  private async verifyClaudeCLI(): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('claude-code', ['--version'], {
        shell: true,
      });

      let output = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          this.logger.info('Claude Code CLI verified', { version: output.trim() });
          resolve();
        } else {
          reject(new Error('Claude Code CLI not found. Please install it first.'));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to verify Claude Code CLI: ${error.message}`));
      });
    });
  }

  /**
   * Process code orchestration request
   */
  protected async process(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse<CodeResponse>> {
    if (message.type !== MessageType.INTENT_PARSED) {
      return this.createErrorResponse(
        'INVALID_MESSAGE_TYPE',
        `Expected INTENT_PARSED, got ${message.type}`
      );
    }

    const request = message.payload as CodeRequest;

    try {
      this.logger.info('Starting code orchestration', {
        category: request.intent.category,
        workingDirectory: request.workingDirectory,
      });

      // Build prompt for Claude Code
      const prompt = this.buildClaudePrompt(request.intent, context);

      // Execute with Claude Code CLI
      const response = await this.executeWithClaudeCLI(
        prompt,
        request.workingDirectory,
        context,
        request.streamResponse
      );

      // Notify about completion
      await this.sendMessage(MessageType.CODE_RESPONSE, response);

      this.logger.info('Code orchestration completed', {
        filesChanged: response.filesChanged?.length || 0,
        commandsExecuted: response.commandsExecuted?.length || 0,
      });

      return this.createSuccessResponse(response);
    } catch (error) {
      this.logger.error('Code orchestration failed', { error });
      return this.createErrorResponse(
        'ORCHESTRATION_FAILED',
        (error as Error).message,
        error
      );
    }
  }

  /**
   * Build prompt for Claude Code CLI
   */
  private buildClaudePrompt(intent: ParsedIntent, context: AgentContext): string {
    const parts: string[] = [];

    // Add intent summary
    parts.push(`Task: ${intent.summary}`);
    parts.push('');

    // Add detailed request
    if (intent.detailedRequest !== intent.summary) {
      parts.push(`Details: ${intent.detailedRequest}`);
      parts.push('');
    }

    // Add entities if present
    if (intent.entities.files?.length) {
      parts.push(`Files to modify: ${intent.entities.files.join(', ')}`);
    }
    if (intent.entities.functions?.length) {
      parts.push(`Functions involved: ${intent.entities.functions.join(', ')}`);
    }
    if (intent.entities.classes?.length) {
      parts.push(`Classes involved: ${intent.entities.classes.join(', ')}`);
    }
    if (intent.entities.packages?.length) {
      parts.push(`Packages to use: ${intent.entities.packages.join(', ')}`);
    }
    if (intent.entities.technologies?.length) {
      parts.push(`Technologies: ${intent.entities.technologies.join(', ')}`);
    }

    if (Object.values(intent.entities).some(arr => arr.length > 0)) {
      parts.push('');
    }

    // Add suggested actions
    if (intent.suggestedActions.length > 0) {
      parts.push('Suggested actions:');
      intent.suggestedActions.forEach((action, idx) => {
        parts.push(`${idx + 1}. ${action}`);
      });
      parts.push('');
    }

    // Add user preferences
    parts.push('Code style preferences:');
    parts.push(`- Indent: ${context.userPreferences.codeStyle.useTabs ? 'tabs' : context.userPreferences.codeStyle.indentSize + ' spaces'}`);
    parts.push(`- Line width: ${context.userPreferences.codeStyle.lineWidth}`);
    parts.push(`- Semicolons: ${context.userPreferences.codeStyle.semicolons ? 'yes' : 'no'}`);
    parts.push('');

    // Add context from conversation history
    const recentMessages = context.conversationHistory.slice(-5);
    if (recentMessages.length > 0) {
      parts.push('Recent conversation:');
      recentMessages.forEach((msg) => {
        parts.push(`${msg.role}: ${msg.content.substring(0, 150)}...`);
      });
    }

    return parts.join('\n');
  }

  /**
   * Execute code changes with Claude Code CLI
   */
  private async executeWithClaudeCLI(
    prompt: string,
    workingDirectory: string,
    context: AgentContext,
    streamResponse: boolean = false
  ): Promise<CodeResponse> {
    return new Promise((resolve, reject) => {
      this.outputBuffer = [];
      const filesChanged: string[] = [];
      const commandsExecuted: string[] = [];

      // Spawn claude-code process
      this.claudeProcess = spawn(
        'claude-code',
        [
          '--yes', // Auto-approve changes (can be configured)
          '--message',
          prompt,
        ],
        {
          cwd: workingDirectory,
          shell: true,
          env: {
            ...process.env,
            ANTHROPIC_API_KEY: context.environment.apiKeys.anthropic,
          },
        }
      );

      // Handle stdout
      this.claudeProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        this.outputBuffer.push(output);

        // Parse output for file changes and commands
        this.parseClaudeOutput(output, filesChanged, commandsExecuted);

        // Stream output if requested
        if (streamResponse) {
          this.emit('output-stream', {
            sessionId: context.sessionId,
            output,
          });
        }

        this.logger.debug('Claude output', { output: output.substring(0, 200) });
      });

      // Handle stderr
      this.claudeProcess.stderr?.on('data', (data) => {
        const error = data.toString();
        this.logger.warn('Claude stderr', { error });
        this.outputBuffer.push(`[ERROR] ${error}`);
      });

      // Handle process exit
      this.claudeProcess.on('close', (code) => {
        this.claudeProcess = null;

        if (code === 0) {
          resolve({
            success: true,
            output: this.outputBuffer.join(''),
            filesChanged,
            commandsExecuted,
          });
        } else {
          reject(
            new Error(
              `Claude Code CLI exited with code ${code}: ${this.outputBuffer.join('')}`
            )
          );
        }
      });

      // Handle process errors
      this.claudeProcess.on('error', (error) => {
        this.claudeProcess = null;
        reject(new Error(`Failed to spawn Claude Code CLI: ${error.message}`));
      });
    });
  }

  /**
   * Parse Claude CLI output to extract file changes and commands
   */
  private parseClaudeOutput(
    output: string,
    filesChanged: string[],
    commandsExecuted: string[]
  ): void {
    // Parse file changes (looking for common patterns)
    const filePatterns = [
      /Modified: (.+)/g,
      /Created: (.+)/g,
      /Deleted: (.+)/g,
      /Edited file: (.+)/g,
    ];

    filePatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const file = match[1].trim();
        if (!filesChanged.includes(file)) {
          filesChanged.push(file);
        }
      }
    });

    // Parse executed commands
    const commandPatterns = [
      /Executed: (.+)/g,
      /Running: (.+)/g,
      /\$ (.+)/g,
    ];

    commandPatterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        const command = match[1].trim();
        if (!commandsExecuted.includes(command)) {
          commandsExecuted.push(command);
        }
      }
    });
  }

  /**
   * Cancel current operation
   */
  public async cancelOperation(): Promise<void> {
    if (this.claudeProcess) {
      this.logger.info('Cancelling Claude Code operation');
      this.claudeProcess.kill('SIGTERM');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.claudeProcess) {
          this.logger.warn('Force killing Claude Code process');
          this.claudeProcess.kill('SIGKILL');
        }
      }, 5000);
    }
  }

  /**
   * Get current operation status
   */
  public getOperationStatus(): {
    running: boolean;
    session: string | null;
    outputLines: number;
  } {
    return {
      running: this.claudeProcess !== null,
      session: this.currentSession,
      outputLines: this.outputBuffer.length,
    };
  }

  /**
   * Cleanup on shutdown
   */
  protected async onShutdown(): Promise<void> {
    await this.cancelOperation();
    this.outputBuffer = [];
    this.currentSession = null;
  }
}
