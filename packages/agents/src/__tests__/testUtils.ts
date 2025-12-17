/**
 * Test utilities for agents package
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentType,
  MessageType
} from '../types';

/**
 * Creates a mock agent configuration
 */
export function createMockAgentConfig(
  overrides?: Partial<AgentConfig>
): AgentConfig {
  return {
    type: AgentType.VOICE_TRANSCRIPTION,
    name: 'Test Agent',
    enabled: true,
    logLevel: 'error',
    timeout: 5000,
    retryAttempts: 1,
    ...overrides
  };
}

/**
 * Creates a mock agent context
 */
export function createMockAgentContext(
  overrides?: Partial<AgentContext>
): AgentContext {
  return {
    sessionId: uuidv4(),
    userId: uuidv4(),
    projectId: uuidv4(),
    timestamp: new Date().toISOString(),
    metadata: {},
    ...overrides
  };
}

/**
 * Creates a mock agent message
 */
export function createMockAgentMessage(
  overrides?: Partial<AgentMessage>
): AgentMessage {
  return {
    id: uuidv4(),
    type: MessageType.COMMAND,
    source: AgentType.VOICE_TRANSCRIPTION,
    timestamp: new Date().toISOString(),
    payload: { test: 'data' },
    ...overrides
  };
}

/**
 * Waits for an event to be emitted
 */
export function waitForEvent<T>(
  emitter: any,
  event: string,
  timeout: number = 1000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Event ${event} not emitted within ${timeout}ms`));
    }, timeout);

    emitter.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/**
 * Creates a mock winston logger
 */
export function createMockLogger() {
  return {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn()
  };
}
