/**
 * SessionManagerAgent - Manages user sessions and conversation history
 *
 * Features:
 * - Creates and manages sessions
 * - Stores conversation history
 * - Handles multiple projects
 * - Context switching between projects
 * - Session persistence
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseAgent } from '../base/BaseAgent';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentType,
  MessageType,
  SessionState,
  SessionStatus,
  ConversationMessage,
  SessionRecording,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

interface CreateSessionRequest {
  userId: string;
  projectId: string;
  metadata?: Record<string, any>;
}

interface UpdateSessionRequest {
  sessionId: string;
  status?: SessionStatus;
  addMessage?: ConversationMessage;
  addRecording?: SessionRecording;
  updateContext?: Record<string, any>;
}

/**
 * Session Manager Agent
 */
export class SessionManagerAgent extends BaseAgent {
  private sessions: Map<string, SessionState> = new Map();
  private userSessions: Map<string, Set<string>> = new Map(); // userId -> sessionIds
  private sessionsDir: string = '';

  constructor(config: Partial<AgentConfig> = {}) {
    super({
      name: 'Session Manager Agent',
      type: AgentType.SESSION_MANAGER,
      enabled: true,
      retryAttempts: 2,
      timeout: 10000,
      logLevel: 'info',
      ...config,
    });
  }

  /**
   * Initialize sessions directory and load persisted sessions
   */
  protected async onInitialize(): Promise<void> {
    this.sessionsDir = path.join(
      process.env.DATA_DIR || './data',
      'sessions'
    );

    await fs.mkdir(this.sessionsDir, { recursive: true });

    // Load persisted sessions
    await this.loadPersistedSessions();

    this.logger.info('Session Manager Agent initialized', {
      sessionsDir: this.sessionsDir,
      loadedSessions: this.sessions.size,
    });
  }

  /**
   * Process session management request
   */
  protected async process(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse<SessionState | SessionState[] | null>> {
    if (message.type !== MessageType.SESSION_UPDATE) {
      return this.createErrorResponse(
        'INVALID_MESSAGE_TYPE',
        `Expected SESSION_UPDATE, got ${message.type}`
      );
    }

    const payload = message.payload;

    try {
      if (payload.action === 'create') {
        const session = await this.createSession(payload.data as CreateSessionRequest);
        return this.createSuccessResponse(session);
      } else if (payload.action === 'update') {
        const session = await this.updateSession(payload.data as UpdateSessionRequest);
        return this.createSuccessResponse(session);
      } else if (payload.action === 'get') {
        const session = await this.getSession(payload.sessionId);
        return this.createSuccessResponse(session);
      } else if (payload.action === 'list') {
        const sessions = await this.listUserSessions(payload.userId);
        return this.createSuccessResponse(sessions);
      } else if (payload.action === 'delete') {
        await this.deleteSession(payload.sessionId);
        return this.createSuccessResponse(null);
      } else {
        return this.createErrorResponse('INVALID_ACTION', `Unknown action: ${payload.action}`);
      }
    } catch (error) {
      this.logger.error('Session operation failed', { error, payload });
      return this.createErrorResponse(
        'SESSION_OPERATION_FAILED',
        (error as Error).message,
        error
      );
    }
  }

  /**
   * Create a new session
   */
  public async createSession(request: CreateSessionRequest): Promise<SessionState> {
    const sessionId = uuidv4();
    const now = new Date().toISOString();

    const session: SessionState = {
      id: sessionId,
      userId: request.userId,
      projectId: request.projectId,
      status: SessionStatus.ACTIVE,
      startedAt: now,
      lastActivityAt: now,
      conversationHistory: [],
      context: request.metadata || {},
      recordings: [],
    };

    this.sessions.set(sessionId, session);

    // Track user sessions
    if (!this.userSessions.has(request.userId)) {
      this.userSessions.set(request.userId, new Set());
    }
    this.userSessions.get(request.userId)!.add(sessionId);

    // Persist session
    await this.persistSession(session);

    this.logger.info('Session created', {
      sessionId,
      userId: request.userId,
      projectId: request.projectId,
    });

    return session;
  }

  /**
   * Update an existing session
   */
  public async updateSession(request: UpdateSessionRequest): Promise<SessionState> {
    const session = this.sessions.get(request.sessionId);

    if (!session) {
      throw new Error(`Session ${request.sessionId} not found`);
    }

    // Update status
    if (request.status) {
      session.status = request.status;

      if (request.status === SessionStatus.COMPLETED) {
        session.endedAt = new Date().toISOString();
      }
    }

    // Add conversation message
    if (request.addMessage) {
      session.conversationHistory.push(request.addMessage);
    }

    // Add recording
    if (request.addRecording) {
      session.recordings.push(request.addRecording);
    }

    // Update context
    if (request.updateContext) {
      session.context = {
        ...session.context,
        ...request.updateContext,
      };
    }

    // Update last activity
    session.lastActivityAt = new Date().toISOString();

    // Persist updated session
    await this.persistSession(session);

    this.logger.debug('Session updated', {
      sessionId: request.sessionId,
      status: session.status,
      messagesCount: session.conversationHistory.length,
    });

    return session;
  }

  /**
   * Get a session by ID
   */
  public async getSession(sessionId: string): Promise<SessionState> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return session;
  }

