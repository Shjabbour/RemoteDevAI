import Redis from 'ioredis';
import config from '../config';
import { SubscriptionTier } from '@prisma/client';

/**
 * Redis-based rate limiting service using sliding window algorithm
 */
export class RateLimitService {
  private redis: Redis;

  // Rate limit tiers (requests per window)
  private static readonly TIER_LIMITS = {
    FREE: {
      api: { limit: 100, window: 86400 }, // 100 requests per day
      auth: { limit: 10, window: 3600 }, // 10 requests per hour
      upload: { limit: 5, window: 86400 }, // 5 uploads per day
    },
    PRO: {
      api: { limit: 10000, window: 86400 }, // 10k requests per day
      auth: { limit: 50, window: 3600 }, // 50 requests per hour
      upload: { limit: 500, window: 86400 }, // 500 uploads per day
    },
    ENTERPRISE: {
      api: { limit: -1, window: 0 }, // Unlimited
      auth: { limit: 200, window: 3600 }, // 200 requests per hour (still limited for security)
      upload: { limit: -1, window: 0 }, // Unlimited
    },
  };

  // Per-IP rate limits (to prevent abuse)
  private static readonly IP_LIMITS = {
    auth: { limit: 20, window: 3600 }, // 20 auth requests per hour per IP
    api: { limit: 200, window: 60 }, // 200 requests per minute per IP
  };

  constructor() {
    this.redis = new Redis(config.redisUrl || 'redis://localhost:6379');

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  /**
   * Check rate limit using sliding window algorithm
   */
  async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number,
    type: string = 'api'
  ): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
    reset: number; // Unix timestamp when limit resets
  }> {
    // Unlimited
    if (limit === -1) {
      return {
        allowed: true,
        current: 0,
        limit: -1,
        remaining: -1,
        reset: 0,
      };
    }

    const key = `rate_limit:${type}:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    try {
      // Use Redis sorted set with timestamps as scores
      // Remove old entries outside the window
      await this.redis.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      const current = await this.redis.zcard(key);

      if (current >= limit) {
        // Get the oldest entry to calculate reset time
        const oldestEntry = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
        const oldestTimestamp = oldestEntry.length > 1 ? parseInt(oldestEntry[1]) : now;
        const reset = Math.ceil((oldestTimestamp + windowSeconds * 1000) / 1000);

        return {
          allowed: false,
          current,
          limit,
          remaining: 0,
          reset,
        };
      }

      // Add new entry
      await this.redis.zadd(key, now, `${now}:${Math.random()}`);

      // Set TTL to window duration + 1 hour (for cleanup)
      await this.redis.expire(key, windowSeconds + 3600);

      return {
        allowed: true,
        current: current + 1,
        limit,
        remaining: limit - current - 1,
        reset: Math.ceil((now + windowSeconds * 1000) / 1000),
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the request (fail open)
      return {
        allowed: true,
        current: 0,
        limit,
        remaining: limit,
        reset: Math.ceil((now + windowSeconds * 1000) / 1000),
      };
    }
  }

  /**
   * Check user rate limit based on subscription tier
   */
  async checkUserLimit(
    userId: string,
    tier: SubscriptionTier,
    type: 'api' | 'auth' | 'upload' = 'api'
  ) {
    const tierLimits = RateLimitService.TIER_LIMITS[tier];
    const { limit, window } = tierLimits[type];

    return this.checkRateLimit(userId, limit, window, `user:${type}`);
  }

  /**
   * Check IP-based rate limit
   */
  async checkIpLimit(ipAddress: string, type: 'api' | 'auth' = 'api') {
    const { limit, window } = RateLimitService.IP_LIMITS[type];
    return this.checkRateLimit(ipAddress, limit, window, `ip:${type}`);
  }

  /**
   * Check endpoint-specific rate limit
   */
  async checkEndpointLimit(
    identifier: string,
    endpoint: string,
    limit: number,
    windowSeconds: number
  ) {
    const normalizedEndpoint = endpoint.replace(/[^a-zA-Z0-9]/g, '_');
    return this.checkRateLimit(
      identifier,
      limit,
      windowSeconds,
      `endpoint:${normalizedEndpoint}`
    );
  }

  /**
   * Reset rate limit for a user (admin action)
   */
  async resetUserLimit(userId: string, type: 'api' | 'auth' | 'upload' = 'api') {
    const key = `rate_limit:user:${type}:${userId}`;
    await this.redis.del(key);
  }

  /**
   * Get current usage for a user
   */
  async getUserUsage(
    userId: string,
    tier: SubscriptionTier,
    type: 'api' | 'auth' | 'upload' = 'api'
  ): Promise<{
    current: number;
    limit: number;
    remaining: number;
    reset: number;
    percentage: number;
  }> {
    const tierLimits = RateLimitService.TIER_LIMITS[tier];
    const { limit, window } = tierLimits[type];

    if (limit === -1) {
      return {
        current: 0,
        limit: -1,
        remaining: -1,
        reset: 0,
        percentage: 0,
      };
    }

    const key = `rate_limit:user:${type}:${userId}`;
    const now = Date.now();
    const windowStart = now - window * 1000;

    try {
      // Remove old entries
      await this.redis.zremrangebyscore(key, 0, windowStart);

      // Count current requests
      const current = await this.redis.zcard(key);
      const remaining = Math.max(0, limit - current);
      const percentage = limit > 0 ? (current / limit) * 100 : 0;

      // Get reset time from oldest entry
      const oldestEntry = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const oldestTimestamp = oldestEntry.length > 1 ? parseInt(oldestEntry[1]) : now;
      const reset = Math.ceil((oldestTimestamp + window * 1000) / 1000);

      return {
        current,
        limit,
        remaining,
        reset,
        percentage,
      };
    } catch (error) {
      console.error('Error getting user usage:', error);
      return {
        current: 0,
        limit,
        remaining: limit,
        reset: Math.ceil((now + window * 1000) / 1000),
        percentage: 0,
      };
    }
  }

  /**
   * Batch check multiple rate limits
   */
  async checkMultipleLimits(checks: Array<{
    identifier: string;
    limit: number;
    windowSeconds: number;
    type: string;
  }>) {
    return Promise.all(
      checks.map((check) =>
        this.checkRateLimit(check.identifier, check.limit, check.windowSeconds, check.type)
      )
    );
  }

  /**
   * Close Redis connection
   */
  async close() {
    await this.redis.quit();
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
let rateLimitService: RateLimitService | null = null;

export const getRateLimitService = (): RateLimitService => {
  if (!rateLimitService) {
    rateLimitService = new RateLimitService();
  }
  return rateLimitService;
};

export default getRateLimitService();
