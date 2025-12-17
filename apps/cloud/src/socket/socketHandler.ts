import { Server as SocketServer, Socket } from 'socket.io';
import { AuthService } from '../services/AuthService';
import { RelayService } from '../services/RelayService';
import { NotificationService } from '../services/NotificationService';
import { UserService } from '../services/UserService';
import {
  joinUserRoom,
  joinProjectRoom,
  leaveProjectRoom,
  joinSessionRoom,
  leaveSessionRoom,
  joinAgentRoom,
  leaveAgentRoom,
} from './rooms';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  agentId?: string;
}

/**
 * Initialize Socket.IO handlers
 */
export const initializeSocketHandlers = (io: SocketServer) => {
  // Initialize services with Socket.IO instance
  NotificationService.initialize(io);
  RelayService.initialize(io);

  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Authentication middleware for socket
    socket.on('authenticate', async (data: { token: string }) => {
      try {
        const { token } = data;
        const payload = AuthService.verifyToken(token);

        socket.userId = payload.userId;

        // Join user's personal room
        joinUserRoom(socket, payload.userId);

        // Update last seen
        await UserService.updateLastSeen(payload.userId);

        socket.emit('authenticated', {
          success: true,
          userId: payload.userId,
        });

        console.log(`Socket authenticated: ${socket.id} (User: ${payload.userId})`);
      } catch (error) {
        socket.emit('authentication_error', {
          success: false,
          error: 'Authentication failed',
          message: error instanceof Error ? error.message : 'Invalid token',
        });
      }
    });

    // Join project room
    socket.on('join:project', (data: { projectId: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      joinProjectRoom(socket, data.projectId);
      socket.emit('joined:project', { projectId: data.projectId });
      console.log(`Socket ${socket.id} joined project: ${data.projectId}`);
    });

    // Leave project room
    socket.on('leave:project', (data: { projectId: string }) => {
      leaveProjectRoom(socket, data.projectId);
      socket.emit('left:project', { projectId: data.projectId });
      console.log(`Socket ${socket.id} left project: ${data.projectId}`);
    });

    // Join session room
    socket.on('join:session', (data: { sessionId: string }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      joinSessionRoom(socket, data.sessionId);
      socket.emit('joined:session', { sessionId: data.sessionId });
      console.log(`Socket ${socket.id} joined session: ${data.sessionId}`);
    });

    // Leave session room
    socket.on('leave:session', (data: { sessionId: string }) => {
      leaveSessionRoom(socket, data.sessionId);
      socket.emit('left:session', { sessionId: data.sessionId });
      console.log(`Socket ${socket.id} left session: ${data.sessionId}`);
    });

    // Agent registration
    socket.on('agent:register', async (data: { name?: string; version?: string; platform?: string }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const agent = await RelayService.registerAgent(socket.userId, socket.id, data);

        socket.agentId = agent.id;
        joinAgentRoom(socket, agent.id);

        socket.emit('agent:registered', { agent });
        console.log(`Agent registered: ${agent.id} (Socket: ${socket.id})`);
      } catch (error) {
        socket.emit('agent:error', {
          error: 'Registration failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Agent unregistration
    socket.on('agent:unregister', async () => {
      try {
        if (!socket.agentId) {
          return;
        }

        await RelayService.unregisterAgent(socket.agentId);
        leaveAgentRoom(socket, socket.agentId);

        socket.emit('agent:unregistered', { agentId: socket.agentId });
        console.log(`Agent unregistered: ${socket.agentId}`);

        socket.agentId = undefined;
      } catch (error) {
        socket.emit('agent:error', {
          error: 'Unregistration failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Agent status update
    socket.on('agent:status', async (data: { status: 'ONLINE' | 'OFFLINE' | 'BUSY' }) => {
      try {
        if (!socket.agentId) {
          socket.emit('error', { message: 'Agent not registered' });
          return;
        }

        await RelayService.updateAgentStatus(socket.agentId, data.status, socket.id);
        console.log(`Agent status updated: ${socket.agentId} -> ${data.status}`);
      } catch (error) {
        socket.emit('agent:error', {
          error: 'Status update failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Relay message response (from agent)
    socket.on('relay:response', (data: { messageId: string; response: any }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Forward response to user
      io.to(`user:${socket.userId}`).emit('relay:response', data);
      console.log(`Relay response: ${data.messageId}`);
    });

    // Ping/Pong for keeping connection alive
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Session message (for real-time chat)
    socket.on('session:message', async (data: {
      sessionId: string;
      message: any;
    }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Broadcast to session room
      io.to(`session:${data.sessionId}`).emit('session:message', {
        sessionId: data.sessionId,
        message: data.message,
        timestamp: new Date(),
      });
    });

    // Recording status update
    socket.on('recording:status', (data: {
      recordingId: string;
      status: string;
      progress?: number;
    }) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Broadcast to user
      io.to(`user:${socket.userId}`).emit('recording:status', {
        ...data,
        timestamp: new Date(),
      });
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);

      // Unregister agent if registered
      if (socket.agentId) {
        try {
          await RelayService.unregisterAgent(socket.agentId);
          console.log(`Agent auto-unregistered: ${socket.agentId}`);
        } catch (error) {
          console.error('Error unregistering agent on disconnect:', error);
        }
      }
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`Socket error (${socket.id}):`, error);
    });
  });

  console.log('Socket.IO handlers initialized');
};

export default initializeSocketHandlers;
