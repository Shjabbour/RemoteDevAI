/**
 * BaseAgent - Abstract base class for all RemoteDevAI agents
 *
 * Provides common functionality including:
 * - Event emission
 * - Logging
 * - Error handling
 * - Message processing pipeline
 */

import EventEmitter from 'eventemitter3';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentType,
  AgentEvent,
  EventPayload,
  MessageType,
} from '../types';

/**
 * Abstract base class for all agents
 */
export abstract class BaseAgent extends EventEmitter {
  protected readonly config: AgentConfig;
  protected readonly logger: winston.Logger;
  protected isInitialized: boolean = false;
  protected processingQueue: AgentMessage[] = [];
  protected isProcessing: boolean = false;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.logger = this.createLogger();
  }

  /**
   * Creates a Winston logger instance for the agent
   */
  private createLogger(): winston.Logger {
    return winston.createLogger({
      level: this.config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `[${timestamp}] [${this.config.type}] ${level.toUpperCase()}: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
        new winston.transports.File({
          filename: `logs/${this.config.type}-error.log`,
          level: 'error',
        }),
        new winston.transports.File({
          filename: `logs/${this.config.type}.log`,
        }),
      ],
    });
  }

  /**
   * Initialize the agent
   * Subclasses can override to perform specific initialization
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.info(`Initializing ${this.config.name}`);

      await this.onInitialize();

      this.isInitialized = true;
      this.emitEvent(AgentEvent.INITIALIZED, { config: this.config });
      this.logger.info(`${this.config.name} initialized successfully`);
    } catch (error) {
      this.logger.error(`Failed to initialize ${this.config.name}`, { error });
      throw error;
    }
  }

  /**
   * Hook for subclasses to perform initialization
   */
  protected async onInitialize(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Process an incoming message
   * Implements retry logic and error handling
   */
  public async handleMessage(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse> {
    if (!this.config.enabled) {
      return this.createErrorResponse('AGENT_DISABLED', 'Agent is disabled');
    }

    if (!this.isInitialized) {
      return this.createErrorResponse('NOT_INITIALIZED', 'Agent not initialized');
    }

    this.emitEvent(AgentEvent.MESSAGE_RECEIVED, { message });
    this.logger.debug('Received message', { messageId: message.id, type: message.type });

    let lastError: Error | null = null;
    const maxAttempts = this.config.retryAttempts || 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.emitEvent(AgentEvent.PROCESSING_START, { message, attempt });

        // Apply timeout
        const timeoutMs = this.config.timeout || 30000;
        const response = await this.withTimeout(
          this.process(message, context),
          timeoutMs
        );

        this.emitEvent(AgentEvent.PROCESSING_COMPLETE, { message, response });
        this.logger.debug('Message processed successfully', {
          messageId: message.id,
          attempt,
        });

        return response;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Processing attempt ${attempt} failed`, {
          messageId: message.id,
          error: lastError.message,
        });

        if (attempt < maxAttempts) {
          // Exponential backoff
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    // All attempts failed
    const errorResponse = this.createErrorResponse(
      'PROCESSING_FAILED',
      `Failed after ${maxAttempts} attempts: ${lastError?.message}`,
      lastError
    );

    this.emitEvent(AgentEvent.PROCESSING_ERROR, {
      message,
      error: lastError,
    });

    return errorResponse;
  }

  /**
   * Abstract method to be implemented by subclasses
   * Contains the core processing logic
   */
  protected abstract process(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse>;

  /**
   * Send a message to another agent or the orchestrator
   */
  protected async sendMessage(
    type: MessageType,
    payload: any,
    target?: AgentType
  ): Promise<void> {
    const message: AgentMessage = {
      id: uuidv4(),
      type,
      source: this.config.type,
      target,
      timestamp: new Date().toISOString(),
      payload,
    };

    this.emitEvent(AgentEvent.MESSAGE_SENT, { message });
    this.logger.debug('Sending message', {
      messageId: message.id,
      type,
      target,
    });

    // Emit to orchestrator for routing
    this.emit('message', message);
  }

  /**
   * Emit an agent event
   */
  protected emitEvent(event: AgentEvent, data: any): void {
    const payload: EventPayload = {
      agentType: this.config.type,
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    this.emit('event', payload);
  }

  /**
   * Create a success response
   */
  protected createSuccessResponse<T>(data: T, metadata?: Record<string, any>): AgentResponse<T> {
    return {
      success: true,
      data,
      metadata,
    };
  }

  /**
   * Create an error response
   */
  protected createErrorResponse(
    code: string,
    message: string,
    details?: any
  ): AgentResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
    };
  }

  /**
   * Execute a function with timeout
   */
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Delay helper
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate input using a validation function
   */
  protected async validate<T>(
    data: any,
    validator: (data: any) => T
  ): Promise<T> {
    try {
      return validator(data);
    } catch (error) {
      this.logger.error('Validation failed', { error, data });
      throw new Error(`Validation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    this.logger.info(`Shutting down ${this.config.name}`);

    try {
      await this.onShutdown();
      this.removeAllListeners();
      this.isInitialized = false;
      this.logger.info(`${this.config.name} shut down successfully`);
    } catch (error) {
      this.logger.error(`Error during shutdown`, { error });
      throw error;
    }
  }

  /**
   * Hook for subclasses to perform cleanup
   */
  protected async onShutdown(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Get agent status
   */
  public getStatus(): {
    type: AgentType;
    name: string;
    initialized: boolean;
    enabled: boolean;
    processing: boolean;
    queueSize: number;
  } {
    return {
      type: this.config.type,
      name: this.config.name,
      initialized: this.isInitialized,
      enabled: this.config.enabled,
      processing: this.isProcessing,
      queueSize: this.processingQueue.length,
    };
  }

  /**
   * Update agent configuration
   */
  public updateConfig(updates: Partial<AgentConfig>): void {
    Object.assign(this.config, updates);
    this.logger.info('Configuration updated', { updates });
    this.emitEvent(AgentEvent.STATE_CHANGED, { config: this.config });
  }
}
