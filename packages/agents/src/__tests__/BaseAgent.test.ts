/**
 * Tests for BaseAgent abstract class
 */

import { BaseAgent } from '../base/BaseAgent';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentType,
  AgentEvent,
  MessageType
} from '../types';
import {
  createMockAgentConfig,
  createMockAgentContext,
  createMockAgentMessage,
  waitForEvent
} from './testUtils';

// Concrete implementation for testing
class TestAgent extends BaseAgent {
  public processCallCount = 0;
  public shouldThrowError = false;
  public processingDelay = 0;

  protected async process(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse> {
    this.processCallCount++;

    if (this.processingDelay > 0) {
      await this.delay(this.processingDelay);
    }

    if (this.shouldThrowError) {
      throw new Error('Processing failed');
    }

    return this.createSuccessResponse({
      processed: true,
      messageId: message.id
    });
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;
  let config: AgentConfig;

  beforeEach(() => {
    config = createMockAgentConfig({
      type: AgentType.VOICE_TRANSCRIPTION,
      name: 'Test Agent',
      enabled: true,
      timeout: 5000,
      retryAttempts: 2
    });
    agent = new TestAgent(config);
  });

  afterEach(async () => {
    if (agent) {
      await agent.shutdown();
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await agent.initialize();
      expect(agent.getStatus().initialized).toBe(true);
    });

    it('should emit INITIALIZED event on successful initialization', async () => {
      const eventPromise = waitForEvent(agent, 'event', 1000);
      await agent.initialize();
      const event = await eventPromise;
      expect(event.event).toBe(AgentEvent.INITIALIZED);
    });

    it('should not be initialized before initialize() is called', () => {
      expect(agent.getStatus().initialized).toBe(false);
    });

    it('should handle initialization errors', async () => {
      // Override onInitialize to throw error
      class FailingAgent extends TestAgent {
        protected async onInitialize(): Promise<void> {
          throw new Error('Init failed');
        }
      }

      const failingAgent = new FailingAgent(config);
      await expect(failingAgent.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('message handling', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should handle message successfully', async () => {
      const message = createMockAgentMessage();
      const context = createMockAgentContext();

      const response = await agent.handleMessage(message, context);

      expect(response.success).toBe(true);
      expect(response.data).toEqual({
        processed: true,
        messageId: message.id
      });
      expect(agent.processCallCount).toBe(1);
    });

    it('should return error when agent is disabled', async () => {
      agent.updateConfig({ enabled: false });
      const message = createMockAgentMessage();
      const context = createMockAgentContext();

      const response = await agent.handleMessage(message, context);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('AGENT_DISABLED');
      expect(agent.processCallCount).toBe(0);
    });

    it('should return error when agent is not initialized', async () => {
      await agent.shutdown();
      const message = createMockAgentMessage();
      const context = createMockAgentContext();

      const response = await agent.handleMessage(message, context);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('NOT_INITIALIZED');
    });

    it('should emit MESSAGE_RECEIVED event', async () => {
      const message = createMockAgentMessage();
      const context = createMockAgentContext();

      const eventPromise = waitForEvent(agent, 'event', 1000);
      await agent.handleMessage(message, context);
      const event = await eventPromise;

      expect(event.event).toBe(AgentEvent.MESSAGE_RECEIVED);
    });

    it('should emit PROCESSING_START event', async () => {
      const message = createMockAgentMessage();
      const context = createMockAgentContext();

      let receivedProcessingStart = false;
      agent.on('event', (payload) => {
        if (payload.event === AgentEvent.PROCESSING_START) {
          receivedProcessingStart = true;
        }
      });

      await agent.handleMessage(message, context);
      expect(receivedProcessingStart).toBe(true);
    });

    it('should emit PROCESSING_COMPLETE event on success', async () => {
      const message = createMockAgentMessage();
      const context = createMockAgentContext();

      let receivedComplete = false;
      agent.on('event', (payload) => {
        if (payload.event === AgentEvent.PROCESSING_COMPLETE) {
          receivedComplete = true;
        }
      });

      await agent.handleMessage(message, context);
      expect(receivedComplete).toBe(true);
    });
  });

  describe('retry logic', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should retry on failure', async () => {
      agent.shouldThrowError = true;
      const message = createMockAgentMessage();
      const context = createMockAgentContext();

      const response = await agent.handleMessage(message, context);

      expect(response.success).toBe(false);
      expect(agent.processCallCount).toBe(2); // Initial + 1 retry
    });

    it('should succeed on retry', async () => {
      let callCount = 0;
      // Override process to fail first time, succeed second time
      const originalProcess = agent['process'].bind(agent);
      agent['process'] = async (msg: AgentMessage, ctx: AgentContext) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First attempt failed');
        }
        return originalProcess(msg, ctx);
      };

      const message = createMockAgentMessage();
      const context = createMockAgentContext();

      const response = await agent.handleMessage(message, context);

      expect(response.success).toBe(true);
      expect(callCount).toBe(2);
    });

