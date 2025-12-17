/**
 * Model Context Protocol (MCP) types
 * Based on Anthropic's MCP specification
 */

/**
 * MCP tool parameter schema
 */
export interface McpToolParameter {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** Parameter description */
  description: string;
  /** Is required */
  required: boolean;
  /** Default value */
  default?: any;
  /** Enum values (for string type) */
  enum?: string[];
  /** Array item type (for array type) */
  items?: McpToolParameter;
  /** Object properties (for object type) */
  properties?: Record<string, McpToolParameter>;
}

/**
 * MCP tool definition
 */
export interface McpTool {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Tool version */
  version: string;
  /** Tool category */
  category: 'file' | 'terminal' | 'browser' | 'database' | 'api' | 'git' | 'system' | 'custom';
  /** Input parameters schema */
  inputSchema: {
    type: 'object';
    properties: Record<string, McpToolParameter>;
    required: string[];
  };
  /** Output schema */
  outputSchema?: {
    type: string;
    properties?: Record<string, any>;
  };
  /** Tool metadata */
  metadata?: {
    /** Author */
    author?: string;
    /** License */
    license?: string;
    /** Repository URL */
    repositoryUrl?: string;
    /** Documentation URL */
    docsUrl?: string;
    /** Tags */
    tags?: string[];
    /** Requires confirmation before execution */
    requiresConfirmation?: boolean;
    /** Estimated execution time in ms */
    estimatedDurationMs?: number;
    /** Rate limit (calls per minute) */
    rateLimit?: number;
  };
}

/**
 * MCP tool result
 */
export interface McpToolResult {
  /** Execution status */
  status: 'success' | 'error' | 'timeout' | 'canceled';
  /** Result data */
  data?: any;
  /** Error information */
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  /** Execution metadata */
  metadata: {
    /** Execution duration in ms */
    durationMs: number;
    /** Timestamp */
    timestamp: Date;
    /** Tool version used */
    toolVersion: string;
    /** Retry count */
    retryCount?: number;
  };
  /** Output logs */
  logs?: string[];
  /** Output artifacts (files, screenshots, etc.) */
  artifacts?: {
    type: string;
    name: string;
    url: string;
    sizeBytes: number;
  }[];
}

/**
 * MCP request
 */
export interface McpRequest {
  /** Request ID */
  id: string;
  /** Tool name */
  tool: string;
  /** Tool arguments */
  arguments: Record<string, any>;
  /** Request context */
  context?: {
    /** Session ID */
    sessionId?: string;
    /** Project ID */
    projectId?: string;
    /** User ID */
    userId?: string;
    /** Working directory */
    workingDirectory?: string;
    /** Environment variables */
    environment?: Record<string, string>;
  };
  /** Request timestamp */
  timestamp: Date;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** User confirmation received */
  confirmed?: boolean;
}

/**
 * MCP response
 */
export interface McpResponse {
  /** Request ID */
  requestId: string;
  /** Tool name */
  tool: string;
  /** Tool result */
  result: McpToolResult;
  /** Response timestamp */
  timestamp: Date;
}

/**
 * MCP server information
 */
export interface McpServerInfo {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Protocol version */
  protocolVersion: string;
  /** Server capabilities */
  capabilities: {
    /** Supports tool execution */
    tools: boolean;
    /** Supports streaming */
    streaming: boolean;
    /** Supports cancellation */
    cancellation: boolean;
    /** Supports progress reporting */
    progress: boolean;
  };
  /** Available tools */
  tools: McpTool[];
  /** Server metadata */
  metadata?: {
    description?: string;
    author?: string;
    license?: string;
    repositoryUrl?: string;
  };
}

/**
 * MCP server connection
 */
export interface McpServerConnection {
  /** Connection ID */
  id: string;
  /** Server info */
  serverInfo: McpServerInfo;
  /** Connection status */
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  /** Connection URL */
  url: string;
  /** Connection established timestamp */
  connectedAt: Date | null;
  /** Last activity timestamp */
  lastActivityAt: Date | null;
  /** Error information */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * MCP tool execution options
 */
export interface McpExecutionOptions {
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Retry on failure */
  retry?: {
    maxAttempts: number;
    delayMs: number;
    exponentialBackoff: boolean;
  };
  /** Require user confirmation */
  requireConfirmation?: boolean;
  /** Enable progress reporting */
  reportProgress?: boolean;
  /** Execution priority */
  priority?: 'low' | 'normal' | 'high';
  /** Cache result */
  cache?: {
    enabled: boolean;
    ttlSeconds: number;
    key?: string;
  };
}

/**
 * MCP progress event
 */
export interface McpProgressEvent {
  /** Request ID */
  requestId: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current stage */
  stage: string;
  /** Status message */
  message?: string;
  /** Estimated time remaining in ms */
  estimatedRemainingMs?: number;
  /** Timestamp */
  timestamp: Date;
}

/**
 * MCP streaming chunk
 */
export interface McpStreamChunk {
  /** Request ID */
  requestId: string;
  /** Chunk type */
  type: 'stdout' | 'stderr' | 'data' | 'error' | 'end';
  /** Chunk data */
  data: any;
  /** Chunk timestamp */
  timestamp: Date;
}

/**
 * MCP tool registry entry
 */
export interface McpToolRegistryEntry {
  /** Tool definition */
  tool: McpTool;
  /** Server ID providing this tool */
  serverId: string;
  /** Server name */
  serverName: string;
  /** Is tool available */
  available: boolean;
  /** Last health check timestamp */
  lastHealthCheck: Date | null;
  /** Usage statistics */
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageDurationMs: number;
    lastExecutedAt: Date | null;
  };
}

/**
 * MCP configuration
 */
export interface McpConfig {
  /** Enabled MCP servers */
  servers: {
    /** Server ID */
    id: string;
    /** Server URL */
    url: string;
    /** Is enabled */
    enabled: boolean;
    /** Authentication */
    auth?: {
      type: 'bearer' | 'basic' | 'api-key';
      credentials: Record<string, string>;
    };
    /** Connection timeout */
    timeoutMs?: number;
    /** Auto-reconnect */
    autoReconnect?: boolean;
  }[];
  /** Global execution options */
  defaultExecutionOptions: McpExecutionOptions;
  /** Tool allowlist (empty = allow all) */
  allowedTools?: string[];
  /** Tool blocklist */
  blockedTools?: string[];
  /** Enable tool execution caching */
  enableCaching: boolean;
  /** Cache TTL in seconds */
  cacheTtlSeconds: number;
}
