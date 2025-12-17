/**
 * FeedbackLoopAgent - Processes user feedback and learns preferences
 *
 * Features:
 * - Processes user feedback (corrections, approvals, suggestions)
 * - Timestamps feedback to video recordings
 * - Sends corrections to Code Orchestrator
 * - Learns user preferences over time
 * - Improves future responses based on feedback
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseAgent } from '../base/BaseAgent';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentType,
  MessageType,
  FeedbackData,
  UserPreferences,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

interface FeedbackEntry extends FeedbackData {
  id: string;
  userId: string;
  createdAt: string;
  processed: boolean;
}

interface LearnedPattern {
  id: string;
  category: string;
  pattern: string;
  preference: string;
  confidence: number;
  occurrences: number;
  lastSeen: string;
}

interface FeedbackStats {
  totalFeedback: number;
  corrections: number;
  approvals: number;
  suggestions: number;
  averageRating: number;
  learnedPatterns: number;
}

/**
 * Feedback Loop Agent
 */
export class FeedbackLoopAgent extends BaseAgent {
  private feedbackStore: Map<string, FeedbackEntry[]> = new Map(); // userId -> feedback[]
  private learnedPatterns: Map<string, LearnedPattern[]> = new Map(); // userId -> patterns[]
  private feedbackDir: string = '';

  constructor(config: Partial<AgentConfig> = {}) {
    super({
      name: 'Feedback Loop Agent',
      type: AgentType.FEEDBACK_LOOP,
      enabled: true,
      retryAttempts: 2,
      timeout: 15000,
      logLevel: 'info',
      ...config,
    });
  }

  /**
   * Initialize feedback storage
   */
  protected async onInitialize(): Promise<void> {
    this.feedbackDir = path.join(
      process.env.DATA_DIR || './data',
      'feedback'
    );

    await fs.mkdir(this.feedbackDir, { recursive: true });

    // Load persisted feedback and learned patterns
    await this.loadPersistedData();

    this.logger.info('Feedback Loop Agent initialized', {
      feedbackDir: this.feedbackDir,
      totalUsers: this.feedbackStore.size,
    });
  }

