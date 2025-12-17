/**
 * Tests for screen capture tool
 */

import { captureScreen, captureWindow, captureRegion } from '../tools/screenCapture';

// Mock screenshot-desktop
jest.mock('screenshot-desktop', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(Buffer.from('mock-image-data'))
}));

describe('screenCapture', () => {
  describe('captureScreen', () => {
    it('should capture full screen', async () => {
      const result = await captureScreen();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle capture errors', async () => {
      const screenshot = require('screenshot-desktop').default;
      screenshot.mockRejectedValueOnce(new Error('Capture failed'));

      const result = await captureScreen();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should support different formats', async () => {
      const result = await captureScreen({ format: 'jpg', quality: 80 });

      expect(result.success).toBe(true);
    });
  });

  describe('captureWindow', () => {
    it('should capture specific window', async () => {
      const result = await captureWindow('window-id-123');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should validate window ID', async () => {
      const result = await captureWindow('');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('window ID');
    });
  });

  describe('captureRegion', () => {
    it('should capture specific region', async () => {
      const result = await captureRegion({
        x: 0,
        y: 0,
        width: 800,
        height: 600
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should validate region dimensions', async () => {
      const result = await captureRegion({
        x: 0,
        y: 0,
        width: -100,
        height: 600
      });

      expect(result.success).toBe(false);
    });
  });
});
