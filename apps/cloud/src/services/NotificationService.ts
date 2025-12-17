import { Server as SocketServer } from 'socket.io';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  userId: string;
  data?: Record<string, any>;
  timestamp: Date;
}

export class NotificationService {
  private static io: SocketServer | null = null;

  /**
   * Initialize the notification service with Socket.IO
   */
  static initialize(io: SocketServer) {
    this.io = io;
  }

  /**
   * Send notification to a specific user
   */
  static async sendToUser(userId: string, notification: Omit<Notification, 'id' | 'userId' | 'timestamp'>) {
    if (!this.io) {
      console.warn('Socket.IO not initialized, cannot send notification');
      return;
    }

    const fullNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      timestamp: new Date(),
    };

    // Send to user's room
    this.io.to(`user:${userId}`).emit('notification', fullNotification);

    return fullNotification;
  }

  /**
   * Send notification to multiple users
   */
  static async sendToUsers(userIds: string[], notification: Omit<Notification, 'id' | 'userId' | 'timestamp'>) {
    const notifications = await Promise.all(
      userIds.map((userId) => this.sendToUser(userId, notification))
    );

    return notifications;
  }

  /**
   * Send session update notification
   */
  static async notifySessionUpdate(userId: string, sessionId: string, status: string, data?: any) {
    return this.sendToUser(userId, {
      type: 'info',
      title: 'Session Updated',
      message: `Session ${status}`,
      data: {
        sessionId,
        status,
        ...data,
      },
    });
  }

  /**
   * Send recording update notification
   */
  static async notifyRecordingUpdate(userId: string, recordingId: string, status: string, data?: any) {
    return this.sendToUser(userId, {
      type: status === 'READY' ? 'success' : 'info',
      title: 'Recording Updated',
      message: `Recording ${status}`,
      data: {
        recordingId,
        status,
        ...data,
      },
    });
  }

  /**
   * Send subscription update notification
   */
  static async notifySubscriptionUpdate(userId: string, tier: string, data?: any) {
    return this.sendToUser(userId, {
      type: 'success',
      title: 'Subscription Updated',
      message: `You are now on the ${tier} plan`,
      data: {
        tier,
        ...data,
      },
    });
  }

  /**
   * Send payment failed notification
   */
  static async notifyPaymentFailed(userId: string, data?: any) {
    return this.sendToUser(userId, {
      type: 'error',
      title: 'Payment Failed',
      message: 'Your recent payment failed. Please update your payment method.',
      data,
    });
  }

  /**
   * Send agent connection notification
   */
  static async notifyAgentStatus(userId: string, agentId: string, status: string, data?: any) {
    return this.sendToUser(userId, {
      type: status === 'ONLINE' ? 'success' : 'warning',
      title: 'Agent Status',
      message: `Desktop agent is ${status.toLowerCase()}`,
      data: {
        agentId,
        status,
        ...data,
      },
    });
  }

  /**
   * Send error notification
   */
  static async notifyError(userId: string, title: string, message: string, data?: any) {
    return this.sendToUser(userId, {
      type: 'error',
      title,
      message,
      data,
    });
  }

  /**
   * Broadcast to all connected users
   */
  static async broadcast(notification: Omit<Notification, 'id' | 'userId' | 'timestamp'>) {
    if (!this.io) {
      console.warn('Socket.IO not initialized, cannot broadcast');
      return;
    }

    const fullNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: 'broadcast',
      timestamp: new Date(),
    };

    this.io.emit('notification', fullNotification);

    return fullNotification;
  }
}

export default NotificationService;