    it('should emit PROCESSING_ERROR event after all retries fail', async () => {
      agent.shouldThrowError = true;
      const message = createMockAgentMessage();
      const context = createMockAgentContext();

      let errorEmitted = false;
      agent.on('event', (payload) => {
        if (payload.event === AgentEvent.PROCESSING_ERROR) {
          errorEmitted = true;
        }
      });

      await agent.handleMessage(message, context);
      expect(errorEmitted).toBe(true);
    });
  });

  describe('timeout handling', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should timeout long-running operations', async () => {
      agent.processingDelay = 10000; // 10 seconds
      agent.updateConfig({ timeout: 100 }); // 100ms timeout

      const message = createMockAgentMessage();
      const context = createMockAgentContext();

      const response = await agent.handleMessage(message, context);

      expect(response.success).toBe(false);
      expect(response.error?.message).toContain('timed out');
    });
  });

  describe('status', () => {
    it('should return correct status', async () => {
      const status = agent.getStatus();

      expect(status.type).toBe(AgentType.VOICE_TRANSCRIPTION);
      expect(status.name).toBe('Test Agent');
      expect(status.initialized).toBe(false);
      expect(status.enabled).toBe(true);
      expect(status.processing).toBe(false);
    });

    it('should update status after initialization', async () => {
      await agent.initialize();
      const status = agent.getStatus();

      expect(status.initialized).toBe(true);
    });
  });

  describe('configuration updates', () => {
    it('should update configuration', () => {
      agent.updateConfig({ enabled: false });
      expect(agent.getStatus().enabled).toBe(false);
    });

    it('should emit STATE_CHANGED event on config update', () => {
      let eventEmitted = false;
      agent.on('event', (payload) => {
        if (payload.event === AgentEvent.STATE_CHANGED) {
          eventEmitted = true;
        }
      });

      agent.updateConfig({ enabled: false });
      expect(eventEmitted).toBe(true);
    });
  });

  describe('shutdown', () => {
    it('should shutdown cleanly', async () => {
      await agent.initialize();
      await agent.shutdown();

      expect(agent.getStatus().initialized).toBe(false);
    });

    it('should remove all listeners on shutdown', async () => {
      await agent.initialize();
      const listener = jest.fn();
      agent.on('event', listener);

      await agent.shutdown();
      agent.emit('event', {});

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('helper methods', () => {
    it('should create success response', () => {
      const response = agent['createSuccessResponse']({ test: 'data' });

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ test: 'data' });
    });

    it('should create error response', () => {
      const response = agent['createErrorResponse'](
        'TEST_ERROR',
        'Test error message',
        { detail: 'info' }
      );

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('TEST_ERROR');
      expect(response.error?.message).toBe('Test error message');
      expect(response.error?.details).toEqual({ detail: 'info' });
    });

    it('should delay for specified time', async () => {
      const start = Date.now();
      await agent['delay'](100);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(90); // Allow some variance
    });
  });

  describe('message sending', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should send message with correct structure', async () => {
      const messagePromise = waitForEvent(agent, 'message', 1000);

      await agent['sendMessage'](
        MessageType.TEXT_INPUT,
        { content: 'test' },
        AgentType.INTENT_PARSER
      );

      const message = await messagePromise;
      expect(message.type).toBe(MessageType.TEXT_INPUT);
      expect(message.source).toBe(AgentType.VOICE_TRANSCRIPTION);
      expect(message.target).toBe(AgentType.INTENT_PARSER);
      expect(message.payload).toEqual({ content: 'test' });
      expect(message.id).toBeDefined();
      expect(message.timestamp).toBeDefined();
    });

    it('should emit MESSAGE_SENT event', async () => {
      let eventEmitted = false;
      agent.on('event', (payload) => {
        if (payload.event === AgentEvent.MESSAGE_SENT) {
          eventEmitted = true;
        }
      });

      await agent['sendMessage'](MessageType.TEXT_INPUT, { content: 'test' });
      expect(eventEmitted).toBe(true);
    });
  });
});
