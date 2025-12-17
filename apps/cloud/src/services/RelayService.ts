import { Server as SocketServer } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RelayMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
  fromUserId?: string;
  toAgentId?: string;
}

export class RelayService {
  private static io: SocketServer | null = null;

  /**
   * Initialize the relay service with Socket.IO
   */
  static initialize(io: SocketServer) {
    this.io = io;
  }

  /**
   * Send message to a specific desktop agent
   */
  static async sendToAgent(agentId: string, message: Omit<RelayMessage, 'id' | 'timestamp'>) {
    if (!this.io) {
      throw new Error('Socket.IO not initialized');
    }

    // Get agent details
    const agent = await prisma.desktopAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    if (agent.status !== 'ONLINE' || !agent.socketId) {
      throw new Error('Agent is not online');
    }

    const fullMessage: RelayMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      toAgentId: agentId,
    };

    // Send to agent's socket
    this.io.to(agent.socketId).emit('relay:message', fullMessage);

    return fullMessage;
  }

  /**
   * Send message to all user's agents
   */
  static async sendToUserAgents(userId: string, message: Omit<RelayMessage, 'id' | 'timestamp'>) {
    if (!this.io) {
      throw new Error('Socket.IO not initialized');
    }

    // Get all online agents for user
    const agents = await prisma.desktopAgent.findMany({
      where: {
        userId,
        status: 'ONLINE',
        socketId: { not: null },
      },
    });

    if (agents.length === 0) {
      throw new Error('No online agents found for user');
    }

    const messages = await Promise.all(
      agents.map((agent) => this.sendToAgent(agent.id, message))
    );

    return messages;
  }

  /**
   * Execute command on desktop agent
   */
  static async executeCommand(agentId: string, command: string, args?: any) {
    return this.sendToAgent(agentId, {
      type: 'execute:command',
      payload: {
        command,
        args,
      },
    });
  }

  /**
   * Request file from desktop agent
   */
  static async requestFile(agentId: string, filePath: string) {
    return this.sendToAgent(agentId, {
      type: 'request:file',
      payload: {
        filePath,
      },
    });
  }

  /**
   * Send file to desktop agent
   */
  static async sendFile(agentId: string, filePath: string, content: string) {
    return this.sendToAgent(agentId, {
      type: 'send:file',
      payload: {
        filePath,
        content,
      },
    });
  }

  /**
   * Request terminal output
   */
  static async requestTerminalOutput(agentId: string) {
    return this.sendToAgent(agentId, {
      type: 'request:terminal',
      payload: {},
    });
  }

  /**
   * Start screen recording on desktop agent
   */
  static async startRecording(agentId: string, sessionId: string, options?: any) {
    return this.sendToAgent(agentId, {
      type: 'recording:start',
      payload: {
        sessionId,
        options,
      },
    });
  }

  /**
   * Stop screen recording on desktop agent
   */
  static async stopRecording(agentId: string, sessionId: string) {
    return this.sendToAgent(agentId, {
      type: 'recording:stop',
      payload: {
        sessionId,
      },
    });
  }

  /**
   * Update agent status
   */
  static async updateAgentStatus(agentId: string, status: 'ONLINE' | 'OFFLINE' | 'BUSY', socketId?: string) {
    const agent = await prisma.desktopAgent.update({
      where: { id: agentId },
      data: {
        status,
        socketId,
        lastSeenAt: new Date(),
      },
    });

    // Notify user
    if (this.io) {
      this.io.to(`user:${agent.userId}`).emit('agent:status', {
        agentId,
        status,
        timestamp: new Date(),
      });
    }

    return agent;
  }

  /**
   * Register desktop agent
   */
  static async registerAgent(userId: string, socketId: string, agentData: {
    name?: string;
    version?: string;
    platform?: string;
  }) {
    // Check if agent already exists for this user
    let agent = await prisma.desktopAgent.findFirst({
      where: {
        userId,
        name: agentData.name || 'Desktop Agent',
      },
    });

    if (agent) {
      // Update existing agent
      agent = await prisma.desktopAgent.update({
        where: { id: agent.id },
        data: {
          status: 'ONLINE',
          socketId,
          version: agentData.version,
          platform: agentData.platform,
          lastSeenAt: new Date(),
        },
      });
    } else {
      // Create new agent
      agent = await prisma.desktopAgent.create({
        data: {
          userId,
          name: agentData.name || 'Desktop Agent',
          version: agentData.version,
          platform: agentData.platform,
          status: 'ONLINE',
          socketId,
        },
      });
    }

    // Notify user
    if (this.io) {
      this.io.to(`user:${userId}`).emit('agent:registered', {
        agent,
        timestamp: new Date(),
      });
    }

    return agent;
  }

  /**
   * Unregister desktop agent
   */
  static async unregisterAgent(agentId: string) {
    const agent = await prisma.desktopAgent.update({
      where: { id: agentId },
      data: {
        status: 'OFFLINE',
        socketId: null,
        lastSeenAt: new Date(),
      },
    });

    // Notify user
    if (this.io) {
      this.io.to(`user:${agent.userId}`).emit('agent:unregistered', {
        agentId,
        timestamp: new Date(),
      });
    }

    return agent;
  }

  /**
   * Get user's agents
   */
  static async getUserAgents(userId: string) {
    const agents = await prisma.desktopAgent.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
    });

    return agents;
  }

  /**
   * Ping agent to check if it's alive
   */
  static async pingAgent(agentId: string): Promise<boolean> {
    if (!this.io) {
      return false;
    }

    try {
      const response = await this.sendToAgent(agentId, {
        type: 'ping',
        payload: {},
      });

      return true;
    } catch (error) {
      return false;
    }
  }
}

export default RelayService;
