/**
 * AgentOrchestrator - Coordinates all 10 agents
 *
 * Features:
 * - Message routing between agents
 * - Event bus for agent communication
 * - Error recovery and retry logic
 * - Agent lifecycle management
 * - Health monitoring
 */

import EventEmitter from 'eventemitter3';
import {
  AgentType,
  AgentMessage,
  AgentContext,
  MessageType,
  EventPayload,
  UserPreferences,
  EnvironmentConfig,
} from '../types';
import { BaseAgent } from '../base/BaseAgent';
import { VoiceTranscriptionAgent } from '../agents/VoiceTranscriptionAgent';
import { IntentParserAgent } from '../agents/IntentParserAgent';
import { CodeOrchestratorAgent } from '../agents/CodeOrchestratorAgent';
import { FileSystemAgent } from '../agents/FileSystemAgent';
import { ScreenRecorderAgent } from '../agents/ScreenRecorderAgent';
import { VideoProcessingAgent } from '../agents/VideoProcessingAgent';
import { NotificationAgent } from '../agents/NotificationAgent';
import { SecurityAgent } from '../agents/SecurityAgent';
import { SessionManagerAgent } from '../agents/SessionManagerAgent';
import { FeedbackLoopAgent } from '../agents/FeedbackLoopAgent';
import winston from 'winston';

interface OrchestratorConfig {
  environment: EnvironmentConfig;
  defaultPreferences: UserPreferences;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Agent Orchestrator
 * Central coordinator for all agents
 */
export class AgentOrchestrator extends EventEmitter {
  private agents: Map<AgentType, BaseAgent> = new Map();
  private messageQueue: AgentMessage[] = [];
  private isProcessing: boolean = false;
  private environment: EnvironmentConfig;
  private defaultPreferences: UserPreferences;
  private logger: winston.Logger;

  constructor(config: OrchestratorConfig) {
    super();
    this.environment = config.environment;
    this.defaultPreferences = config.defaultPreferences;
    this.logger = this.createLogger(config.logLevel || 'info');
  }

