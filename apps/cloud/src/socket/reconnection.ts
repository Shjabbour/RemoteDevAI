import { Server as SocketServer, Socket } from 'socket.io';
import { EventEmitter } from 'events';

interface SessionState {
  userId: string;
  agentId?: string;
  rooms: Set<string>;
  lastActivity: Date;
  missedMessages: any[];
}

/**
 * Reconnection handler for managing session restoration and missed messages
 */
export class ReconnectionHandler extends EventEmitter {
  private io: SocketServer;
  private sessions: Map<string, SessionState> = new Map();
  private messageHistory: Map<string, any[]> = new Map();

  // Configuration
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private readonly MESSAGE_HISTORY_LIMIT = 100;
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute

  constructor(io: SocketServer) {
    super();
    this.io = io;
    this.startCleanupInterval();
  }

  /**
   * Store session state for reconnection
   */
  storeSessionState(socket: Socket, userId: string, agentId?: string): void {
    const socketId = socket.id;

    // Get current rooms
    const rooms = new Set<string>();
    socket.rooms.forEach((room) => {
      if (room !== socketId) {
        rooms.add(room);
      }
    });

    this.sessions.set(socketId, {
      userId,
      agentId,
      rooms,
      lastActivity: new Date(),
      missedMessages: [],
    });

    console.log(`Session state stored for socket: ${socketId} (user: ${userId})`);
  }

  /**
   * Update session activity timestamp
   */
  updateSessionActivity(socketId: string): void {
    const session = this.sessions.get(socketId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * Store message in history for potential replay
   */
  storeMessage(room: string, event: string, data: any): void {
    if (!this.messageHistory.has(room)) {
      this.messageHistory.set(room, []);
    }

    const history = this.messageHistory.get(room)!;
    history.push({
      event,
      data,
      timestamp: new Date(),
    });

    // Limit history size
    if (history.length > this.MESSAGE_HISTORY_LIMIT) {
      history.shift();
    }
  }

  /**
   * Get missed messages since a timestamp
   */
  getMissedMessages(room: string, since: Date): any[] {
    const history = this.messageHistory.get(room);
    if (!history) return [];

    return history.filter((msg) => msg.timestamp > since);
  }

  /**
   * Handle reconnection request
   */
  async handleReconnection(
    socket: Socket,
    oldSocketId: string,
    since?: string
  ): Promise<{
    success: boolean;
    missedMessages?: any[];
    rooms?: string[];
    error?: string;
  }> {
    const session = this.sessions.get(oldSocketId);

    if (!session) {
      return {
        success: false,
        error: 'Session not found or expired',
      };
    }

    // Check if session is still valid
    const now = Date.now();
    const sessionAge = now - session.lastActivity.getTime();

    if (sessionAge > this.SESSION_TIMEOUT) {
      this.sessions.delete(oldSocketId);
      return {
        success: false,
        error: 'Session expired',
      };
    }

    // Restore rooms
    const rooms: string[] = [];
    for (const room of session.rooms) {
      socket.join(room);
      rooms.push(room);
    }

    // Get missed messages
    let missedMessages: any[] = [];
    if (since) {
      const sinceDate = new Date(since);
      for (const room of session.rooms) {
        const roomMissed = this.getMissedMessages(room, sinceDate);
        missedMessages.push(...roomMissed);
      }
    }

    // Update session with new socket ID
    this.sessions.delete(oldSocketId);
    this.sessions.set(socket.id, {
      ...session,
      lastActivity: new Date(),
    });

    console.log(
      `Session restored: ${socket.id} (${rooms.length} rooms, ${missedMessages.length} missed messages)`
    );

    this.emit('session-restored', {
      socketId: socket.id,
      userId: session.userId,
      rooms,
      missedMessages,
    });

    return {
      success: true,
      rooms,
      missedMessages,
    };
  }

  /**
   * Handle missed messages request
   */
  handleMissedMessagesRequest(
    socket: Socket,
    since: string
  ): {
    success: boolean;
    messages: any[];
  } {
    const sinceDate = new Date(since);
    const messages: any[] = [];

    // Get missed messages from all rooms the socket is in
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        const roomMissed = this.getMissedMessages(room, sinceDate);
        messages.push(...roomMissed);
      }
    });

    console.log(`Missed messages request: ${messages.length} messages since ${since}`);

    return {
      success: true,
      messages,
    };
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [socketId, session] of this.sessions.entries()) {
      const sessionAge = now - session.lastActivity.getTime();
      if (sessionAge > this.SESSION_TIMEOUT) {
        this.sessions.delete(socketId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired sessions`);
    }
  }

  /**
   * Clean up old message history
   */
  private cleanupMessageHistory(): void {
    const cutoff = Date.now() - this.SESSION_TIMEOUT;
    let cleaned = 0;

    for (const [room, messages] of this.messageHistory.entries()) {
      const filtered = messages.filter((msg) => msg.timestamp.getTime() > cutoff);
      if (filtered.length < messages.length) {
        cleaned += messages.length - filtered.length;
        this.messageHistory.set(room, filtered);
      }

      // Remove empty histories
      if (filtered.length === 0) {
        this.messageHistory.delete(room);
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old messages`);
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredSessions();
      this.cleanupMessageHistory();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Remove session state
   */
  removeSession(socketId: string): void {
    this.sessions.delete(socketId);
  }

  /**
   * Get session state
   */
  getSession(socketId: string): SessionState | undefined {
    return this.sessions.get(socketId);
  }

  /**
   * Get statistics
   */
  getStats(): {
    activeSessions: number;
    messageHistorySize: number;
    totalMessages: number;
  } {
    let totalMessages = 0;
    for (const messages of this.messageHistory.values()) {
      totalMessages += messages.length;
    }

    return {
      activeSessions: this.sessions.size,
      messageHistorySize: this.messageHistory.size,
      totalMessages,
    };
  }
}

// Singleton instance
let instance: ReconnectionHandler | null = null;

export function getReconnectionHandler(io: SocketServer): ReconnectionHandler {
  if (!instance) {
    instance = new ReconnectionHandler(io);
  }
  return instance;
}

/**
 * Initialize reconnection handlers for Socket.IO
 */
export function initializeReconnectionHandlers(io: SocketServer): void {
  const handler = getReconnectionHandler(io);

  io.on('connection', (socket) => {
    // Handle reconnection request
    socket.on('reconnect:request', async (data: { oldSocketId: string; since?: string }) => {
      const result = await handler.handleReconnection(socket, data.oldSocketId, data.since);
      socket.emit('reconnect:response', result);
    });

    // Handle missed messages request
    socket.on('request:missed-messages', (data: { since: string }) => {
      const result = handler.handleMissedMessagesRequest(socket, data.since);
      socket.emit('missed-messages', result);
    });

    // Store session state on authentication
    socket.on('authenticated', (data: { userId: string; agentId?: string }) => {
      handler.storeSessionState(socket, data.userId, data.agentId);
    });

    // Update activity on any event
    socket.onAny(() => {
      handler.updateSessionActivity(socket.id);
    });

    // Clean up on disconnect
    socket.on('disconnect', () => {
      // Keep session state for potential reconnection
      // It will be cleaned up after SESSION_TIMEOUT
    });
  });

  console.log('Reconnection handlers initialized');
}
