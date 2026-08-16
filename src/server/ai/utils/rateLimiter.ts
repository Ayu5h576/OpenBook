/**
 * Rate Limiter - Per-user request limits for AI features
 *
 * Backed by Redis when REDIS_URL is configured so limits are shared across
 * replicas; falls back to an in-process Map otherwise (single-instance dev,
 * tests). Redis failures fall through to the Map rather than rejecting the
 * request — a degraded limiter is better than a 500.
 */
import { getRedisClient } from '../../cache/redisClient';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const REDIS_PREFIX = 'ratelimit:ai:';

export class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private readonly defaultLimit = 20; // requests per day
  private readonly windowMs = 24 * 60 * 60 * 1000; // 24 hours

  async isAllowed(userId: string, limit = this.defaultLimit): Promise<boolean> {
    const redis = getRedisClient();
    if (redis) {
      try {
        const key = `${REDIS_PREFIX}${userId}`;
        const count = await redis.incr(key);
        // Only the first request in a window sets the expiry, so the window
        // slides forward from the first hit rather than every hit.
        if (count === 1) {
          await redis.pexpire(key, this.windowMs);
        }
        return count <= limit;
      } catch (err) {
        console.error('[RateLimiter] Redis error, falling back to memory:', err);
      }
    }
    return this.isAllowedInMemory(userId, limit);
  }

  private isAllowedInMemory(userId: string, limit: number): boolean {
    const now = Date.now();
    const key = `limit:${userId}`;
    let entry = this.limits.get(key);

    // Reset if window expired
    if (!entry || now > entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + this.windowMs,
      };
      this.limits.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= limit) {
      return false;
    }

    // Increment and allow
    entry.count++;
    return true;
  }

  async getRemainingRequests(userId: string, limit = this.defaultLimit): Promise<number> {
    const redis = getRedisClient();
    if (redis) {
      try {
        const raw = await redis.get(`${REDIS_PREFIX}${userId}`);
        const used = raw ? parseInt(raw, 10) : 0;
        return Math.max(0, limit - (Number.isNaN(used) ? 0 : used));
      } catch (err) {
        console.error('[RateLimiter] Redis error, falling back to memory:', err);
      }
    }

    const now = Date.now();
    const entry = this.limits.get(`limit:${userId}`);

    if (!entry || now > entry.resetAt) {
      return limit;
    }

    return Math.max(0, limit - entry.count);
  }

  async reset(userId: string): Promise<void> {
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.del(`${REDIS_PREFIX}${userId}`);
      } catch (err) {
        console.error('[RateLimiter] Redis error during reset:', err);
      }
    }
    this.limits.delete(`limit:${userId}`);
  }

  // Cleanup old entries periodically (in-memory fallback only; Redis expires keys itself)
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

// Cleanup every hour. unref() so this timer never holds the event loop open —
// without it, any process that imports the server (tests, CLI scripts) hangs
// on exit instead of finishing.
setInterval(() => rateLimiter.cleanup(), 60 * 60 * 1000).unref();
