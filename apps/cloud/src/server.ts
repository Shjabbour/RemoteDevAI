import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config';
import { initializeSocketHandlers } from './socket/socketHandler';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { versionMiddlewareStack } from './middleware/version.middleware';
import { deprecationMiddleware } from './versioning/deprecation';
import { compatibilityMiddleware, addCompatibilityWarnings } from './versioning/compatibility';
import { LATEST_VERSION } from './versioning';

// Import versioned routes
import v1Routes from './routes/v1';
import v2Routes from './routes/v2';

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new SocketServer(httpServer, {
  cors: {
    origin: config.socketCorsOrigin.split(',').map(o => o.trim()),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Middleware for raw body (needed for webhooks)
app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '10mb' }));
app.use('/api/webhooks', (req: any, res, next) => {
  req.rawBody = req.body;
  next();
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production',
  crossOriginEmbedderPolicy: config.nodeEnv === 'production',
}));

app.use(cors({
  origin: config.corsOrigin.split(',').map(o => o.trim()),
  credentials: true,
}));

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// Body parsing (for non-webhook routes)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// Apply versioning middleware to all API routes
app.use('/api', ...versionMiddlewareStack());
app.use('/api', compatibilityMiddleware);
app.use('/api', addCompatibilityWarnings);
app.use('/api', deprecationMiddleware);

// Versioned API routes
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);

// Default unversioned routes (map to latest version)
app.use('/api', v2Routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'RemoteDevAI Cloud API',
    version: '1.0.0',
    apiVersion: LATEST_VERSION,
    supportedVersions: ['v1', 'v2'],
    documentation: '/api/docs',
    endpoints: {
      v1: '/api/v1',
      v2: '/api/v2',
      latest: '/api',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: 'The requested endpoint does not exist',
    path: req.path,
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: config.nodeEnv === 'production'
      ? 'An unexpected error occurred'
      : err.message,
    ...(config.nodeEnv !== 'production' && { stack: err.stack }),
  });
});

// Initialize Socket.IO handlers
initializeSocketHandlers(io);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Close HTTP server
  httpServer.close(() => {
    console.log('HTTP server closed');
  });

  // Close Socket.IO
  io.close(() => {
    console.log('Socket.IO closed');
  });

  // Give ongoing requests time to finish
  setTimeout(() => {
    console.log('Forcing shutdown');
    process.exit(0);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
const PORT = config.port;

httpServer.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`RemoteDevAI Cloud Backend`);
  console.log('='.repeat(50));
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log('='.repeat(50));
  console.log(`Features:`);
  console.log(`  - Subscriptions: ${config.features.enableSubscriptions ? 'Enabled' : 'Disabled'}`);
  console.log(`  - Recordings: ${config.features.enableRecordings ? 'Enabled' : 'Disabled'}`);
  console.log(`  - Clerk Auth: ${config.features.enableClerkAuth ? 'Enabled' : 'Disabled'}`);
  console.log('='.repeat(50));
  console.log('Server is ready to accept connections');
  console.log('Press Ctrl+C to stop');
  console.log('='.repeat(50));
});

export { app, httpServer, io };
