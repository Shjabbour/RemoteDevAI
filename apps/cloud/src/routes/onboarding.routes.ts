import { Router } from 'express';
import { auth } from '@clerk/express';
import OnboardingService from '../services/OnboardingService';

const router = Router();

/**
 * @route   GET /api/onboarding/progress
 * @desc    Get user's onboarding progress
 * @access  Private
 */
router.get('/progress', auth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const progress = await OnboardingService.getProgress(userId);

    res.json({
      success: true,
      data: progress,
    });
  } catch (error: any) {
    console.error('Error getting onboarding progress:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get onboarding progress',
    });
  }
});

/**
 * @route   GET /api/onboarding/steps
 * @desc    Get all onboarding steps configuration
 * @access  Private
 */
router.get('/steps', auth(), async (req, res) => {
  try {
    const steps = OnboardingService.getSteps();

    res.json({
      success: true,
      data: steps,
    });
  } catch (error: any) {
    console.error('Error getting onboarding steps:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get onboarding steps',
    });
  }
});

/**
 * @route   GET /api/onboarding/steps/:step
 * @desc    Get specific onboarding step data
 * @access  Private
 */
router.get('/steps/:step', auth(), async (req, res) => {
  try {
    const step = parseInt(req.params.step);

    if (isNaN(step)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid step number',
      });
    }

    const stepData = OnboardingService.getStep(step);

    if (!stepData) {
      return res.status(404).json({
        success: false,
        message: 'Step not found',
      });
    }

    res.json({
      success: true,
      data: stepData,
    });
  } catch (error: any) {
    console.error('Error getting onboarding step:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get onboarding step',
    });
  }
});

/**
 * @route   POST /api/onboarding/complete-step
 * @desc    Complete an onboarding step
 * @access  Private
 */
router.post('/complete-step', auth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { step, data } = req.body;

    if (!step || typeof step !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Step number is required',
      });
    }

    const progress = await OnboardingService.completeStep(userId, {
      step,
      data,
    });

    res.json({
      success: true,
      data: progress,
      message: 'Step completed successfully',
    });
  } catch (error: any) {
    console.error('Error completing onboarding step:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete onboarding step',
    });
  }
});

/**
 * @route   POST /api/onboarding/skip-step
 * @desc    Skip an onboarding step
 * @access  Private
 */
router.post('/skip-step', auth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { step } = req.body;

    if (!step || typeof step !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Step number is required',
      });
    }

    const progress = await OnboardingService.skipStep(userId, step);

    res.json({
      success: true,
      data: progress,
      message: 'Step skipped successfully',
    });
  } catch (error: any) {
    console.error('Error skipping onboarding step:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to skip onboarding step',
    });
  }
});

/**
 * @route   POST /api/onboarding/skip
 * @desc    Skip entire onboarding
 * @access  Private
 */
router.post('/skip', auth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    await OnboardingService.skipOnboarding(userId);

    res.json({
      success: true,
      message: 'Onboarding skipped successfully',
    });
  } catch (error: any) {
    console.error('Error skipping onboarding:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to skip onboarding',
    });
  }
});

/**
 * @route   PATCH /api/onboarding
 * @desc    Update onboarding state
 * @access  Private
 */
router.patch('/', auth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const progress = await OnboardingService.updateOnboarding(userId, req.body);

    res.json({
      success: true,
      data: progress,
      message: 'Onboarding updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating onboarding:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update onboarding',
    });
  }
});

/**
 * @route   POST /api/onboarding/reset
 * @desc    Reset onboarding (for testing or re-onboarding)
 * @access  Private
 */
router.post('/reset', auth(), async (req, res) => {
  try {
    const userId = req.auth.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    await OnboardingService.resetOnboarding(userId);

    res.json({
      success: true,
      message: 'Onboarding reset successfully',
    });
  } catch (error: any) {
    console.error('Error resetting onboarding:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset onboarding',
    });
  }
});

/**
 * @route   GET /api/onboarding/statistics
 * @desc    Get onboarding statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/statistics', auth(), async (req, res) => {
  try {
    // TODO: Add admin role check

    const { dateFrom, dateTo } = req.query;

    const stats = await OnboardingService.getStatistics(
      dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo ? new Date(dateTo as string) : undefined
    );

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error getting onboarding statistics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get onboarding statistics',
    });
  }
});

export default router;
