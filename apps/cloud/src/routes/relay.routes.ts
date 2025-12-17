import { Router } from 'express';
import { RelayService } from '../services/RelayService';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validateBody, validateParams, schemas } from '../middleware/validation.middleware';
import { checkAgentLimit } from '../middleware/subscription.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/relay/agents
 * Get all desktop agents for the current user
 */
router.get('/agents', async (req: AuthRequest, res) => {
  try {
    const agents = await RelayService.getUserAgents(req.user!.userId);

    res.json({
      success: true,
      data: agents,
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get agents',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/relay/agents/:id/message
 * Send a message to a desktop agent
 */
router.post(
  '/agents/:id/message',
  validateParams(schemas.id),
  validateBody(schemas.relayMessage),
  async (req: AuthRequest, res) => {
    try {
      const message = await RelayService.sendToAgent(req.params.id, {
        type: req.body.type,
        payload: req.body.payload,
        fromUserId: req.user!.userId,
      });

      res.json({
        success: true,
        data: message,
        message: 'Message sent to agent',
      });
    } catch (error) {
      console.error('Send message error:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/relay/agents/:id/execute
 * Execute a command on a desktop agent
 */
router.post(
  '/agents/:id/execute',
  validateParams(schemas.id),
  async (req: AuthRequest, res) => {
    try {
      const { command, args } = req.body;

      if (!command) {
        res.status(400).json({
          success: false,
          error: 'Missing command',
          message: 'Command is required',
        });
        return;
      }

      const message = await RelayService.executeCommand(req.params.id, command, args);

      res.json({
        success: true,
        data: message,
        message: 'Command sent to agent',
      });
    } catch (error) {
      console.error('Execute command error:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to execute command',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/relay/agents/:id/file/request
 * Request a file from desktop agent
 */
router.post(
  '/agents/:id/file/request',
  validateParams(schemas.id),
  async (req: AuthRequest, res) => {
    try {
      const { filePath } = req.body;

      if (!filePath) {
        res.status(400).json({
          success: false,
          error: 'Missing file path',
          message: 'filePath is required',
        });
        return;
      }

      const message = await RelayService.requestFile(req.params.id, filePath);

      res.json({
        success: true,
        data: message,
        message: 'File request sent to agent',
      });
    } catch (error) {
      console.error('Request file error:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to request file',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/relay/agents/:id/file/send
 * Send a file to desktop agent
 */
router.post(
  '/agents/:id/file/send',
  validateParams(schemas.id),
  async (req: AuthRequest, res) => {
    try {
      const { filePath, content } = req.body;

      if (!filePath || !content) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'filePath and content are required',
        });
        return;
      }

      const message = await RelayService.sendFile(req.params.id, filePath, content);

      res.json({
        success: true,
        data: message,
        message: 'File sent to agent',
      });
    } catch (error) {
      console.error('Send file error:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to send file',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/relay/agents/:id/recording/start
 * Start screen recording on desktop agent
 */
router.post(
  '/agents/:id/recording/start',
  validateParams(schemas.id),
  async (req: AuthRequest, res) => {
    try {
      const { sessionId, options } = req.body;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Missing session ID',
          message: 'sessionId is required',
        });
        return;
      }

      const message = await RelayService.startRecording(req.params.id, sessionId, options);

      res.json({
        success: true,
        data: message,
        message: 'Recording started on agent',
      });
    } catch (error) {
      console.error('Start recording error:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to start recording',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/relay/agents/:id/recording/stop
 * Stop screen recording on desktop agent
 */
router.post(
  '/agents/:id/recording/stop',
  validateParams(schemas.id),
  async (req: AuthRequest, res) => {
    try {
      const { sessionId } = req.body;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Missing session ID',
          message: 'sessionId is required',
        });
        return;
      }

      const message = await RelayService.stopRecording(req.params.id, sessionId);

      res.json({
        success: true,
        data: message,
        message: 'Recording stopped on agent',
      });
    } catch (error) {
      console.error('Stop recording error:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to stop recording',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/relay/agents/:id/ping
 * Ping agent to check if it's alive
 */
router.post(
  '/agents/:id/ping',
  validateParams(schemas.id),
  async (req: AuthRequest, res) => {
    try {
      const isAlive = await RelayService.pingAgent(req.params.id);

      res.json({
        success: true,
        data: { isAlive },
        message: isAlive ? 'Agent is alive' : 'Agent is not responding',
      });
    } catch (error) {
      console.error('Ping agent error:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to ping agent',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
