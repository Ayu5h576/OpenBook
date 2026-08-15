/**
 * Unified Cache Service
 *
 * Strategy:
 *  1. Try Redis (if REDIS_URL is set and client is available)
 *  2. Fall back to the existing file-based CacheManager
 *
 * All callers use this module — they don't need to know which backend is active.
 */
import { getRedisClient } from './redisClient';
import { cacheManager } from '../ai/cache/cacheManager';

export const cacheService = {
  /**
   * Retrieve a cached value. Returns null on miss or error.
   */
  async get<T = any>(key: string): Promise<T | null> {
    const redis = getRedisClient();
    if (redis) {
      try {
        const raw = await redis.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch (err) {
        console.error('[CacheService] Redis get error:', err);
        // Fall through to file cache
      }
    }
    return cacheManager.get(key) as Promise<T | null>;
  },

  /**
   * Store a value with a TTL (in milliseconds).
   */
  async set(key: string, value: any, ttlMs: number): Promise<void> {
    const redis = getRedisClient();
    if (redis) {
      try {
        const ttlSecs = Math.ceil(ttlMs / 1000);
        await redis.set(key, JSON.stringify(value), 'EX', ttlSecs);
        return;
      } catch (err) {
        console.error('[CacheService] Redis set error:', err);
        // Fall through to file cache
      }
    }
    await cacheManager.set(key, value, ttlMs);
  },

  /**
   * Delete a single key.
   */
  async del(key: string): Promise<void> {
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.del(key);
        return;
      } catch (err) {
        console.error('[CacheService] Redis del error:', err);
      }
    }
    await cacheManager.delete(key);
  },

  /**
   * Convenience: return cached value or compute + store it.
   */
  async getOrSet<T>(
    key: string,
    ttlMs: number,
    compute: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get(key) as T | null;
    if (cached !== null) return cached;
    const value = await compute();
    await this.set(key, value, ttlMs);
    return value;
  },
};
