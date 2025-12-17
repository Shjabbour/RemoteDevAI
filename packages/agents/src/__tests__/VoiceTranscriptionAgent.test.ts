/**
 * Tests for VoiceTranscriptionAgent
 */

import { VoiceTranscriptionAgent } from '../agents/VoiceTranscriptionAgent';
import { MessageType, AgentType } from '../types';
import { createMockAgentMessage, createMockAgentContext } from './testUtils';

// Mock Google Cloud Speech client
jest.mock('@google-cloud/speech', () => ({
  SpeechClient: jest.fn().mockImplementation(() => ({
    recognize: jest.fn().mockResolvedValue([
      {
        results: [
          {
            alternatives: [
              {
                transcript: 'Hello, this is a test transcription',
                confidence: 0.95,
                words: []
              }
            ]
          }
        ]
      }
    ])
  }))
}));

describe('VoiceTranscriptionAgent', () => {
  let agent: VoiceTranscriptionAgent;

  beforeEach(async () => {
    agent = new VoiceTranscriptionAgent();
    await agent.initialize();
  });

  afterEach(async () => {
    await agent.shutdown();
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(agent.getStatus().initialized).toBe(true);
      expect(agent.getStatus().type).toBe(AgentType.VOICE_TRANSCRIPTION);
    });
  });

  describe('message handling', () => {
    it('should reject non-voice-input messages', async () => {
      const message = createMockAgentMessage({
        type: MessageType.TEXT_INPUT
      });
      const context = createMockAgentContext();

      const response = await agent.handleMessage(message, context);

      expect(response.success).toBe(false);
      expect(response.error?.message).toContain('Invalid message type');
    });

    it('should validate input payload', async () => {
      const message = createMockAgentMessage({
        type: MessageType.VOICE_INPUT,
        payload: {}
      });
      const context = createMockAgentContext();

      const response = await agent.handleMessage(message, context);

      expect(response.success).toBe(false);
    });
  });
});
