/**
 * Rate Limiter - Per-user request limits for AI features
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private readonly defaultLimit = 20; // requests per day
  private readonly windowMs = 24 * 60 * 60 * 1000; // 24 hours

  isAllowed(userId: string, limit = this.defaultLimit): boolean {
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

  getRemainingRequests(userId: string, limit = this.defaultLimit): number {
    const now = Date.now();
    const key = `limit:${userId}`;
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetAt) {
      return limit;
    }

    return Math.max(0, limit - entry.count);
  }

  reset(userId: string): void {
    this.limits.delete(`limit:${userId}`);
  }

  // Cleanup old entries periodically
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

// Cleanup every hour
setInterval(() => rateLimiter.cleanup(), 60 * 60 * 1000);
