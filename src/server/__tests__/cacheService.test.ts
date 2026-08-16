/**
 * CacheService — unit tests
 *
 * cacheService is the storage layer the AI controller, analytics stats, and
 * Google Books lookups now go through, so its Redis/file fallback behaviour is
 * load-bearing. Both backends are mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

const getRedisClient = vi.fn();

vi.mock('../cache/redisClient', () => ({
  getRedisClient: () => getRedisClient(),
}));

vi.mock('../ai/cache/cacheManager', () => ({
  cacheManager: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

import { cacheService } from '../cache/cacheService';
import { cacheManager } from '../ai/cache/cacheManager';

beforeEach(() => {
  vi.clearAllMocks();
  getRedisClient.mockReturnValue(null); // default: Redis not configured
});

// ---------------------------------------------------------------------------
// No Redis configured — the common local/dev path
// ---------------------------------------------------------------------------
describe('cacheService without Redis', () => {
  it('reads through the file cache', async () => {
    (cacheManager.get as any).mockResolvedValue({ hello: 'world' });

    await expect(cacheService.get('k')).resolves.toEqual({ hello: 'world' });
    expect(cacheManager.get).toHaveBeenCalledWith('k');
    expect(mockRedis.get).not.toHaveBeenCalled();
  });

  it('writes through the file cache preserving the millisecond TTL', async () => {
    await cacheService.set('k', { a: 1 }, 5000);

    expect(cacheManager.set).toHaveBeenCalledWith('k', { a: 1 }, 5000);
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  it('deletes through the file cache', async () => {
    await cacheService.del('k');

    expect(cacheManager.delete).toHaveBeenCalledWith('k');
  });
});

// ---------------------------------------------------------------------------
// Redis configured
// ---------------------------------------------------------------------------
describe('cacheService with Redis', () => {
  beforeEach(() => {
    getRedisClient.mockReturnValue(mockRedis);
  });

  it('parses a JSON hit from Redis and never touches the file cache', async () => {
    mockRedis.get.mockResolvedValue(JSON.stringify({ hello: 'redis' }));

    await expect(cacheService.get('k')).resolves.toEqual({ hello: 'redis' });
    expect(cacheManager.get).not.toHaveBeenCalled();
  });

  it('returns null on a Redis miss without consulting the file cache', async () => {
    mockRedis.get.mockResolvedValue(null);

    await expect(cacheService.get('k')).resolves.toBeNull();
    expect(cacheManager.get).not.toHaveBeenCalled();
  });

  it('converts the TTL to whole seconds, rounding up', async () => {
    mockRedis.set.mockResolvedValue('OK');

    await cacheService.set('k', { a: 1 }, 1500);

    // 1500ms must not round down to 1s and expire early.
    expect(mockRedis.set).toHaveBeenCalledWith('k', JSON.stringify({ a: 1 }), 'EX', 2);
    expect(cacheManager.set).not.toHaveBeenCalled();
  });

  it('falls back to the file cache when a Redis read throws', async () => {
    mockRedis.get.mockRejectedValue(new Error('connection reset'));
    (cacheManager.get as any).mockResolvedValue({ from: 'file' });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(cacheService.get('k')).resolves.toEqual({ from: 'file' });
    expect(cacheManager.get).toHaveBeenCalledWith('k');

    spy.mockRestore();
  });

  it('falls back to the file cache when a Redis write throws', async () => {
    mockRedis.set.mockRejectedValue(new Error('OOM'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await cacheService.set('k', { a: 1 }, 1000);
    expect(cacheManager.set).toHaveBeenCalledWith('k', { a: 1 }, 1000);

    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// getOrSet — the wrapper analytics + book search rely on
// ---------------------------------------------------------------------------
describe('cacheService.getOrSet', () => {
  it('returns the cached value without running the compute function', async () => {
    (cacheManager.get as any).mockResolvedValue({ cached: true });
    const compute = vi.fn();

    const result = await cacheService.getOrSet('k', 1000, compute);

    expect(result).toEqual({ cached: true });
    expect(compute).not.toHaveBeenCalled();
  });

  it('computes and stores the value on a miss', async () => {
    (cacheManager.get as any).mockResolvedValue(null);
    const compute = vi.fn().mockResolvedValue({ fresh: true });

    const result = await cacheService.getOrSet('k', 1000, compute);

    expect(result).toEqual({ fresh: true });
    expect(compute).toHaveBeenCalledTimes(1);
    expect(cacheManager.set).toHaveBeenCalledWith('k', { fresh: true }, 1000);
  });
});
