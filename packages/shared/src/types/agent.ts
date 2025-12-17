/**
 * Agent-related types and interfaces
 */

/**
 * Available agent types in the system
 */
export enum AgentType {
  /** Code generation and refactoring */
  CODE_ASSISTANT = 'CODE_ASSISTANT',
  /** Terminal command execution and scripting */
  TERMINAL_AGENT = 'TERMINAL_AGENT',
  /** Browser automation and web scraping */
  BROWSER_AGENT = 'BROWSER_AGENT',
  /** File system operations */
  FILE_MANAGER = 'FILE_MANAGER',
  /** Git operations and version control */
  GIT_AGENT = 'GIT_AGENT',
  /** Database queries and management */
  DATABASE_AGENT = 'DATABASE_AGENT',
  /** API testing and integration */
  API_TESTER = 'API_TESTER',
  /** Code review and analysis */
  CODE_REVIEWER = 'CODE_REVIEWER',
  /** Documentation generation */
  DOC_GENERATOR = 'DOC_GENERATOR',
  /** Project scaffolding and setup */
  PROJECT_SCAFFOLD = 'PROJECT_SCAFFOLD'
}

/**
 * Agent status
 */
export enum AgentStatus {
  IDLE = 'IDLE',
  THINKING = 'THINKING',
  EXECUTING = 'EXECUTING',
  WAITING = 'WAITING',
  ERROR = 'ERROR',
  COMPLETED = 'COMPLETED'
}

/**
 * Agent capability
 */
export interface AgentCapability {
  /** Capability ID */
  id: string;
  /** Capability name */
  name: string;
  /** Capability description */
  description: string;
  /** Required permissions */
  requiredPermissions: string[];
  /** Is enabled */
  enabled: boolean;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Agent type */
  type: AgentType;
  /** Agent name */
  name: string;
  /** Agent description */
  description: string;
  /** Agent version */
  version: string;
  /** Agent capabilities */
  capabilities: AgentCapability[];
  /** Model to use */
  model: string;
  /** Temperature (0-2) */
  temperature: number;
  /** Max tokens */
  maxTokens: number;
  /** System prompt */
  systemPrompt: string;
  /** Tool use enabled */
  enableToolUse: boolean;
  /** Available tools */
  availableTools: string[];
  /** Retry attempts */
  maxRetries: number;
  /** Timeout in milliseconds */
  timeoutMs: number;
  /** Custom settings */
  customSettings: Record<string, any>;
}

/**
 * Agent context for execution
 */
export interface AgentContext {
  /** Session ID */
  sessionId: string;
  /** Project ID */
  projectId: string;
  /** User ID */
  userId: string;
  /** Current working directory */
  workingDirectory: string;
  /** Environment variables */
  environmentVariables: Record<string, string>;
  /** File system access paths */
  allowedPaths: string[];
  /** Previous messages in conversation */
  conversationHistory: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  }[];
  /** Available tools */
  availableTools: string[];
  /** Project metadata */
  projectMetadata: {
    name: string;
    description: string | null;
    techStack: string[];
    repositoryUrl: string | null;
  };
  /** Session metadata */
  sessionMetadata: {
    title: string;
    model: string;
    startedAt: Date | null;
  };
  /** User preferences */
  userPreferences: {
    theme: string;
    language: string;
  };
}

/**
 * Agent tool call
 */
export interface AgentToolCall {
  /** Tool call ID */
  id: string;
  /** Tool name */
  toolName: string;
  /** Tool description */
  toolDescription: string;
  /** Tool arguments */
  arguments: Record<string, any>;
  /** Tool result */
  result: any;
  /** Execution status */
  status: 'pending' | 'executing' | 'success' | 'error' | 'canceled';
  /** Error message if failed */
  error: string | null;
  /** Error stack trace */
  errorStack: string | null;
  /** Start timestamp */
  startedAt: Date;
  /** End timestamp */
  completedAt: Date | null;
  /** Execution duration in milliseconds */
  durationMs: number | null;
}

