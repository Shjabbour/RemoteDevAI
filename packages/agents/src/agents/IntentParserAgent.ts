/**
 * IntentParserAgent - Parses user intent from text
 *
 * Features:
 * - Categorizes user intent
 * - Extracts entities (files, functions, classes, etc.)
 * - Returns structured intent object
 * - Uses Claude or GPT for NLP
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseAgent } from '../base/BaseAgent';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentType,
  MessageType,
  ParsedIntent,
  IntentCategory,
} from '../types';

interface TextInput {
  text: string;
  confidence?: number;
  source?: 'voice' | 'text' | 'other';
}

/**
 * Intent Parser Agent
 */
export class IntentParserAgent extends BaseAgent {
  private anthropic: Anthropic | null = null;

  constructor(config: Partial<AgentConfig> = {}) {
    super({
      name: 'Intent Parser Agent',
      type: AgentType.INTENT_PARSER,
      enabled: true,
      retryAttempts: 2,
      timeout: 15000,
      logLevel: 'info',
      ...config,
    });
  }

  /**
   * Initialize Anthropic client
   */
  protected async onInitialize(): Promise<void> {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.anthropic = new Anthropic({
      apiKey,
    });

    this.logger.info('Anthropic client initialized');
  }

  /**
   * Process intent parsing request
   */
  protected async process(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse<ParsedIntent>> {
    if (message.type !== MessageType.TEXT_INPUT) {
      return this.createErrorResponse(
        'INVALID_MESSAGE_TYPE',
        `Expected TEXT_INPUT, got ${message.type}`
      );
    }

    const input = message.payload as TextInput;

    if (!input.text || input.text.trim().length === 0) {
      return this.createErrorResponse('EMPTY_TEXT', 'Text input is empty');
    }

    try {
      this.logger.info('Parsing intent', {
        textLength: input.text.length,
        source: input.source,
      });

      // Parse intent using Claude
      const intent = await this.parseIntent(input.text, context);

      // Send parsed intent to Code Orchestrator
      await this.sendMessage(
        MessageType.INTENT_PARSED,
        intent,
        AgentType.CODE_ORCHESTRATOR
      );

      this.logger.info('Intent parsed successfully', {
        category: intent.category,
        confidence: intent.confidence,
        entitiesCount: Object.values(intent.entities).flat().length,
      });

      return this.createSuccessResponse(intent);
    } catch (error) {
      this.logger.error('Intent parsing failed', { error });
      return this.createErrorResponse(
        'PARSING_FAILED',
        (error as Error).message,
        error
      );
    }
  }

  /**
   * Parse user intent using Claude
   */
  private async parseIntent(
    text: string,
    context: AgentContext
  ): Promise<ParsedIntent> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    // Build system prompt with context
    const systemPrompt = this.buildSystemPrompt(context);

    // Build user prompt
    const userPrompt = this.buildUserPrompt(text, context);

    // Call Claude API
    const response = await this.anthropic.messages.create({
      model: context.userPreferences.aiModel.model || 'claude-opus-4-5-20251101',
      max_tokens: 2000,
      temperature: 0.3, // Lower temperature for more consistent parsing
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Parse Claude's response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const intentData = this.extractIntentFromResponse(content.text);

    return intentData;
  }

  /**
   * Build system prompt for intent parsing
   */
  private buildSystemPrompt(context: AgentContext): string {
    return `You are an AI assistant that parses developer intent from natural language commands.

Your task is to analyze user input and extract:
1. The primary intent category
2. Relevant entities (files, functions, classes, variables, packages, technologies)
3. A concise summary
4. A detailed description of what the user wants
5. Suggested actions to fulfill the request

Project Context:
- Project ID: ${context.projectId}
- Working Directory: ${context.environment.workspaceRoot}
- Recent conversation: ${this.getConversationSummary(context.conversationHistory)}

Intent Categories:
- new_feature: User wants to add a new feature or functionality
- bug_fix: User wants to fix a bug or issue
- refactor: User wants to refactor or improve existing code
- question: User has a question about the code
- review: User wants code review or explanation
- deploy: User wants to deploy or build the project
- test: User wants to write or run tests
- documentation: User wants to add or update documentation
- other: Other types of requests

Respond ONLY with a JSON object in this exact format:
{
  "category": "one of the categories above",
  "confidence": 0.0-1.0,
  "entities": {
    "files": ["array of file paths mentioned"],
    "functions": ["array of function names mentioned"],
    "classes": ["array of class names mentioned"],
    "variables": ["array of variable names mentioned"],
    "packages": ["array of package/library names mentioned"],
    "technologies": ["array of technologies mentioned"]
  },
  "summary": "One sentence summary of the intent",
  "detailedRequest": "Detailed description of what the user wants",
  "suggestedActions": ["array of specific actions to take"]
}`;
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(text: string, context: AgentContext): string {
    return `Parse the following developer command and extract the intent:

"${text}"

Respond with the JSON object as specified in the system prompt.`;
  }

  /**
   * Extract intent data from Claude's response
   */
  private extractIntentFromResponse(responseText: string): ParsedIntent {
    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (!parsed.category || !parsed.confidence || !parsed.summary) {
        throw new Error('Missing required fields in parsed intent');
      }

      // Map category string to enum
      const category = this.mapCategory(parsed.category);

      return {
        category,
        confidence: parsed.confidence,
        entities: {
          files: parsed.entities?.files || [],
          functions: parsed.entities?.functions || [],
          classes: parsed.entities?.classes || [],
          variables: parsed.entities?.variables || [],
          packages: parsed.entities?.packages || [],
          technologies: parsed.entities?.technologies || [],
        },
        summary: parsed.summary,
        detailedRequest: parsed.detailedRequest || parsed.summary,
        suggestedActions: parsed.suggestedActions || [],
      };
    } catch (error) {
      this.logger.error('Failed to parse intent from response', {
        error,
        responseText,
      });

      // Fallback: return a basic intent
      return this.createFallbackIntent(responseText);
    }
  }

  /**
   * Map category string to IntentCategory enum
   */
  private mapCategory(category: string): IntentCategory {
    const mapping: Record<string, IntentCategory> = {
      new_feature: IntentCategory.NEW_FEATURE,
      bug_fix: IntentCategory.BUG_FIX,
      refactor: IntentCategory.REFACTOR,
      question: IntentCategory.QUESTION,
      review: IntentCategory.REVIEW,
      deploy: IntentCategory.DEPLOY,
      test: IntentCategory.TEST,
      documentation: IntentCategory.DOCUMENTATION,
      other: IntentCategory.OTHER,
    };

    return mapping[category] || IntentCategory.OTHER;
  }

  /**
   * Create a fallback intent when parsing fails
   */
  private createFallbackIntent(text: string): ParsedIntent {
    return {
      category: IntentCategory.OTHER,
      confidence: 0.5,
      entities: {
        files: [],
        functions: [],
        classes: [],
        variables: [],
        packages: [],
        technologies: [],
      },
      summary: text.substring(0, 100),
      detailedRequest: text,
      suggestedActions: ['Clarify the request with the user'],
    };
  }

  /**
   * Get conversation summary for context
   */
  private getConversationSummary(
    history: AgentContext['conversationHistory']
  ): string {
    const recent = history.slice(-3);
    return recent
      .map((msg) => `${msg.role}: ${msg.content.substring(0, 100)}`)
      .join('\n');
  }

  /**
   * Cleanup on shutdown
   */
  protected async onShutdown(): Promise<void> {
    this.anthropic = null;
  }
}
