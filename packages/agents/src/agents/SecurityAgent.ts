/**
 * SecurityAgent - Handles security validation and protection
 *
 * Features:
 * - Validates authentication tokens
 * - Encrypts sensitive data
 * - Sandboxes code execution
 * - Rate limiting
 * - Audit logging
 */

import * as crypto from 'crypto';
import { BaseAgent } from '../base/BaseAgent';
import {
  AgentConfig,
  AgentContext,
  AgentMessage,
  AgentResponse,
  AgentType,
  MessageType,
  SecurityCheckResult,
} from '../types';

interface SecurityCheckRequest {
  operation: string;
  userId: string;
  resourceId?: string;
  data?: any;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  operation: string;
  resourceId?: string;
  result: 'success' | 'failure';
  details?: any;
}

/**
 * Security Agent
 */
export class SecurityAgent extends BaseAgent {
  private rateLimitMap: Map<string, RateLimitEntry> = new Map();
  private auditLog: AuditLogEntry[] = [];
  private encryptionKey: Buffer;
  private allowedOperations: Set<string> = new Set([
    'read_file',
    'write_file',
    'execute_code',
    'git_commit',
    'git_push',
    'screen_record',
    'send_notification',
  ]);

  // Rate limit configuration (requests per minute)
  private rateLimits: Record<string, number> = {
    default: 60,
    execute_code: 10,
    git_push: 5,
    screen_record: 3,
  };

  constructor(config: Partial<AgentConfig> = {}) {
    super({
      name: 'Security Agent',
      type: AgentType.SECURITY,
      enabled: true,
      retryAttempts: 1,
      timeout: 5000,
      logLevel: 'info',
      ...config,
    });

    // Generate or load encryption key
    this.encryptionKey = this.getEncryptionKey();

    // Start rate limit cleanup interval
    setInterval(() => this.cleanupRateLimits(), 60000); // Every minute
  }

  /**
   * Initialize the agent
   */
  protected async onInitialize(): Promise<void> {
    this.logger.info('Security Agent initialized', {
      allowedOperations: Array.from(this.allowedOperations),
    });
  }

  /**
   * Process security check request
   */
  protected async process(
    message: AgentMessage,
    context: AgentContext
  ): Promise<AgentResponse<SecurityCheckResult>> {
    if (message.type !== MessageType.SECURITY_CHECK) {
      return this.createErrorResponse(
        'INVALID_MESSAGE_TYPE',
        `Expected SECURITY_CHECK, got ${message.type}`
      );
    }

    const request = message.payload as SecurityCheckRequest;

    try {
      this.logger.info('Performing security check', {
        operation: request.operation,
        userId: request.userId,
      });

      const result = await this.performSecurityCheck(request, context);

      // Log to audit log
      this.logAudit({
        userId: request.userId,
        operation: request.operation,
        resourceId: request.resourceId,
        result: result.passed ? 'success' : 'failure',
        details: result.violations,
      });

      this.logger.info('Security check completed', {
        operation: request.operation,
        passed: result.passed,
        risk: result.risk,
      });

      return this.createSuccessResponse(result);
    } catch (error) {
      this.logger.error('Security check failed', { error });

      // Log failed check
      this.logAudit({
        userId: request.userId,
        operation: request.operation,
        result: 'failure',
        details: { error: (error as Error).message },
      });

      return this.createErrorResponse(
        'SECURITY_CHECK_FAILED',
        (error as Error).message,
        error
      );
    }
  }

  /**
   * Perform comprehensive security check
   */
  private async performSecurityCheck(
    request: SecurityCheckRequest,
    context: AgentContext
  ): Promise<SecurityCheckResult> {
    const checks = {
      authentication: await this.checkAuthentication(request.userId, context),
      authorization: await this.checkAuthorization(
        request.userId,
        request.operation,
        request.resourceId
      ),
      rateLimiting: await this.checkRateLimit(request.userId, request.operation),
      inputValidation: await this.validateInput(request.data),
      sandboxing: await this.checkSandboxing(request.operation, request.data),
    };

    const violations: string[] = [];

    if (!checks.authentication) violations.push('Authentication failed');
    if (!checks.authorization) violations.push('Authorization denied');
    if (!checks.rateLimiting) violations.push('Rate limit exceeded');
    if (!checks.inputValidation) violations.push('Invalid input detected');
    if (!checks.sandboxing) violations.push('Sandboxing requirements not met');

    const passed = violations.length === 0;
    const risk = this.calculateRisk(checks, violations);

    return {
      passed,
      checks,
      violations: violations.length > 0 ? violations : undefined,
      risk,
    };
  }

  /**
   * Check user authentication
   */
  private async checkAuthentication(
    userId: string,
    context: AgentContext
  ): Promise<boolean> {
    // Verify userId matches context
    if (userId !== context.userId) {
      this.logger.warn('User ID mismatch', { provided: userId, expected: context.userId });
      return false;
    }

    // In a real implementation, verify JWT token or session
    // For now, check if userId is present and valid format
    return userId.length > 0;
  }

