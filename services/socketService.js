const socketIO = require('socket.io');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

class SocketService {
  constructor() {
    this.io = null;
    this.connections = new Map(); // userId -> socketId mapping
  }

  initialize(server) {
    this.io = socketIO(server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        next();
      } catch (err) {
        logger.error('Socket authentication error:', err);
        next(new Error('Authentication error'));
      }
    });

    // Connection handling
    this.io.on('connection', (socket) => {
      logger.info(`User ${socket.userId} connected via WebSocket`);
      this.connections.set(socket.userId, socket.id);

      // Join user-specific room
      socket.join(`user-${socket.userId}`);
      
      // Join role-specific room
      if (socket.userRole) {
        socket.join(`role-${socket.userRole}`);
      }

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`User ${socket.userId} disconnected from WebSocket`);
        this.connections.delete(socket.userId);
      });

      // Handle notification read event
      socket.on('notification:read', async (notificationId) => {
        try {
          // Broadcast to all user's connections
          this.io.to(`user-${socket.userId}`).emit('notification:updated', {
            id: notificationId,
            read: true
          });
        } catch (error) {
          logger.error('Error handling notification read:', error);
        }
      });

      // Handle notification delete event
      socket.on('notification:delete', async (notificationId) => {
        try {
          // Broadcast to all user's connections
          this.io.to(`user-${socket.userId}`).emit('notification:deleted', notificationId);
        } catch (error) {
          logger.error('Error handling notification delete:', error);
        }
      });
    });

    logger.info('WebSocket server initialized');
  }

  // Send notification to specific user
  sendNotificationToUser(userId, notification) {
    if (this.io) {
      this.io.to(`user-${userId}`).emit('notification:new', notification);
      logger.info(`Sent notification to user ${userId}`);
    }
  }

  // Send notification to all users with specific role
  sendNotificationToRole(role, notification) {
    if (this.io) {
      this.io.to(`role-${role}`).emit('notification:new', notification);
      logger.info(`Sent notification to role ${role}`);
    }
  }

  // Broadcast notification to all connected users
  broadcastNotification(notification) {
    if (this.io) {
      this.io.emit('notification:new', notification);
      logger.info('Broadcast notification to all users');
    }
  }

  // Update notification for specific user
  updateNotificationForUser(userId, notificationId, updates) {
    if (this.io) {
      this.io.to(`user-${userId}`).emit('notification:updated', {
        id: notificationId,
        ...updates
      });
    }
  }

  // Delete notification for specific user
  deleteNotificationForUser(userId, notificationId) {
    if (this.io) {
      this.io.to(`user-${userId}`).emit('notification:deleted', notificationId);
    }
  }

  // Get connection status
  isUserConnected(userId) {
    return this.connections.has(userId);
  }

  // Get all connected users
  getConnectedUsers() {
    return Array.from(this.connections.keys());
  }
}

// Export singleton instance
module.exports = new SocketService();