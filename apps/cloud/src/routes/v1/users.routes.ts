import { Router } from 'express';
import { UserService } from '../services/UserService';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { schemas } from '../middleware/validation.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/users/profile
 * Get user profile
 */
router.get('/profile', async (req: AuthRequest, res) => {
  try {
    const profile = await UserService.getProfile(req.user!.userId);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(404).json({
      success: false,
      error: 'Profile not found',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put(
  '/profile',
  validateBody(schemas.updateProfile),
  async (req: AuthRequest, res) => {
    try {
      const updatedUser = await UserService.updateProfile(req.user!.userId, req.body);

      res.json({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(400).json({
        success: false,
        error: 'Profile update failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * GET /api/users/statistics
 * Get user statistics
 */
router.get('/statistics', async (req: AuthRequest, res) => {
  try {
    const stats = await UserService.getStatistics(req.user!.userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/users/account
 * Delete user account
 */
router.delete('/account', async (req: AuthRequest, res) => {
  try {
    await UserService.deleteAccount(req.user!.userId);

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Account deletion failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