  /**
   * List all sessions for a user
   */
  public async listUserSessions(
    userId: string,
    status?: SessionStatus
  ): Promise<SessionState[]> {
    const sessionIds = this.userSessions.get(userId) || new Set();
    const sessions: SessionState[] = [];

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && (!status || session.status === status)) {
        sessions.push(session);
      }
    }

    // Sort by last activity (most recent first)
    sessions.sort(
      (a, b) =>
        new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    );

    return sessions;
  }

  /**
   * Delete a session
   */
  public async deleteSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Remove from maps
    this.sessions.delete(sessionId);
    const userSessionSet = this.userSessions.get(session.userId);
    if (userSessionSet) {
      userSessionSet.delete(sessionId);
    }

    // Delete persisted file
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);
    try {
      await fs.unlink(sessionFile);
    } catch (error) {
      this.logger.warn('Failed to delete session file', { sessionFile, error });
    }

    this.logger.info('Session deleted', { sessionId });
  }

  /**
   * Add message to session conversation history
   */
  public async addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: Record<string, any>
  ): Promise<ConversationMessage> {
    const message: ConversationMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata,
    };

    await this.updateSession({
      sessionId,
      addMessage: message,
    });

    return message;
  }

  /**
   * Get conversation history for a session
   */
  public async getConversationHistory(
    sessionId: string,
    limit?: number
  ): Promise<ConversationMessage[]> {
    const session = await this.getSession(sessionId);
    const history = session.conversationHistory;

    if (limit && limit > 0) {
      return history.slice(-limit);
    }

    return history;
  }

  /**
   * Switch to a different project in the same session
   */
  public async switchProject(
    sessionId: string,
    newProjectId: string
  ): Promise<SessionState> {
    const session = await this.getSession(sessionId);

    // Add system message about project switch
    await this.addMessage(
      sessionId,
      'system',
      `Switched to project: ${newProjectId}`
    );

    // Update project ID
    session.projectId = newProjectId;

    // Clear context (project-specific context)
    session.context = {
      previousProject: session.projectId,
    };

    await this.persistSession(session);

    this.logger.info('Switched project', {
      sessionId,
      newProjectId,
    });

    return session;
  }

  /**
   * Pause a session
   */
  public async pauseSession(sessionId: string): Promise<SessionState> {
    return this.updateSession({
      sessionId,
      status: SessionStatus.PAUSED,
    });
  }

  /**
   * Resume a paused session
   */
  public async resumeSession(sessionId: string): Promise<SessionState> {
    return this.updateSession({
      sessionId,
      status: SessionStatus.ACTIVE,
    });
  }

  /**
   * Complete a session
   */
  public async completeSession(sessionId: string): Promise<SessionState> {
    return this.updateSession({
      sessionId,
      status: SessionStatus.COMPLETED,
    });
  }

  /**
   * Get active session for a user and project
   */
  public async getActiveSession(
    userId: string,
    projectId: string
  ): Promise<SessionState | null> {
    const sessions = await this.listUserSessions(userId, SessionStatus.ACTIVE);

    const activeSession = sessions.find(
      (session) => session.projectId === projectId
    );

    return activeSession || null;
  }

  /**
   * Persist session to disk
   */
  private async persistSession(session: SessionState): Promise<void> {
    const sessionFile = path.join(this.sessionsDir, `${session.id}.json`);

    try {
      await fs.writeFile(sessionFile, JSON.stringify(session, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error('Failed to persist session', { sessionId: session.id, error });
    }
  }

  /**
   * Load persisted sessions from disk
   */
  private async loadPersistedSessions(): Promise<void> {
    try {
      const files = await fs.readdir(this.sessionsDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const sessionFile = path.join(this.sessionsDir, file);
          const data = await fs.readFile(sessionFile, 'utf-8');
          const session: SessionState = JSON.parse(data);

          this.sessions.set(session.id, session);

          // Track user sessions
          if (!this.userSessions.has(session.userId)) {
            this.userSessions.set(session.userId, new Set());
          }
          this.userSessions.get(session.userId)!.add(session.id);
        } catch (error) {
          this.logger.warn('Failed to load session file', { file, error });
        }
      }

      this.logger.info('Loaded persisted sessions', { count: this.sessions.size });
    } catch (error) {
      this.logger.warn('Failed to read sessions directory', { error });
    }
  }

  /**
   * Cleanup old completed sessions
   */
  public async cleanupOldSessions(olderThanDays: number = 30): Promise<number> {
    const cutoffTime =
      Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions) {
      if (
        session.status === SessionStatus.COMPLETED &&
        session.endedAt &&
        new Date(session.endedAt).getTime() < cutoffTime
      ) {
        await this.deleteSession(sessionId);
        cleaned++;
      }
    }

    this.logger.info('Cleaned up old sessions', { count: cleaned });
    return cleaned;
  }

  /**
   * Get session statistics
   */
  public getStatistics(): {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    pausedSessions: number;
    totalUsers: number;
  } {
    let active = 0;
    let completed = 0;
    let paused = 0;

    for (const session of this.sessions.values()) {
      switch (session.status) {
        case SessionStatus.ACTIVE:
          active++;
          break;
        case SessionStatus.COMPLETED:
          completed++;
          break;
        case SessionStatus.PAUSED:
          paused++;
          break;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions: active,
      completedSessions: completed,
      pausedSessions: paused,
      totalUsers: this.userSessions.size,
    };
  }

  /**
   * Cleanup on shutdown
   */
  protected async onShutdown(): Promise<void> {
    this.logger.info('Persisting all sessions before shutdown');

    // Persist all sessions
    for (const session of this.sessions.values()) {
      await this.persistSession(session);
    }
  }
}
