/**
 * Browser automation tools using Playwright
 */

import {
  launchBrowser,
  closeBrowser,
  navigateToUrl,
  clickElement as playwrightClick,
  typeText as playwrightType,
  takeScreenshot as playwrightScreenshot,
  startRecording as playwrightStartRecording,
  stopRecording as playwrightStopRecording,
  getCurrentBrowser,
  waitForSelector,
  executeScript,
  getElementText,
  fillForm,
} from '../utils/playwright.js';

import {
  ToolResponse,
  ImageData,
  VideoData,
  OpenBrowserParams,
  ClickElementParams,
  TypeTextParams,
  TakeScreenshotParams,
  RecordBrowserParams,
} from '../types.js';

/**
 * Open browser and navigate to URL
 *
 * @example
 * const result = await openBrowser({
 *   url: 'https://example.com',
 *   browser: 'chromium',
 *   headless: true,
 *   viewport: { width: 1920, height: 1080 }
 * });
 */
export async function openBrowser(
  params: OpenBrowserParams
): Promise<ToolResponse<{ url: string; title: string }>> {
  try {
    const { url, browser = 'chromium', headless = true, viewport } = params;

    await launchBrowser(browser, { headless, viewport });
    await navigateToUrl(url);

    const browserInstance = getCurrentBrowser();
    if (!browserInstance) {
      throw new Error('Failed to get browser instance');
    }

    const title = await browserInstance.page.title();

    return {
      success: true,
      data: {
        url,
        title,
      },
      message: `Browser opened: ${title}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to open browser',
      message: 'Browser launch failed',
    };
  }
}

/**
 * Click element in browser
 *
 * @example
 * const result = await clickElement({
 *   selector: 'button.submit',
 *   button: 'left',
 *   clickCount: 1
 * });
 */
export async function clickElement(
  params: ClickElementParams
): Promise<ToolResponse<void>> {
  try {
    const { selector, button = 'left', clickCount = 1, timeout = 30000 } = params;

    await waitForSelector(selector, { timeout });
    await playwrightClick(selector, { button, clickCount });

    return {
      success: true,
      message: `Clicked element: ${selector}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to click element',
      message: 'Click failed',
    };
  }
}

/**
 * Type text into element
 *
 * @example
 * const result = await typeText({
 *   selector: 'input[name="email"]',
 *   text: 'user@example.com',
 *   delay: 50,
 *   clear: true
 * });
 */
export async function typeText(
  params: TypeTextParams
): Promise<ToolResponse<void>> {
  try {
    const { selector, text, delay = 0, clear = false } = params;

    await waitForSelector(selector);
    await playwrightType(selector, text, { delay, clear });

    return {
      success: true,
      message: `Typed into element: ${selector}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to type text',
      message: 'Type failed',
    };
  }
}

/**
 * Take screenshot of browser page
 *
 * @example
 * const result = await takeScreenshot({
 *   fullPage: true,
 *   format: 'png',
 *   quality: 90
 * });
 */
export async function takeScreenshot(
  params: TakeScreenshotParams
): Promise<ToolResponse<ImageData>> {
  try {
    const { fullPage = false, selector, format = 'png', quality } = params;

    const buffer = await playwrightScreenshot({
      fullPage,
      selector,
      format,
      quality,
    });

    const sharp = (await import('sharp')).default;
    const metadata = await sharp(buffer).metadata();

    const mimeTypes = {
      png: 'image/png',
      jpeg: 'image/jpeg',
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
      message: `Screenshot captured (${metadata.width}x${metadata.height})`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to take screenshot',
      message: 'Screenshot failed',
    };
  }
}

/**
 * Record browser session
 *
 * @example
 * const result = await recordBrowser({
 *   duration: 30,
 *   fps: 30,
 *   quality: 'high'
 * });
 */
export async function recordBrowser(
  params: RecordBrowserParams
): Promise<ToolResponse<VideoData>> {
  try {
    const { duration, fps = 30, quality = 'high' } = params;

    // Start recording
    await playwrightStartRecording();

    // Wait for duration
    await new Promise(resolve => setTimeout(resolve, duration * 1000));

    // Stop recording
    const videoPath = await playwrightStopRecording();

    if (!videoPath) {
      throw new Error('Recording failed to produce video file');
    }

    // Get video metadata
    const { getVideoMetadata } = await import('../utils/ffmpeg.js');
    const metadata = await getVideoMetadata(videoPath);

    return {
      success: true,
      data: {
        path: videoPath,
        duration: metadata.duration,
        size: metadata.size,
        format: metadata.format,
        resolution: metadata.resolution,
        fps: metadata.fps,
      },
      message: `Browser session recorded (${duration}s)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to record browser',
      message: 'Recording failed',
    };
  }
}

/**
 * Close browser
 *
 * @example
 * await closeBrowserTool();
 */
export async function closeBrowserTool(): Promise<ToolResponse<void>> {
  try {
    await closeBrowser();

    return {
      success: true,
      message: 'Browser closed',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to close browser',
      message: 'Close failed',
    };
  }
}

/**
 * Navigate to URL
 *
 * @example
 * await navigate({ url: 'https://example.com' });
 */
export async function navigate(params: { url: string }): Promise<ToolResponse<void>> {
  try {
    await navigateToUrl(params.url);

    const browser = getCurrentBrowser();
    const title = browser ? await browser.page.title() : '';

    return {
      success: true,
      message: `Navigated to: ${title}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to navigate',
      message: 'Navigation failed',
    };
  }
}

/**
 * Get page content
 *
 * @example
 * const content = await getPageContent();
 */
export async function getPageContent(): Promise<ToolResponse<{
  url: string;
  title: string;
  html: string;
  text: string;
}>> {
  try {
    const browser = getCurrentBrowser();
    if (!browser) {
      throw new Error('No browser instance');
    }

    const url = browser.page.url();
    const title = await browser.page.title();
    const html = await browser.page.content();
    const text = await browser.page.textContent('body') || '';

    return {
      success: true,
      data: {
        url,
        title,
        html,
        text,
      },
      message: 'Page content retrieved',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get content',
      message: 'Content retrieval failed',
    };
  }
}

/**
 * Execute JavaScript in page
 *
 * @example
 * const result = await executeJavaScript({
 *   script: 'return document.title'
 * });
 */
export async function executeJavaScript(params: {
  script: string;
}): Promise<ToolResponse<any>> {
  try {
    const result = await executeScript(params.script);

    return {
      success: true,
      data: result,
      message: 'Script executed',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to execute script',
      message: 'Script execution failed',
    };
  }
}

/**
 * Fill form with data
 *
 * @example
 * await fillFormFields({
 *   fields: {
 *     'input[name="email"]': 'user@example.com',
 *     'input[name="password"]': 'secret123'
 *   }
 * });
 */
export async function fillFormFields(params: {
  fields: Record<string, string>;
}): Promise<ToolResponse<void>> {
  try {
    await fillForm(params.fields);

    return {
      success: true,
      message: `Filled ${Object.keys(params.fields).length} field(s)`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fill form',
      message: 'Form fill failed',
    };
  }
}

/**
 * Get element text
 *
 * @example
 * const text = await getElementTextContent({ selector: 'h1' });
 */
export async function getElementTextContent(params: {
  selector: string;
}): Promise<ToolResponse<string>> {
  try {
    const text = await getElementText(params.selector);

    return {
      success: true,
      data: text || '',
      message: 'Element text retrieved',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get text',
      message: 'Text retrieval failed',
    };
  }
}
