/**
 * Playwright utilities for browser automation
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';

export type BrowserType = 'chromium' | 'firefox' | 'webkit';

export interface BrowserInstance {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  type: BrowserType;
}

let currentBrowser: BrowserInstance | null = null;

/**
 * Launch browser and return instance
 *
 * @example
 * const browser = await launchBrowser('chromium', {
 *   headless: true,
 *   viewport: { width: 1920, height: 1080 }
 * });
 */
export async function launchBrowser(
  browserType: BrowserType = 'chromium',
  options: {
    headless?: boolean;
    viewport?: { width: number; height: number };
    timeout?: number;
  } = {}
): Promise<BrowserInstance> {
  const { headless = true, viewport = { width: 1920, height: 1080 }, timeout = 30000 } = options;

  // Close existing browser if any
  if (currentBrowser) {
    await closeBrowser();
  }

  let browser: Browser;

  switch (browserType) {
    case 'firefox':
      browser = await firefox.launch({ headless });
      break;
    case 'webkit':
      browser = await webkit.launch({ headless });
      break;
    case 'chromium':
    default:
      browser = await chromium.launch({ headless });
      break;
  }

  const context = await browser.newContext({
    viewport,
    recordVideo: undefined, // Will be set when recording
  });

  context.setDefaultTimeout(timeout);

  const page = await context.newPage();

  currentBrowser = {
    browser,
    context,
    page,
    type: browserType,
  };

  return currentBrowser;
}

/**
 * Get current browser instance
 */
export function getCurrentBrowser(): BrowserInstance | null {
  return currentBrowser;
}

/**
 * Close current browser
 *
 * @example
 * await closeBrowser();
 */
export async function closeBrowser(): Promise<void> {
  if (!currentBrowser) return;

  await currentBrowser.context.close();
  await currentBrowser.browser.close();
  currentBrowser = null;
}

/**
 * Navigate to URL
 *
 * @example
 * await navigateToUrl('https://example.com');
 */
export async function navigateToUrl(url: string): Promise<void> {
  if (!currentBrowser) {
    throw new Error('No browser instance. Call launchBrowser first.');
  }

  await currentBrowser.page.goto(url, {
    waitUntil: 'networkidle',
  });
}

/**
 * Click element by selector
 *
 * @example
 * await clickElement('button.submit', { button: 'left', clickCount: 1 });
 */
export async function clickElement(
  selector: string,
  options: {
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
    timeout?: number;
  } = {}
): Promise<void> {
  if (!currentBrowser) {
    throw new Error('No browser instance. Call launchBrowser first.');
  }

  await currentBrowser.page.click(selector, options);
}

/**
 * Type text into element
 *
 * @example
 * await typeText('input[name="email"]', 'user@example.com', { delay: 100 });
 */
export async function typeText(
  selector: string,
  text: string,
  options: {
    delay?: number;
    clear?: boolean;
  } = {}
): Promise<void> {
  if (!currentBrowser) {
    throw new Error('No browser instance. Call launchBrowser first.');
  }

  const { delay = 0, clear = false } = options;

  if (clear) {
    await currentBrowser.page.fill(selector, '');
  }

  await currentBrowser.page.type(selector, text, { delay });
}

/**
 * Take screenshot
 *
 * @example
 * const screenshot = await takeScreenshot({
 *   fullPage: true,
 *   format: 'png'
 * });
 */
export async function takeScreenshot(options: {
  fullPage?: boolean;
  selector?: string;
  format?: 'png' | 'jpeg';
  quality?: number;
  path?: string;
} = {}): Promise<Buffer> {
  if (!currentBrowser) {
    throw new Error('No browser instance. Call launchBrowser first.');
  }

  const { fullPage = false, selector, format = 'png', quality, path } = options;

  if (selector) {
    const element = await currentBrowser.page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    return await element.screenshot({
      type: format,
      quality: format === 'jpeg' ? quality : undefined,
      path,
    });
  }

  return await currentBrowser.page.screenshot({
    fullPage,
    type: format,
    quality: format === 'jpeg' ? quality : undefined,
    path,
  });
}