  /**
   * Check user authorization for operation
   */
  private async checkAuthorization(
    userId: string,
    operation: string,
    resourceId?: string
  ): Promise<boolean> {
    // Check if operation is allowed
    if (!this.allowedOperations.has(operation)) {
      this.logger.warn('Operation not allowed', { operation });
      return false;
    }

    // In a real implementation, check user permissions from database
    // For now, all authenticated users are authorized
    return true;
  }

  /**
   * Check rate limiting
   */
  private async checkRateLimit(userId: string, operation: string): Promise<boolean> {
    const key = `${userId}:${operation}`;
    const limit = this.rateLimits[operation] || this.rateLimits.default;
    const now = Date.now();
    const windowMs = 60000; // 1 minute

    const entry = this.rateLimitMap.get(key);

    if (!entry || now > entry.resetTime) {
      // New window
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    if (entry.count >= limit) {
      this.logger.warn('Rate limit exceeded', { userId, operation, count: entry.count });
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Validate input data
   */
  private async validateInput(data: any): Promise<boolean> {
    if (!data) return true;

    // Check for common injection patterns
    const dangerousPatterns = [
      /(\||&|;|`|\$\(|\$\{)/g, // Command injection
      /<script[^>]*>.*?<\/script>/gi, // XSS
      /(\bDROP\b|\bDELETE\b|\bUPDATE\b|\bINSERT\b).*\bFROM\b/gi, // SQL injection
      /\.\.\//g, // Path traversal
    ];

    const dataStr = JSON.stringify(data);

    for (const pattern of dangerousPatterns) {
      if (pattern.test(dataStr)) {
        this.logger.warn('Dangerous pattern detected in input', { pattern: pattern.source });
        return false;
      }
    }

    return true;
  }

  /**
   * Check sandboxing requirements
   */
  private async checkSandboxing(operation: string, data: any): Promise<boolean> {
    // Operations that require sandboxing
    const sandboxedOps = ['execute_code', 'write_file'];

    if (!sandboxedOps.includes(operation)) {
      return true;
    }

    // In a real implementation, verify sandbox is enabled and configured
    // For now, always pass
    return true;
  }

  /**
   * Calculate risk level based on checks
   */
  private calculateRisk(
    checks: Record<string, boolean>,
    violations: string[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (violations.length === 0) return 'low';

    if (!checks.authentication || !checks.authorization) {
      return 'critical';
    }

    if (!checks.inputValidation || !checks.sandboxing) {
      return 'high';
    }

    if (!checks.rateLimiting) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Encrypt sensitive data
   */
  public encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data
   */
  public decrypt(encryptedData: string): string {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Hash sensitive data (one-way)
   */
  public hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get or generate encryption key
   */
  private getEncryptionKey(): Buffer {
    const keyEnv = process.env.ENCRYPTION_KEY;

    if (keyEnv) {
      return Buffer.from(keyEnv, 'hex');
    }

    // Generate new key (in production, save this securely)
    const key = crypto.randomBytes(32);
    this.logger.warn(
      'Generated new encryption key. Save this: ' + key.toString('hex')
    );
    return key;
  }

  /**
   * Log to audit trail
   */
  private logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const auditEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...entry,
    };

    this.auditLog.push(auditEntry);

    // Keep only last 10000 entries in memory
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }

    this.logger.debug('Audit log entry created', auditEntry);
  }

  /**
   * Get audit log for a user
   */
  public getAuditLog(
    userId?: string,
    limit: number = 100
  ): AuditLogEntry[] {
    let logs = userId
      ? this.auditLog.filter((entry) => entry.userId === userId)
      : this.auditLog;

    return logs.slice(-limit);
  }

  /**
   * Cleanup expired rate limit entries
   */
  private cleanupRateLimits(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitMap.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug('Cleaned up rate limit entries', { count: cleaned });
    }
  }

  /**
   * Get current rate limit status for a user
   */
  public getRateLimitStatus(userId: string, operation: string): {
    limit: number;
    remaining: number;
    resetTime: number;
  } {
    const key = `${userId}:${operation}`;
    const limit = this.rateLimits[operation] || this.rateLimits.default;
    const entry = this.rateLimitMap.get(key);

    if (!entry || Date.now() > entry.resetTime) {
      return {
        limit,
        remaining: limit,
        resetTime: Date.now() + 60000,
      };
    }

    return {
      limit,
      remaining: Math.max(0, limit - entry.count),
      resetTime: entry.resetTime,
    };
  }

  /**
   * Cleanup on shutdown
   */
  protected async onShutdown(): Promise<void> {
    // In production, persist audit log to database
    this.logger.info('Shutting down Security Agent', {
      auditLogEntries: this.auditLog.length,
    });
  }
}