  /**
   * Process feedback submission
   */
  protected async process(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse<FeedbackEntry>> {
    if (message.type !== MessageType.FEEDBACK) {
      return this.createErrorResponse(
        'INVALID_MESSAGE_TYPE',
        `Expected FEEDBACK, got ${message.type}`
      );
    }

    const feedbackData = message.payload as FeedbackData;

    try {
      this.logger.info('Processing feedback', {
        type: feedbackData.type,
        sessionId: feedbackData.sessionId,
      });

      const feedback = await this.processFeedback(feedbackData, context);

      this.logger.info('Feedback processed', {
        feedbackId: feedback.id,
        type: feedback.type,
      });

      return this.createSuccessResponse(feedback);
    } catch (error) {
      this.logger.error('Feedback processing failed', { error });
      return this.createErrorResponse(
        'FEEDBACK_PROCESSING_FAILED',
        (error as Error).message,
        error
      );
    }
  }

  /**
   * Process and store feedback
   */
  private async processFeedback(
    data: FeedbackData,
    context: AgentContext
  ): Promise<FeedbackEntry> {
    const feedbackId = uuidv4();
    const feedback: FeedbackEntry = {
      id: feedbackId,
      userId: context.userId,
      createdAt: new Date().toISOString(),
      processed: false,
      ...data,
    };

    // Store feedback
    if (!this.feedbackStore.has(context.userId)) {
      this.feedbackStore.set(context.userId, []);
    }
    this.feedbackStore.get(context.userId)!.push(feedback);

    // Process based on feedback type
    switch (data.type) {
      case 'correction':
        await this.handleCorrection(feedback, context);
        break;

      case 'approval':
        await this.handleApproval(feedback, context);
        break;

      case 'suggestion':
        await this.handleSuggestion(feedback, context);
        break;
    }

    // Mark as processed
    feedback.processed = true;

    // Learn from feedback
    await this.learnFromFeedback(feedback, context);

    // Persist feedback
    await this.persistFeedback(context.userId);

    return feedback;
  }

  /**
   * Handle correction feedback
   */
  private async handleCorrection(
    feedback: FeedbackEntry,
    context: AgentContext
  ): Promise<void> {
    this.logger.info('Processing correction', {
      feedbackId: feedback.id,
      content: feedback.content.substring(0, 100),
    });

    // Send correction back to Code Orchestrator
    await this.sendMessage(
      MessageType.INTENT_PARSED,
      {
        intent: {
          category: 'bug_fix',
          confidence: 0.9,
          entities: {},
          summary: 'User correction',
          detailedRequest: feedback.content,
          suggestedActions: ['Apply the user\'s correction'],
        },
        correction: true,
        originalMessageId: feedback.messageId,
      },
      AgentType.CODE_ORCHESTRATOR
    );

    // If video timestamp is provided, create a note in the recording
    if (feedback.videoTimestamp !== undefined) {
      this.logger.debug('Feedback linked to video timestamp', {
        timestamp: feedback.videoTimestamp,
      });
    }
  }

  /**
   * Handle approval feedback
   */
  private async handleApproval(
    feedback: FeedbackEntry,
    context: AgentContext
  ): Promise<void> {
    this.logger.info('Processing approval', {
      feedbackId: feedback.id,
      rating: feedback.rating,
    });

    // Approval reinforces current patterns - no immediate action needed
    // The learning mechanism will pick this up
  }

  /**
   * Handle suggestion feedback
   */
  private async handleSuggestion(
    feedback: FeedbackEntry,
    context: AgentContext
  ): Promise<void> {
    this.logger.info('Processing suggestion', {
      feedbackId: feedback.id,
      content: feedback.content.substring(0, 100),
    });

    // Store suggestion for future reference
    // Could be used to improve prompts, add features, etc.
  }

  /**
   * Learn patterns from feedback
   */
  private async learnFromFeedback(
    feedback: FeedbackEntry,
    context: AgentContext
  ): Promise<void> {
    // Extract patterns from feedback content
    const patterns = this.extractPatterns(feedback);

    if (!this.learnedPatterns.has(context.userId)) {
      this.learnedPatterns.set(context.userId, []);
    }

    const userPatterns = this.learnedPatterns.get(context.userId)!;

    for (const newPattern of patterns) {
      // Check if pattern already exists
      const existingPattern = userPatterns.find(
        (p) => p.category === newPattern.category && p.pattern === newPattern.pattern
      );

      if (existingPattern) {
        // Update existing pattern
        existingPattern.occurrences++;
        existingPattern.confidence = Math.min(
          1.0,
          existingPattern.confidence + 0.1
        );
        existingPattern.lastSeen = new Date().toISOString();
      } else {
        // Add new pattern
        userPatterns.push(newPattern);
      }
    }

    // Persist learned patterns
    await this.persistPatterns(context.userId);

    this.logger.debug('Learned patterns from feedback', {
      feedbackId: feedback.id,
      newPatterns: patterns.length,
      totalPatterns: userPatterns.length,
    });
  }

  /**
   * Extract patterns from feedback
   */
  private extractPatterns(feedback: FeedbackEntry): LearnedPattern[] {
    const patterns: LearnedPattern[] = [];

    // Pattern extraction logic - this is simplified
    // In a real implementation, use NLP/ML to extract meaningful patterns

    // Code style patterns
    if (feedback.content.includes('use tabs') || feedback.content.includes('tabs instead')) {
      patterns.push({
        id: uuidv4(),
        category: 'code_style',
        pattern: 'indentation',
        preference: 'tabs',
        confidence: 0.7,
        occurrences: 1,
        lastSeen: new Date().toISOString(),
      });
    }

    if (feedback.content.includes('no semicolons') || feedback.content.includes('without semicolons')) {
      patterns.push({
        id: uuidv4(),
        category: 'code_style',
        pattern: 'semicolons',
        preference: 'false',
        confidence: 0.7,
        occurrences: 1,
        lastSeen: new Date().toISOString(),
      });
    }

    // Naming conventions
    if (feedback.content.match(/use (camelCase|snake_case|PascalCase)/i)) {
      const match = feedback.content.match(/use (camelCase|snake_case|PascalCase)/i);
      if (match) {
        patterns.push({
          id: uuidv4(),
          category: 'naming_convention',
          pattern: 'variable_naming',
          preference: match[1],
          confidence: 0.8,
          occurrences: 1,
          lastSeen: new Date().toISOString(),
        });
      }
    }

    // Testing preferences
    if (feedback.content.match(/use (jest|mocha|vitest)/i)) {
      const match = feedback.content.match(/use (jest|mocha|vitest)/i);
      if (match) {
        patterns.push({
          id: uuidv4(),
          category: 'testing',
          pattern: 'test_framework',
          preference: match[1],
          confidence: 0.9,
          occurrences: 1,
          lastSeen: new Date().toISOString(),
        });
      }
    }

    return patterns;
  }

  /**
   * Get learned preferences for a user
   */
  public async getLearnedPreferences(userId: string): Promise<Partial<UserPreferences>> {
    const patterns = this.learnedPatterns.get(userId) || [];

    // Convert learned patterns to user preferences
    const preferences: Partial<UserPreferences> = {
      codeStyle: { indentSize: 2, useTabs: false, lineWidth: 80, semicolons: true },
    };

    for (const pattern of patterns) {
      if (pattern.confidence < 0.6) continue; // Only use high-confidence patterns

      switch (pattern.category) {
        case 'code_style':
          if (pattern.pattern === 'indentation') {
            preferences.codeStyle!.useTabs = pattern.preference === 'tabs';
          } else if (pattern.pattern === 'semicolons') {
            preferences.codeStyle!.semicolons = pattern.preference === 'true';
          }
          break;

        // Add more pattern categories as needed
      }
    }

    return preferences;
  }

  /**
   * Get feedback statistics for a user
   */
  public async getFeedbackStats(userId: string): Promise<FeedbackStats> {
    const feedback = this.feedbackStore.get(userId) || [];
    const patterns = this.learnedPatterns.get(userId) || [];

    const stats: FeedbackStats = {
      totalFeedback: feedback.length,
      corrections: 0,
      approvals: 0,
      suggestions: 0,
      averageRating: 0,
      learnedPatterns: patterns.filter((p) => p.confidence >= 0.6).length,
    };

    let ratingSum = 0;
    let ratingCount = 0;

    for (const item of feedback) {
      switch (item.type) {
        case 'correction':
          stats.corrections++;
          break;
        case 'approval':
          stats.approvals++;
          break;
        case 'suggestion':
          stats.suggestions++;
          break;
      }

      if (item.rating !== undefined) {
        ratingSum += item.rating;
        ratingCount++;
      }
    }

    stats.averageRating = ratingCount > 0 ? ratingSum / ratingCount : 0;

    return stats;
  }

  /**
   * Get recent feedback for a session
   */
  public async getSessionFeedback(sessionId: string): Promise<FeedbackEntry[]> {
    const allFeedback: FeedbackEntry[] = [];

    for (const userFeedback of this.feedbackStore.values()) {
      allFeedback.push(
        ...userFeedback.filter((f) => f.sessionId === sessionId)
      );
    }

    return allFeedback.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Persist feedback to disk
   */
  private async persistFeedback(userId: string): Promise<void> {
    const feedbackFile = path.join(this.feedbackDir, `${userId}-feedback.json`);
    const feedback = this.feedbackStore.get(userId) || [];

    try {
      await fs.writeFile(feedbackFile, JSON.stringify(feedback, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error('Failed to persist feedback', { userId, error });
    }
  }

  /**
   * Persist learned patterns to disk
   */
  private async persistPatterns(userId: string): Promise<void> {
    const patternsFile = path.join(this.feedbackDir, `${userId}-patterns.json`);
    const patterns = this.learnedPatterns.get(userId) || [];

    try {
      await fs.writeFile(patternsFile, JSON.stringify(patterns, null, 2), 'utf-8');
    } catch (error) {
      this.logger.error('Failed to persist patterns', { userId, error });
    }
  }

  /**
   * Load persisted feedback and patterns
   */
  private async loadPersistedData(): Promise<void> {
    try {
      const files = await fs.readdir(this.feedbackDir);

      for (const file of files) {
        if (file.endsWith('-feedback.json')) {
          const userId = file.replace('-feedback.json', '');
          try {
            const data = await fs.readFile(
              path.join(this.feedbackDir, file),
              'utf-8'
            );
            const feedback: FeedbackEntry[] = JSON.parse(data);
            this.feedbackStore.set(userId, feedback);
          } catch (error) {
            this.logger.warn('Failed to load feedback file', { file, error });
          }
        } else if (file.endsWith('-patterns.json')) {
          const userId = file.replace('-patterns.json', '');
          try {
            const data = await fs.readFile(
              path.join(this.feedbackDir, file),
              'utf-8'
            );
            const patterns: LearnedPattern[] = JSON.parse(data);
            this.learnedPatterns.set(userId, patterns);
          } catch (error) {
            this.logger.warn('Failed to load patterns file', { file, error });
          }
        }
      }

      this.logger.info('Loaded persisted feedback data', {
        users: this.feedbackStore.size,
      });
    } catch (error) {
      this.logger.warn('Failed to read feedback directory', { error });
    }
  }

  /**
   * Cleanup on shutdown
   */
  protected async onShutdown(): Promise<void> {
    this.logger.info('Persisting all feedback before shutdown');

    // Persist all feedback
    for (const userId of this.feedbackStore.keys()) {
      await this.persistFeedback(userId);
      await this.persistPatterns(userId);
    }
  }
}
