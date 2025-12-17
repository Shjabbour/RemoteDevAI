/**
 * Jest setup file for agents package
 */

import { mkdir } from 'fs/promises';
import { join } from 'path';

// Create logs directory for tests
beforeAll(async () => {
  const logsDir = join(__dirname, '../../logs');
  try {
    await mkdir(logsDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
});

// Suppress console logs during tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}