/**
 * Start recording browser session
 *
 * @example
 * await startRecording({ width: 1280, height: 720 });
 */
export async function startRecording(options: {
  width?: number;
  height?: number;
  dir?: string;
} = {}): Promise<void> {
  if (!currentBrowser) {
    throw new Error('No browser instance. Call launchBrowser first.');
  }

  const { width = 1920, height = 1080, dir = './recordings' } = options;

  // Close current context and create new one with recording enabled
  const url = currentBrowser.page.url();
  await currentBrowser.context.close();

  currentBrowser.context = await currentBrowser.browser.newContext({
    viewport: { width, height },
    recordVideo: {
      dir,
      size: { width, height },
    },
  });

  currentBrowser.page = await currentBrowser.context.newPage();

  if (url && url !== 'about:blank') {
    await currentBrowser.page.goto(url);
  }
}

/**
 * Stop recording and save video
 *
 * @example
 * const videoPath = await stopRecording();
 */
export async function stopRecording(): Promise<string | null> {
  if (!currentBrowser) {
    throw new Error('No browser instance. Call launchBrowser first.');
  }

  const video = currentBrowser.page.video();
  if (!video) {
    return null;
  }

  await currentBrowser.page.close();
  const path = await video.path();

  // Create new page
  currentBrowser.page = await currentBrowser.context.newPage();

  return path;
}

/**
 * Execute JavaScript in page context
 *
 * @example
 * const title = await executeScript(() => document.title);
 */
export async function executeScript<T>(
  script: string | ((...args: any[]) => T),
  ...args: any[]
): Promise<T> {
  if (!currentBrowser) {
    throw new Error('No browser instance. Call launchBrowser first.');
  }

  return await currentBrowser.page.evaluate(script, ...args);
}

/**
 * Wait for selector to appear
 *
 * @example
 * await waitForSelector('div.content', { timeout: 5000 });
 */
export async function waitForSelector(
  selector: string,
  options: {
    timeout?: number;
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
  } = {}
): Promise<void> {
  if (!currentBrowser) {
    throw new Error('No browser instance. Call launchBrowser first.');
  }

  await currentBrowser.page.waitForSelector(selector, options);
}

/**
 * Get element text content
 *
 * @example
 * const text = await getElementText('h1.title');
 */
export async function getElementText(selector: string): Promise<string | null> {
  if (!currentBrowser) {
    throw new Error('No browser instance. Call launchBrowser first.');
  }

  return await currentBrowser.page.textContent(selector);
}

/**
 * Get element attribute
 *
 * @example
 * const href = await getElementAttribute('a.link', 'href');
 */
export async function getElementAttribute(
  selector: string,
  attribute: string
): Promise<string | null> {
  if (!currentBrowser) {
    throw new Error('No browser instance. Call launchBrowser first.');
  }

  return await currentBrowser.page.getAttribute(selector, attribute);
}

/**
 * Fill form
 *
 * @example
 * await fillForm({
 *   'input[name="email"]': 'user@example.com',
 *   'input[name="password"]': 'secret123'
 * });
 */
export async function fillForm(fields: Record<string, string>): Promise<void> {
  if (!currentBrowser) {
    throw new Error('No browser instance. Call launchBrowser first.');
  }

  for (const [selector, value] of Object.entries(fields)) {
    await currentBrowser.page.fill(selector, value);
  }
}

/**
 * Wait for navigation
 *
 * @example
 * await waitForNavigation();
 */
export async function waitForNavigation(options: {
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
} = {}): Promise<void> {
  if (!currentBrowser) {
    throw new Error('No browser instance. Call launchBrowser first.');
  }

  await currentBrowser.page.waitForLoadState(options.waitUntil || 'networkidle', {
    timeout: options.timeout,
  });
}
