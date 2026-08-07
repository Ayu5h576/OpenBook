/**
 * Cache Manager - Handles response caching with TTL
 * File-based cache implementation (Redis-ready for upgrade)
 */

import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'ai');

interface CacheEntry {
  data: any;
  expiresAt: number; // Unix timestamp
  createdAt: number;
}

export class CacheManager {
  async get(key: string): Promise<any | null> {
    try {
      const filePath = this.getFilePath(key);
      const content = await fs.readFile(filePath, 'utf-8');
      const entry: CacheEntry = JSON.parse(content);

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        await fs.unlink(filePath).catch(() => {}); // Delete expired entry
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  async set(key: string, data: any, ttlMs: number): Promise<void> {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });

      const entry: CacheEntry = {
        data,
        expiresAt: Date.now() + ttlMs,
        createdAt: Date.now(),
      };

      const filePath = this.getFilePath(key);
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2));
    } catch (error) {
      console.error('[CacheManager] Failed to write cache:', error);
      // Gracefully fail - continue without caching
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath).catch(() => {});
    } catch {
      // Ignore errors
    }
  }

  async clear(): Promise<void> {
    try {
      await fs.rm(CACHE_DIR, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  }

  private getFilePath(key: string): string {
    // Sanitize key for filename
    const sanitized = key.replace(/[^a-z0-9]/gi, '-');
    return path.join(CACHE_DIR, `${sanitized}.json`);
  }

  // Generate cache key from parameters
  static getCacheKey(feature: string, userId: string, params?: Record<string, any>): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${feature}:${userId}:${paramStr}`;
  }

  // Cache TTLs (in milliseconds)
  static readonly TTLs = {
    RECOMMENDATIONS: 24 * 60 * 60 * 1000, // 24 hours
    BOOK_DNA: 7 * 24 * 60 * 60 * 1000, // 7 days
    SUMMARIES: 30 * 24 * 60 * 60 * 1000, // 30 days
    INSIGHTS: 24 * 60 * 60 * 1000, // 24 hours
    PLANNER: 7 * 24 * 60 * 60 * 1000, // 7 days
    CHAT: 24 * 60 * 60 * 1000, // 24 hours (per conversation)
  };
}

export const cacheManager = new CacheManager();
