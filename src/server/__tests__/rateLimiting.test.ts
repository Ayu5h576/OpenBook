/**
 * Rate limiting — unit tests
 *
 * Covers both halves of the distributed rate limiting work:
 *  1. RedisRateLimitStore — the express-rate-limit Store implementation
 *  2. RateLimiter — the per-user daily limiter for AI features
 *
 * Both are expected to FAIL OPEN when Redis misbehaves: a cache outage must not
 * take the API down, so these tests pin that behaviour deliberately.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getRedisClient = vi.fn();

vi.mock('../cache/redisClient', () => ({
  getRedisClient: () => getRedisClient(),
}));

import { RedisRateLimitStore } from '../cache/redisRateLimitStore';
import { RateLimiter } from '../ai/utils/rateLimiter';

/** Build a mock ioredis client whose multi() chain returns `execResult`. */
function makeRedis(execResult: any) {
  const chain = {
    incr: vi.fn().mockReturnThis(),
    pttl: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(execResult),
  };
  return {
    multi: vi.fn(() => chain),
    chain,
    pexpire: vi.fn().mockResolvedValue(1),
    decr: vi.fn().mockResolvedValue(0),
    del: vi.fn().mockResolvedValue(1),
    get: vi.fn(),
    incr: vi.fn(),
    scan: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getRedisClient.mockReturnValue(null);
});

