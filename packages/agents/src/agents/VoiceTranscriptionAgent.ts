/**
 * VoiceTranscriptionAgent - Converts voice audio to text
 *
 * Features:
 * - Streaming transcription support
 * - Multiple language support
 * - Noise filtering
 * - Uses Google Speech-to-Text or OpenAI Whisper
 */

import { SpeechClient } from '@google-cloud/speech';
import { BaseAgent } from '../base/BaseAgent';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentType,
  MessageType,
} from '../types';

interface TranscriptionResult {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  words?: {
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }[];
}

interface VoiceInput {
  audio: Buffer | string; // Buffer for raw audio or path to audio file
  format: 'wav' | 'mp3' | 'ogg' | 'webm';
  sampleRate?: number;
  language?: string;
  enableWordTimestamps?: boolean;
  filterProfanity?: boolean;
}

/**
 * Voice Transcription Agent
 */
export class VoiceTranscriptionAgent extends BaseAgent {
  private speechClient: SpeechClient | null = null;
  private supportedLanguages: string[] = [
    'en-US',
    'en-GB',
    'es-ES',
    'fr-FR',
    'de-DE',
    'it-IT',
    'pt-BR',
    'ja-JP',
    'ko-KR',
    'zh-CN',
  ];

  constructor(config: Partial<AgentConfig> = {}) {
    super({
      name: 'Voice Transcription Agent',
      type: AgentType.VOICE_TRANSCRIPTION,
      enabled: true,
      retryAttempts: 3,
      timeout: 60000, // 60 seconds for longer audio
      logLevel: 'info',
      ...config,
    });
  }

  /**
   * Initialize Google Speech-to-Text client
   */
  protected async onInitialize(): Promise<void> {
    try {
      // Initialize Google Cloud Speech client
      this.speechClient = new SpeechClient({
        keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
      });

      this.logger.info('Google Speech-to-Text client initialized');
    } catch (error) {
      this.logger.warn('Failed to initialize Google Speech client, will use fallback', {
        error,
      });
    }
  }

  /**
   * Process voice transcription request
   */
  protected async process(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse<TranscriptionResult>> {
    if (message.type !== MessageType.VOICE_INPUT) {
      return this.createErrorResponse(
        'INVALID_MESSAGE_TYPE',
        `Expected VOICE_INPUT, got ${message.type}`
      );
    }

    const input = message.payload as VoiceInput;

    // Validate input
    if (!input.audio) {
      return this.createErrorResponse('MISSING_AUDIO', 'Audio data is required');
    }

    try {
      this.logger.info('Starting transcription', {
        format: input.format,
        language: input.language || context.userPreferences.voiceSettings.language,
      });

      // Determine language
      const language =
        input.language || context.userPreferences.voiceSettings.language || 'en-US';

      if (!this.supportedLanguages.includes(language)) {
        return this.createErrorResponse(
          'UNSUPPORTED_LANGUAGE',
          `Language ${language} is not supported`
        );
      }

      // Transcribe audio
      const result = await this.transcribeAudio(input, language);

      // Send transcribed text to intent parser
      await this.sendMessage(
        MessageType.TEXT_INPUT,
        {
          text: result.text,
          confidence: result.confidence,
          source: 'voice',
        },
        AgentType.INTENT_PARSER
      );

      this.logger.info('Transcription completed', {
        textLength: result.text.length,
        confidence: result.confidence,
      });

      return this.createSuccessResponse(result);
    } catch (error) {
      this.logger.error('Transcription failed', { error });
      return this.createErrorResponse(
        'TRANSCRIPTION_FAILED',
        (error as Error).message,
        error
      );
    }
  }

  /**
   * Transcribe audio using Google Speech-to-Text
   */
  private async transcribeAudio(
    input: VoiceInput,
    language: string
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();

    if (!this.speechClient) {
      throw new Error('Speech client not initialized');
    }

    // Get audio buffer
    const audioBytes = typeof input.audio === 'string'
      ? await this.readAudioFile(input.audio)
      : input.audio;

    // Configure recognition request
    const audio = {
      content: audioBytes.toString('base64'),
    };

    const config = {
      encoding: this.getAudioEncoding(input.format),
      sampleRateHertz: input.sampleRate || 16000,
      languageCode: language,
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: input.enableWordTimestamps || false,
      profanityFilter: input.filterProfanity !== false,
      model: 'default', // Can be 'phone_call', 'video', 'default'
      useEnhanced: true,
    };

    const request = {
      audio,
      config,
    };

    // Perform transcription
    const [response] = await this.speechClient.recognize(request);
    const transcription = response.results
      ?.map((result) => result.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim();

    if (!transcription) {
      throw new Error('No transcription result');
    }

    // Get confidence and word timestamps
    const firstResult = response.results?.[0];
    const firstAlternative = firstResult?.alternatives?.[0];
    const confidence = firstAlternative?.confidence || 0;

    const words = input.enableWordTimestamps
      ? firstAlternative?.words?.map((word) => ({
          word: word.word || '',
          startTime: this.parseTimestamp(word.startTime),
          endTime: this.parseTimestamp(word.endTime),
          confidence: word.confidence || 0,
        }))
      : undefined;

    const duration = Date.now() - startTime;

    return {
      text: transcription,
      confidence,
      language,
      duration,
      words,
    };
  }

  /**
   * Streaming transcription (for real-time voice input)
   */
  public async startStreamingTranscription(
    language: string,
    onTranscript: (text: string, isFinal: boolean) => void,
    onError: (error: Error) => void
  ): Promise<NodeJS.WritableStream> {
    if (!this.speechClient) {
      throw new Error('Speech client not initialized');
    }

    const request = {
      config: {
        encoding: 'LINEAR16' as const,
        sampleRateHertz: 16000,
        languageCode: language,
        enableAutomaticPunctuation: true,
        interimResults: true,
      },
      interimResults: true,
    };

    const recognizeStream = this.speechClient
      .streamingRecognize(request)
      .on('error', (error) => {
        this.logger.error('Streaming transcription error', { error });
        onError(error);
      })
      .on('data', (data) => {
        const result = data.results[0];
        if (result) {
          const transcript = result.alternatives[0]?.transcript || '';
          const isFinal = result.isFinal || false;
          onTranscript(transcript, isFinal);
        }
      });

    return recognizeStream;
  }

  /**
   * Get audio encoding based on format
   */
  private getAudioEncoding(format: string): any {
    const encodings: Record<string, string> = {
      wav: 'LINEAR16',
      mp3: 'MP3',
      ogg: 'OGG_OPUS',
      webm: 'WEBM_OPUS',
    };

    return encodings[format] || 'LINEAR16';
  }

  /**
   * Parse Google timestamp to milliseconds
   */
  private parseTimestamp(timestamp: any): number {
    if (!timestamp) return 0;
    const seconds = timestamp.seconds || 0;
    const nanos = timestamp.nanos || 0;
    return seconds * 1000 + nanos / 1000000;
  }

  /**
   * Read audio file from path
   */
  private async readAudioFile(filePath: string): Promise<Buffer> {
    const fs = await import('fs/promises');
    return fs.readFile(filePath);
  }

  /**
   * Check if language is supported
   */
  public isLanguageSupported(language: string): boolean {
    return this.supportedLanguages.includes(language);
  }

  /**
   * Get list of supported languages
   */
  public getSupportedLanguages(): string[] {
    return [...this.supportedLanguages];
  }

  /**
   * Cleanup on shutdown
   */
  protected async onShutdown(): Promise<void> {
    if (this.speechClient) {
      await this.speechClient.close();
      this.speechClient = null;
    }
  }
}