/**
 * Agent execution step
 */
export interface AgentExecutionStep {
  /** Step ID */
  id: string;
  /** Step index */
  index: number;
  /** Step type */
  type: 'thinking' | 'tool_call' | 'response' | 'error';
  /** Step description */
  description: string;
  /** Step content */
  content: string;
  /** Tool calls in this step */
  toolCalls: AgentToolCall[];
  /** Step status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  /** Start timestamp */
  startedAt: Date;
  /** End timestamp */
  completedAt: Date | null;
  /** Duration in milliseconds */
  durationMs: number | null;
  /** Tokens used */
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  } | null;
}

/**
 * Agent message
 */
export interface AgentMessage {
  /** Message ID */
  id: string;
  /** Agent type */
  agentType: AgentType;
  /** Session ID */
  sessionId: string;
  /** User message that triggered agent */
  userMessage: string;
  /** Agent response */
  response: string;
  /** Agent status */
  status: AgentStatus;
  /** Execution steps */
  steps: AgentExecutionStep[];
  /** Total tokens used */
  totalTokens: number;
  /** Total cost in USD */
  totalCostUsd: number;
  /** Start timestamp */
  startedAt: Date;
  /** End timestamp */
  completedAt: Date | null;
  /** Duration in milliseconds */
  durationMs: number | null;
  /** Error message if failed */
  error: string | null;
  /** Created by user ID */
  userId: string;
  /** Agent configuration used */
  config: AgentConfig;
}

/**
 * Agent response
 */
export interface AgentResponse {
  /** Response ID */
  id: string;
  /** Agent type */
  agentType: AgentType;
  /** Response content */
  content: string;
  /** Response status */
  status: AgentStatus;
  /** Tool calls made */
  toolCalls: AgentToolCall[];
  /** Current execution step */
  currentStep: AgentExecutionStep | null;
  /** All execution steps */
  steps: AgentExecutionStep[];
  /** Tokens used */
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  /** Cost in USD */
  costUsd: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Error if failed */
  error: string | null;
  /** Suggestions for next action */
  suggestions: string[];
  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Agent execution request
 */
export interface AgentExecutionRequest {
  /** Agent type to use */
  agentType: AgentType;
  /** User message/prompt */
  prompt: string;
  /** Session ID */
  sessionId: string;
  /** Agent context */
  context: AgentContext;
  /** Agent configuration overrides */
  configOverrides?: Partial<AgentConfig>;
  /** Enable streaming */
  streaming?: boolean;
}

/**
 * Agent streaming event
 */
export interface AgentStreamEvent {
  /** Event type */
  type: 'start' | 'step' | 'tool_call' | 'content' | 'end' | 'error';
  /** Event data */
  data: {
    /** Response ID */
    responseId: string;
    /** Agent type */
    agentType: AgentType;
    /** Current status */
    status: AgentStatus;
    /** Step data (for step events) */
    step?: AgentExecutionStep;
    /** Tool call data (for tool_call events) */
    toolCall?: AgentToolCall;
    /** Content chunk (for content events) */
    content?: string;
    /** Error data (for error events) */
    error?: string;
    /** Final response (for end events) */
    response?: AgentResponse;
  };
  /** Event timestamp */
  timestamp: Date;
}

/**
 * Agent statistics
 */
export interface AgentStats {
  /** Agent type */
  agentType: AgentType;
  /** Total executions */
  totalExecutions: number;
  /** Successful executions */
  successfulExecutions: number;
  /** Failed executions */
  failedExecutions: number;
  /** Average duration in milliseconds */
  averageDurationMs: number;
  /** Total tokens used */
  totalTokens: number;
  /** Total cost in USD */
  totalCostUsd: number;
  /** Total tool calls */
  totalToolCalls: number;
  /** Most used tools */
  mostUsedTools: {
    toolName: string;
    count: number;
  }[];
  /** Last used timestamp */
  lastUsedAt: Date | null;
  /** Last updated timestamp */
  lastUpdated: Date;
}