  /**
   * Create logger for orchestrator
   */
  private createLogger(logLevel: string): winston.Logger {
    return winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `[${timestamp}] [Orchestrator] ${level.toUpperCase()}: ${message} ${
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
          filename: 'logs/orchestrator-error.log',
          level: 'error',
        }),
        new winston.transports.File({
          filename: 'logs/orchestrator.log',
        }),
      ],
    });
  }

  /**
   * Initialize all agents
   */
  public async initialize(): Promise<void> {
    this.logger.info('Initializing Agent Orchestrator');

    try {
      // Create all agents
      this.agents.set(
        AgentType.VOICE_TRANSCRIPTION,
        new VoiceTranscriptionAgent()
      );
      this.agents.set(AgentType.INTENT_PARSER, new IntentParserAgent());
      this.agents.set(AgentType.CODE_ORCHESTRATOR, new CodeOrchestratorAgent());
      this.agents.set(AgentType.FILE_SYSTEM, new FileSystemAgent());
      this.agents.set(AgentType.SCREEN_RECORDER, new ScreenRecorderAgent());
      this.agents.set(AgentType.VIDEO_PROCESSING, new VideoProcessingAgent());
      this.agents.set(AgentType.NOTIFICATION, new NotificationAgent());
      this.agents.set(AgentType.SECURITY, new SecurityAgent());
      this.agents.set(AgentType.SESSION_MANAGER, new SessionManagerAgent());
      this.agents.set(AgentType.FEEDBACK_LOOP, new FeedbackLoopAgent());

      // Initialize all agents
      for (const [type, agent] of this.agents.entries()) {
        await agent.initialize();
        this.setupAgentListeners(type, agent);
        this.logger.info(`Agent initialized: ${type}`);
      }

      // Start processing message queue
      this.startMessageProcessor();

      this.logger.info('Agent Orchestrator initialized successfully', {
        agentCount: this.agents.size,
      });
    } catch (error) {
      this.logger.error('Failed to initialize Agent Orchestrator', { error });
      throw error;
    }
  }

  /**
   * Setup event listeners for an agent
   */
  private setupAgentListeners(type: AgentType, agent: BaseAgent): void {
    // Listen for messages from agent
    agent.on('message', (message: AgentMessage) => {
      this.routeMessage(message);
    });

    // Listen for events from agent
    agent.on('event', (event: EventPayload) => {
      this.emit('agent-event', event);
      this.logger.debug('Agent event', { agentType: type, event: event.event });
    });

    // Listen for errors
    agent.on('error', (error: Error) => {
      this.logger.error('Agent error', { agentType: type, error });
      this.emit('agent-error', { agentType: type, error });
    });
  }

  /**
   * Route message to appropriate agent
   */
  private async routeMessage(message: AgentMessage): Promise<void> {
    this.logger.debug('Routing message', {
      messageId: message.id,
      type: message.type,
      source: message.source,
      target: message.target,
    });

    // If message has a specific target, route to that agent
    if (message.target) {
      const targetAgent = this.agents.get(message.target);
      if (targetAgent) {
        this.messageQueue.push(message);
      } else {
        this.logger.warn('Target agent not found', { target: message.target });
      }
    } else {
      // Broadcast message to all agents
      this.messageQueue.push(message);
    }
  }

  /**
   * Start processing message queue
   */
  private startMessageProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.messageQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) {
          await this.processMessage(message);
        }
      }

      this.isProcessing = false;
    }, 100); // Process queue every 100ms
  }

  /**
   * Process a single message
   */
  private async processMessage(message: AgentMessage): Promise<void> {
    try {
      if (message.target) {
        // Send to specific agent
        const agent = this.agents.get(message.target);
        if (agent) {
          // Build context (simplified - in production, get from session)
          const context = await this.buildContext(message);
          await agent.handleMessage(message, context);
        }
      } else {
        // Broadcast to all agents
        for (const agent of this.agents.values()) {
          const context = await this.buildContext(message);
          await agent.handleMessage(message, context);
        }
      }
    } catch (error) {
      this.logger.error('Failed to process message', { error, message });
    }
  }

  /**
   * Build agent context for message processing
   */
  private async buildContext(message: AgentMessage): Promise<AgentContext> {
    // In a real implementation, get session data from SessionManagerAgent
    // For now, create a default context

    return {
      sessionId: message.metadata?.sessionId || 'default',
      userId: message.metadata?.userId || 'default',
      projectId: message.metadata?.projectId || 'default',
      conversationHistory: [],
      userPreferences: this.defaultPreferences,
      environment: this.environment,
      metadata: message.metadata,
    };
  }

  /**
   * Send message to an agent
   */
  public async sendMessage(message: AgentMessage): Promise<void> {
    this.logger.info('Sending message', {
      messageId: message.id,
      type: message.type,
      target: message.target,
    });

    this.messageQueue.push(message);
  }

  /**
   * Get agent by type
   */
  public getAgent<T extends BaseAgent>(type: AgentType): T | undefined {
    return this.agents.get(type) as T | undefined;
  }

  /**
   * Get all agents
   */
  public getAllAgents(): Map<AgentType, BaseAgent> {
    return new Map(this.agents);
  }

  /**
   * Get orchestrator status
   */
  public getStatus(): {
    initialized: boolean;
    agentCount: number;
    queueSize: number;
    processing: boolean;
    agents: Record<string, any>;
  } {
    const agentStatuses: Record<string, any> = {};

    for (const [type, agent] of this.agents.entries()) {
      agentStatuses[type] = agent.getStatus();
    }

    return {
      initialized: this.agents.size > 0,
      agentCount: this.agents.size,
      queueSize: this.messageQueue.length,
      processing: this.isProcessing,
      agents: agentStatuses,
    };
  }

  /**
   * Health check for all agents
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    agents: Record<string, boolean>;
  }> {
    const health: Record<string, boolean> = {};
    let allHealthy = true;

    for (const [type, agent] of this.agents.entries()) {
      const status = agent.getStatus();
      const healthy = status.initialized && status.enabled;
      health[type] = healthy;

      if (!healthy) {
        allHealthy = false;
      }
    }

    return {
      healthy: allHealthy,
      agents: health,
    };
  }

  /**
   * Enable an agent
   */
  public enableAgent(type: AgentType): void {
    const agent = this.agents.get(type);
    if (agent) {
      agent.updateConfig({ enabled: true });
      this.logger.info('Agent enabled', { agentType: type });
    }
  }

  /**
   * Disable an agent
   */
  public disableAgent(type: AgentType): void {
    const agent = this.agents.get(type);
    if (agent) {
      agent.updateConfig({ enabled: false });
      this.logger.info('Agent disabled', { agentType: type });
    }
  }

  /**
   * Restart an agent
   */
  public async restartAgent(type: AgentType): Promise<void> {
    this.logger.info('Restarting agent', { agentType: type });

    const agent = this.agents.get(type);
    if (!agent) {
      throw new Error(`Agent ${type} not found`);
    }

    await agent.shutdown();
    await agent.initialize();

    this.logger.info('Agent restarted', { agentType: type });
  }

  /**
   * Graceful shutdown of all agents
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Agent Orchestrator');

    // Process remaining messages
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        await this.processMessage(message);
      }
    }

    // Shutdown all agents
    for (const [type, agent] of this.agents.entries()) {
      try {
        await agent.shutdown();
        this.logger.info('Agent shut down', { agentType: type });
      } catch (error) {
        this.logger.error('Failed to shutdown agent', { agentType: type, error });
      }
    }

    this.agents.clear();
    this.removeAllListeners();

    this.logger.info('Agent Orchestrator shut down successfully');
  }
}
