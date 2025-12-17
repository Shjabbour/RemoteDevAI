import { Router } from 'express';
import { AuthService } from '../services/AuthService';
import { validateBody } from '../middleware/validation.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { schemas } from '../middleware/validation.middleware';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  authLimiter,
  validateBody(schemas.register),
  async (req, res) => {
    try {
      const result = await AuthService.register(req.body);

      res.status(201).json({
        success: true,
        data: result,
        message: 'Registration successful',
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({
        success: false,
        error: 'Registration failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Login a user
 */
router.post(
  '/login',
  authLimiter,
  validateBody(schemas.login),
  async (req, res) => {
    try {
      const result = await AuthService.login(req.body);

      res.json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        error: 'Login failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Token required',
        message: 'Please provide a token to refresh',
      });
      return;
    }

    const result = await AuthService.refreshToken(token);

    res.json({
      success: true,
      data: result,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: 'Token refresh failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await AuthService.getUserById(req.user!.userId);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(404).json({
      success: false,
      error: 'User not found',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal, but endpoint for consistency)
 */
router.post('/logout', authenticate, async (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

export default router;
