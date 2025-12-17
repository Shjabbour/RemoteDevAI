/**
 * Screen capture tools for taking screenshots
 */

import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import {
  ToolResponse,
  ImageData,
  CaptureScreenshotParams,
  CaptureRegionParams,
} from '../types.js';

/**
 * Capture screenshot of entire screen or specific display
 *
 * @example
 * const result = await captureScreenshot({
 *   display: 0,
 *   format: 'png',
 *   quality: 90
 * });
 */
export async function captureScreenshot(
  params: CaptureScreenshotParams
): Promise<ToolResponse<ImageData>> {
  try {
    const { display = 0, format = 'png', quality = 90, region } = params;

    // Capture screenshot
    let imageBuffer = await screenshot({ screen: display });

    // Process with sharp
    let image = sharp(imageBuffer);

    // Crop to region if specified
    if (region) {
      image = image.extract({
        left: region.x,
        top: region.y,
        width: region.width,
        height: region.height,
      });
    }

    // Convert to requested format
    switch (format) {
      case 'jpeg':
        image = image.jpeg({ quality });
        break;
      case 'webp':
        image = image.webp({ quality });
        break;
      case 'png':
      default:
        image = image.png({ quality });
        break;
    }

    // Get buffer and metadata
    const buffer = await image.toBuffer();
    const metadata = await sharp(buffer).metadata();

    const mimeTypes = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    };

    return {
      success: true,
      data: {
        base64: buffer.toString('base64'),
        mimeType: mimeTypes[format],
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: buffer.length,
      },
      message: `Screenshot captured successfully (${metadata.width}x${metadata.height})`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to capture screenshot',
      message: 'Screenshot capture failed',
    };
  }
}

/**
 * Capture specific region of the screen
 *
 * @example
 * const result = await captureRegion({
 *   x: 100,
 *   y: 100,
 *   width: 800,
 *   height: 600,
 *   format: 'jpeg',
 *   quality: 85
 * });
 */
export async function captureRegion(
  params: CaptureRegionParams
): Promise<ToolResponse<ImageData>> {
  try {
    const { x, y, width, height, format = 'png', quality = 90 } = params;

    // Capture full screenshot first
    const imageBuffer = await screenshot();

    // Extract region
    let image = sharp(imageBuffer).extract({
      left: x,
      top: y,
      width,
      height,
    });

    // Convert to requested format
    switch (format) {
      case 'jpeg':
        image = image.jpeg({ quality });
        break;
      case 'webp':
        image = image.webp({ quality });
        break;
      case 'png':
      default:
        image = image.png({ quality });
        break;
    }

    const buffer = await image.toBuffer();
    const metadata = await sharp(buffer).metadata();

    const mimeTypes = {
      png: 'image/png',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
    };

    return {
      success: true,
      data: {
        base64: buffer.toString('base64'),
        mimeType: mimeTypes[format],
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: buffer.length,
      },
      message: `Region captured successfully (${width}x${height})`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to capture region',
      message: 'Region capture failed',
    };
  }
}

/**
 * List available displays
 *
 * @example
 * const displays = await listDisplays();
 */
export async function listDisplays(): Promise<ToolResponse<{ count: number; displays: number[] }>> {
  try {
    const displays = await screenshot.listDisplays();

    return {
      success: true,
      data: {
        count: displays.length,
        displays: displays.map((_, index) => index),
      },
      message: `Found ${displays.length} display(s)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list displays',
      message: 'Display enumeration failed',
    };
  }
}

/**
 * Capture all displays
 *
 * @example
 * const result = await captureAllDisplays({ format: 'png' });
 */
export async function captureAllDisplays(params: {
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
}): Promise<ToolResponse<ImageData[]>> {
  try {
    const { format = 'png', quality = 90 } = params;

    const displays = await screenshot.listDisplays();
    const captures: ImageData[] = [];

    for (let i = 0; i < displays.length; i++) {
      const result = await captureScreenshot({
        display: i,
        format,
        quality,
      });

      if (result.success && result.data) {
        captures.push(result.data);
      }
    }

    return {
      success: true,
      data: captures,
      message: `Captured ${captures.length} display(s)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to capture all displays',
      message: 'Multi-display capture failed',
    };
  }
}

/**
 * Capture screenshot and save to file
 *
 * @example
 * await captureToFile('screenshot.png', {
 *   format: 'png',
 *   quality: 90
 * });
 */
export async function captureToFile(
  filePath: string,
  params: CaptureScreenshotParams
): Promise<ToolResponse<{ path: string; size: number }>> {
  try {
    const result = await captureScreenshot(params);

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Capture failed');
    }

    const buffer = Buffer.from(result.data.base64, 'base64');
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, buffer);

    return {
      success: true,
      data: {
        path: filePath,
        size: buffer.length,
      },
      message: `Screenshot saved to ${filePath}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save screenshot',
      message: 'File save failed',
    };
  }
}
