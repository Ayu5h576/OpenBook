/**
 * AnalyticsService — unit tests
 *
 * Covers the stats aggregation maths plus the caching layer added in Phase 6
 * (short-TTL per-user cache with explicit invalidation on mutation).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/prisma', () => ({
  prisma: {
    libraryEntry: { findMany: vi.fn() },
    readingSession: { findMany: vi.fn() },
    readingGoal: { findFirst: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock('../cache/cacheService', () => ({
  cacheService: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    // Default: behave as a permanent miss so the real computation runs.
    getOrSet: vi.fn(async (_key: string, _ttl: number, compute: () => Promise<any>) => compute()),
  },
}));

import { AnalyticsService, invalidateUserStats, statsCacheKey } from '../services/analyticsService';
import { prisma } from '../config/prisma';
import { cacheService } from '../cache/cacheService';

const service = new AnalyticsService();
const USER = 'user-1';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function entry(overrides: Record<string, any> = {}) {
  return {
    bookId: 'book-1',
    status: 'READING',
    startedAt: null,
    finishedAt: null,
    book: { pageCount: 300, categories: [] },
    readingSessions: [],
    ...overrides,
  };
}

function session(overrides: Record<string, any> = {}) {
  return {
    startPage: 0,
    endPage: 50,
    durationSecs: 3600,
    startedAt: new Date(),
    ...overrides,
  };
}

function setup(entries: any[] = [], sessions: any[] = [], goal: any = null) {
  (prisma.libraryEntry.findMany as any).mockResolvedValue(entries);
  (prisma.readingSession.findMany as any).mockResolvedValue(sessions);
  (prisma.readingGoal.findFirst as any).mockResolvedValue(goal);
}

beforeEach(() => {
  vi.clearAllMocks();
  (cacheService.getOrSet as any).mockImplementation(
    async (_key: string, _ttl: number, compute: () => Promise<any>) => compute()
  );
});

// ---------------------------------------------------------------------------
// Caching behaviour
// ---------------------------------------------------------------------------
describe('AnalyticsService caching', () => {
  it('routes getStats through the cache under a per-user key', async () => {
    setup();

    await service.getStats(USER);

    expect(cacheService.getOrSet).toHaveBeenCalledWith(
      statsCacheKey(USER),
      5 * 60 * 1000,
      expect.any(Function)
    );
  });

  it('namespaces the cache key per user', () => {
    expect(statsCacheKey('a')).not.toBe(statsCacheKey('b'));
    expect(statsCacheKey('a')).toBe('analytics:stats:a');
  });

  it('does not touch the database on a cache hit', async () => {
    (cacheService.getOrSet as any).mockResolvedValue({ overview: { booksInLibrary: 99 } });

    const result = await service.getStats(USER);

    expect(result).toEqual({ overview: { booksInLibrary: 99 } });
    expect(prisma.libraryEntry.findMany).not.toHaveBeenCalled();
    expect(prisma.readingSession.findMany).not.toHaveBeenCalled();
  });

  it('invalidates the cached stats for the right key', async () => {
    await invalidateUserStats(USER);

    expect(cacheService.del).toHaveBeenCalledWith('analytics:stats:user-1');
  });

  it('never throws out of invalidation', async () => {
    (cacheService.del as any).mockRejectedValue(new Error('redis down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(invalidateUserStats(USER)).resolves.toBeUndefined();

    spy.mockRestore();
  });

  it('invalidates stats after a reading goal is saved', async () => {
    (prisma.readingGoal.upsert as any).mockResolvedValue({ id: 'goal-1' });

    await service.upsertGoal(USER, { year: 2026, targetBooks: 24, targetPages: 8000 } as any);

    expect(cacheService.del).toHaveBeenCalledWith('analytics:stats:user-1');
  });
});

// ---------------------------------------------------------------------------
// Overview aggregation
// ---------------------------------------------------------------------------
describe('AnalyticsService overview', () => {
  it('reports zeroed stats for an empty library', async () => {
    setup();

    const stats = await service.getStats(USER);

    expect(stats.overview).toMatchObject({
      booksInLibrary: 0,
      booksCompleted: 0,
      booksReading: 0,
      totalPagesRead: 0,
      totalHours: 0,
      readingStreak: 0,
      yearlyGoal: null,
      yearlyCompleted: 0,
    });
  });

  it('counts library entries by status', async () => {
    setup([
      entry({ status: 'COMPLETED' }),
      entry({ status: 'COMPLETED' }),
      entry({ status: 'READING' }),
      entry({ status: 'OWNED' }),
    ]);

    const stats = await service.getStats(USER);

    expect(stats.overview.booksInLibrary).toBe(4);
    expect(stats.overview.booksCompleted).toBe(2);
    expect(stats.overview.booksReading).toBe(1);
  });

  it('sums pages and rounds total hours from session durations', async () => {
    setup([], [
      session({ startPage: 0, endPage: 100, durationSecs: 3600 }),
      session({ startPage: 100, endPage: 150, durationSecs: 1800 }),
    ]);

    const stats = await service.getStats(USER);

    expect(stats.overview.totalPagesRead).toBe(150);
    // 5400s = 1.5h -> rounds to 2
    expect(stats.overview.totalHours).toBe(2);
  });

  it('surfaces the yearly goal target when one is set', async () => {
    setup([], [], { targetBooks: 24 });

    const stats = await service.getStats(USER);

    expect(stats.overview.yearlyGoal).toBe(24);
  });

  it('counts only books finished in the current year toward the goal', async () => {
    const thisYear = new Date().getFullYear();
    setup([
      entry({ status: 'COMPLETED', finishedAt: new Date(`${thisYear}-03-01T00:00:00Z`) }),
      entry({ status: 'COMPLETED', finishedAt: new Date(`${thisYear - 1}-03-01T00:00:00Z`) }),
      entry({ status: 'COMPLETED', finishedAt: null }),
    ]);

    const stats = await service.getStats(USER);

    expect(stats.overview.booksCompleted).toBe(3);
    expect(stats.overview.yearlyCompleted).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Streak + genre + records
// ---------------------------------------------------------------------------
describe('AnalyticsService derived series', () => {
  it('counts consecutive reading days and stops at a gap', async () => {
    setup([], [
      session({ startedAt: daysAgo(0) }),
      session({ startedAt: daysAgo(1) }),
      // gap at day 2
      session({ startedAt: daysAgo(3) }),
    ]);

    const stats = await service.getStats(USER);

    expect(stats.overview.readingStreak).toBe(2);
  });

  it('does not break the streak when today has no session yet', async () => {
    setup([], [session({ startedAt: daysAgo(1) }), session({ startedAt: daysAgo(2) })]);

    const stats = await service.getStats(USER);

    // i === 0 (today) is allowed to miss; the streak picks up from yesterday.
    expect(stats.overview.readingStreak).toBe(2);
  });

  it('ranks genre distribution by frequency and caps it at 8', async () => {
    setup([
      entry({ book: { pageCount: 100, categories: ['Fiction', 'Sci-Fi'] } }),
      entry({ book: { pageCount: 100, categories: ['Fiction'] } }),
      entry({ book: { pageCount: 100, categories: ['History'] } }),
    ]);

    const stats = await service.getStats(USER);

    expect(stats.genreDistribution[0]).toEqual({ name: 'Fiction', count: 2 });
    expect(stats.genreDistribution.length).toBeLessThanOrEqual(8);
  });

  it('returns 12 chronological monthly buckets', async () => {
    setup();

    const stats = await service.getStats(USER);

    expect(stats.monthly).toHaveLength(12);
    // reverse() puts the oldest month first and the current month last.
    const currentMonth = new Date().toLocaleString('en', { month: 'short' });
    expect(stats.monthly[11].month).toContain(currentMonth);
  });

  it('builds a per-day heatmap in minutes', async () => {
    const day = daysAgo(0).toISOString().split('T')[0];
    setup([], [
      session({ startedAt: daysAgo(0), durationSecs: 1800 }),
      session({ startedAt: daysAgo(0), durationSecs: 1800 }),
    ]);

    const stats = await service.getStats(USER);
    const bucket = stats.calendar.find((c: any) => c.date === day);

    expect(bucket?.minutes).toBe(60);
  });

  it('identifies longest, shortest and fastest-read records', async () => {
    setup([
      entry({
        bookId: 'long',
        status: 'COMPLETED',
        startedAt: new Date('2026-01-01'),
        finishedAt: new Date('2026-01-11'),
        book: { pageCount: 900, categories: [] },
      }),
      entry({
        bookId: 'short',
        status: 'COMPLETED',
        startedAt: new Date('2026-02-01'),
        finishedAt: new Date('2026-02-03'),
        book: { pageCount: 100, categories: [] },
      }),
    ]);

    const stats = await service.getStats(USER);

    expect(stats.records.longestBookId).toBe('long');
    expect(stats.records.shortestBookId).toBe('short');
    expect(stats.records.fastestReadBookId).toBe('short');
    expect(stats.records.fastestReadDays).toBe(2);
  });

  it('leaves records null when page counts are missing', async () => {
    setup([entry({ book: { pageCount: null, categories: [] } })]);

    const stats = await service.getStats(USER);

    expect(stats.records.longestBookId).toBeNull();
    expect(stats.records.shortestBookId).toBeNull();
    expect(stats.records.fastestReadBookId).toBeNull();
  });
});