// ---------------------------------------------------------------------------
// RedisRateLimitStore
// ---------------------------------------------------------------------------
describe('RedisRateLimitStore', () => {
  it('reports the hit count and reset time from a single round trip', async () => {
    const redis = makeRedis([
      [null, 4],
      [null, 60_000],
    ]);
    const store = new RedisRateLimitStore(redis as any);
    store.init({ windowMs: 900_000 } as any);

    const info = await store.increment('1.2.3.4');

    expect(info.totalHits).toBe(4);
    expect(info.resetTime).toBeInstanceOf(Date);
    // ~60s out, from the existing PTTL rather than a fresh window.
    const delta = info.resetTime!.getTime() - Date.now();
    expect(delta).toBeGreaterThan(55_000);
    expect(delta).toBeLessThanOrEqual(60_000);
    expect(redis.pexpire).not.toHaveBeenCalled();
  });

  it('starts the window on a brand-new key (PTTL -1 means no expiry set)', async () => {
    const redis = makeRedis([
      [null, 1],
      [null, -1],
    ]);
    const store = new RedisRateLimitStore(redis as any);
    store.init({ windowMs: 900_000 } as any);

    const info = await store.increment('1.2.3.4');

    expect(info.totalHits).toBe(1);
    expect(redis.pexpire).toHaveBeenCalledWith('rl:1.2.3.4', 900_000);
  });

  it('does not slide the window forward on subsequent hits', async () => {
    const redis = makeRedis([
      [null, 9],
      [null, 120_000],
    ]);
    const store = new RedisRateLimitStore(redis as any);
    store.init({ windowMs: 900_000 } as any);

    await store.increment('1.2.3.4');

    // Re-arming the expiry every hit would let a steady stream of requests
    // extend the window indefinitely.
    expect(redis.pexpire).not.toHaveBeenCalled();
  });

  it('applies the configured key prefix', async () => {
    const redis = makeRedis([
      [null, 1],
      [null, 5_000],
    ]);
    const store = new RedisRateLimitStore(redis as any, 'rl:auth:');

    await store.increment('1.2.3.4');

    expect(redis.chain.incr).toHaveBeenCalledWith('rl:auth:1.2.3.4');
  });

  it('fails open when Redis throws', async () => {
    const redis = makeRedis(null);
    redis.chain.exec.mockRejectedValue(new Error('connection refused'));
    const store = new RedisRateLimitStore(redis as any);
    store.init({ windowMs: 900_000 } as any);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const info = await store.increment('1.2.3.4');

    // totalHits 1 => under any sane limit => request allowed.
    expect(info.totalHits).toBe(1);
    spy.mockRestore();
  });

  it('fails open when MULTI is aborted (exec returns null)', async () => {
    const store = new RedisRateLimitStore(makeRedis(null) as any);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const info = await store.increment('1.2.3.4');

    expect(info.totalHits).toBe(1);
    spy.mockRestore();
  });

  it('propagates a command-level error from the MULTI results', async () => {
    const store = new RedisRateLimitStore(
      makeRedis([[new Error('WRONGTYPE'), null], [null, 100]]) as any
    );
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const info = await store.increment('1.2.3.4');

    expect(info.totalHits).toBe(1); // failed open
    spy.mockRestore();
  });

  it('resets a single key and swallows Redis errors', async () => {
    const redis = makeRedis([]);
    const store = new RedisRateLimitStore(redis as any, 'rl:global:');

    await store.resetKey('1.2.3.4');
    expect(redis.del).toHaveBeenCalledWith('rl:global:1.2.3.4');

    redis.del.mockRejectedValue(new Error('nope'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.resetKey('1.2.3.4')).resolves.toBeUndefined();
    spy.mockRestore();
  });

  it('decrements the counter', async () => {
    const redis = makeRedis([]);
    const store = new RedisRateLimitStore(redis as any);

    await store.decrement('1.2.3.4');

    expect(redis.decr).toHaveBeenCalledWith('rl:1.2.3.4');
  });

  it('declares keys as non-local so express-rate-limit skips its double-count warning', () => {
    expect(new RedisRateLimitStore(makeRedis([]) as any).localKeys).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Per-user AI RateLimiter
// ---------------------------------------------------------------------------
describe('RateLimiter (per-user AI limits)', () => {
  it('allows requests up to the limit in memory, then blocks', async () => {
    const limiter = new RateLimiter();

    for (let i = 0; i < 3; i++) {
      await expect(limiter.isAllowed('u1', 3)).resolves.toBe(true);
    }
    await expect(limiter.isAllowed('u1', 3)).resolves.toBe(false);
  });

  it('tracks users independently', async () => {
    const limiter = new RateLimiter();

    await limiter.isAllowed('u1', 1);
    await expect(limiter.isAllowed('u1', 1)).resolves.toBe(false);
    await expect(limiter.isAllowed('u2', 1)).resolves.toBe(true);
  });

  it('reports remaining requests from the in-memory counter', async () => {
    const limiter = new RateLimiter();

    await expect(limiter.getRemainingRequests('u1', 5)).resolves.toBe(5);
    await limiter.isAllowed('u1', 5);
    await expect(limiter.getRemainingRequests('u1', 5)).resolves.toBe(4);
  });

  it('resets a user back to a full allowance', async () => {
    const limiter = new RateLimiter();

    await limiter.isAllowed('u1', 1);
    await expect(limiter.isAllowed('u1', 1)).resolves.toBe(false);

    await limiter.reset('u1');
    await expect(limiter.isAllowed('u1', 1)).resolves.toBe(true);
  });

  it('uses Redis when available and arms the expiry on the first hit only', async () => {
    const redis = makeRedis([]);
    redis.incr.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    getRedisClient.mockReturnValue(redis);
    const limiter = new RateLimiter();

    await expect(limiter.isAllowed('u1', 20)).resolves.toBe(true);
    expect(redis.pexpire).toHaveBeenCalledWith('ratelimit:ai:u1', 24 * 60 * 60 * 1000);

    redis.pexpire.mockClear();
    await expect(limiter.isAllowed('u1', 20)).resolves.toBe(true);
    expect(redis.pexpire).not.toHaveBeenCalled();
  });

  it('blocks once the Redis counter exceeds the limit, and allows exactly at it', async () => {
    const redis = makeRedis([]);
    getRedisClient.mockReturnValue(redis);
    const limiter = new RateLimiter();

    redis.incr.mockResolvedValue(20);
    await expect(limiter.isAllowed('u1', 20)).resolves.toBe(true);

    redis.incr.mockResolvedValue(21);
    await expect(limiter.isAllowed('u1', 20)).resolves.toBe(false);
  });

  it('falls back to the in-memory counter when Redis errors', async () => {
    const redis = makeRedis([]);
    redis.incr.mockRejectedValue(new Error('down'));
    getRedisClient.mockReturnValue(redis);
    const limiter = new RateLimiter();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(limiter.isAllowed('u1', 1)).resolves.toBe(true);
    // Second call must be blocked by the memory fallback, not silently allowed.
    await expect(limiter.isAllowed('u1', 1)).resolves.toBe(false);

    spy.mockRestore();
  });

  it('reads remaining requests from Redis', async () => {
    const redis = makeRedis([]);
    redis.get.mockResolvedValue('7');
    getRedisClient.mockReturnValue(redis);
    const limiter = new RateLimiter();

    await expect(limiter.getRemainingRequests('u1', 20)).resolves.toBe(13);
  });

  it('clamps remaining requests at zero', async () => {
    const redis = makeRedis([]);
    redis.get.mockResolvedValue('99');
    getRedisClient.mockReturnValue(redis);
    const limiter = new RateLimiter();

    await expect(limiter.getRemainingRequests('u1', 20)).resolves.toBe(0);
  });

  it('treats a missing or unparseable Redis counter as unused', async () => {
    const redis = makeRedis([]);
    getRedisClient.mockReturnValue(redis);
    const limiter = new RateLimiter();

    redis.get.mockResolvedValue(null);
    await expect(limiter.getRemainingRequests('u1', 20)).resolves.toBe(20);

    redis.get.mockResolvedValue('garbage');
    await expect(limiter.getRemainingRequests('u1', 20)).resolves.toBe(20);
  });
});
