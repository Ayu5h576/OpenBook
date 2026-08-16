/**
 * AchievementService — unit tests
 *
 * Prisma is mocked. Covers the metric computation, threshold/progress maths, and
 * first-time unlock persistence for the 13-achievement catalog.
 *
 * The activity metadata keys asserted here (achievementKey / achievementTitle)
 * are read by name in the frontend feed, so they are pinned deliberately.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AchievementService } from '../services/achievementService';

vi.mock('../config/prisma', () => ({
  prisma: {
    libraryEntry: { findMany: vi.fn() },
    readingSession: { findMany: vi.fn() },
    review: { count: vi.fn() },
    follow: { count: vi.fn() },
    bookClubMember: { count: vi.fn() },
    userAchievement: { findMany: vi.fn(), createMany: vi.fn() },
    profile: { findUnique: vi.fn() },
    activity: { create: vi.fn() },
  },
}));

import { prisma } from '../config/prisma';

const service = new AchievementService();
const USER = 'user-1';

/** ISO date string for N days before today, matching the service's day bucketing. */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Configure the full metric surface; every field has a zero-ish default. */
function setupMetrics(opts: {
  entries?: any[];
  sessions?: any[];
  reviews?: number;
  following?: number;
  clubs?: number;
  unlocked?: { achievementKey: string; unlockedAt: Date }[];
} = {}) {
  (prisma.libraryEntry.findMany as any).mockResolvedValue(opts.entries ?? []);
  (prisma.readingSession.findMany as any).mockResolvedValue(opts.sessions ?? []);
  (prisma.review.count as any).mockResolvedValue(opts.reviews ?? 0);
  (prisma.follow.count as any).mockResolvedValue(opts.following ?? 0);
  (prisma.bookClubMember.count as any).mockResolvedValue(opts.clubs ?? 0);
  (prisma.userAchievement.findMany as any).mockResolvedValue(opts.unlocked ?? []);
}

function entry(status: string, categories: string[] = []) {
  return { status, book: { categories } };
}

function session(startPage: number, endPage: number, durationSecs: number, startedAt = new Date()) {
  return { startPage, endPage, durationSecs, startedAt };
}

/** Pull a single achievement out of the response by key. */
function find(result: any, key: string) {
  return result.achievements.find((a: any) => a.key === key);
}

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.userAchievement.createMany as any).mockResolvedValue({ count: 0 });
  (prisma.profile.findUnique as any).mockResolvedValue({ username: 'ayush' });
  (prisma.activity.create as any).mockResolvedValue({});
});

// ---------------------------------------------------------------------------
// Catalog shape
// ---------------------------------------------------------------------------
describe('AchievementService catalog', () => {
  it('returns the full 13-achievement catalog with a summary', async () => {
    setupMetrics();

    const result = await service.getAchievements(USER);

    expect(result.achievements).toHaveLength(13);
    expect(result.summary).toEqual({ unlocked: 0, total: 13 });
  });

  it('locks everything for a brand-new user', async () => {
    setupMetrics();

    const result = await service.getAchievements(USER);

    expect(result.achievements.every((a: any) => !a.unlocked)).toBe(true);
    expect(result.achievements.every((a: any) => a.unlockedAt === null)).toBe(true);
    expect(prisma.userAchievement.createMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Metric computation
// ---------------------------------------------------------------------------
describe('AchievementService metrics', () => {
  it('unlocks first_book off library size, not completion', async () => {
    setupMetrics({ entries: [entry('READING')] });

    const result = await service.getAchievements(USER);

    expect(find(result, 'first_book').unlocked).toBe(true);
    expect(find(result, 'five_books').unlocked).toBe(false);
  });

  it('counts only COMPLETED entries toward book-finishing achievements', async () => {
    setupMetrics({
      entries: [
        ...Array.from({ length: 5 }, () => entry('COMPLETED')),
        entry('READING'),
        entry('PAUSED'),
      ],
    });

    const result = await service.getAchievements(USER);

    expect(find(result, 'five_books').unlocked).toBe(true);
    expect(find(result, 'five_books').progress).toBe(5);
    expect(find(result, 'twenty_books').unlocked).toBe(false);
  });

  it('sums pages across sessions and ignores negative page deltas', async () => {
    setupMetrics({
      sessions: [
        session(0, 600, 0),
        session(600, 1000, 0),
        session(500, 100, 0), // bogus backwards session must not subtract
      ],
    });

    const result = await service.getAchievements(USER);

    expect(find(result, 'thousand_pages').unlocked).toBe(true);
    expect(find(result, 'five_thousand_pages').progress).toBe(1000);
  });

  it('floors reading hours so a partial hour does not unlock early', async () => {
    setupMetrics({ sessions: [session(0, 1, 10 * 3600 - 1)] });

    let result = await service.getAchievements(USER);
    expect(find(result, 'ten_hours').unlocked).toBe(false);
    expect(find(result, 'ten_hours').progress).toBe(9);

    setupMetrics({ sessions: [session(0, 1, 10 * 3600)] });
    result = await service.getAchievements(USER);
    expect(find(result, 'ten_hours').unlocked).toBe(true);
  });

  it('counts distinct genres across the library, de-duplicating repeats', async () => {
    setupMetrics({
      entries: [
        entry('COMPLETED', ['Fiction', 'Sci-Fi']),
        entry('COMPLETED', ['Fiction', 'Fantasy']),
        entry('READING', ['History', 'Biography']),
      ],
    });

    const result = await service.getAchievements(USER);

    // Fiction/Sci-Fi/Fantasy/History/Biography = 5 distinct
    expect(find(result, 'genre_explorer').unlocked).toBe(true);
  });

  it('tolerates entries with no categories', async () => {
    setupMetrics({ entries: [{ status: 'READING', book: { categories: null } }] });

    const result = await service.getAchievements(USER);

    expect(find(result, 'genre_explorer').progress).toBe(0);
  });

  it('counts a consecutive-day streak ending today', async () => {
    setupMetrics({
      sessions: [
        session(0, 10, 60, daysAgo(0)),
        session(0, 10, 60, daysAgo(1)),
        session(0, 10, 60, daysAgo(2)),
      ],
    });

    const result = await service.getAchievements(USER);

    expect(find(result, 'streak_7').progress).toBe(3);
    expect(find(result, 'streak_7').unlocked).toBe(false);
  });

  it('breaks the streak on a gap', async () => {
    setupMetrics({
      sessions: [
        session(0, 10, 60, daysAgo(0)),
        session(0, 10, 60, daysAgo(1)),
        // gap at day 2
        session(0, 10, 60, daysAgo(3)),
      ],
    });

    const result = await service.getAchievements(USER);

    expect(find(result, 'streak_7').progress).toBe(2);
  });

  it('maps social metrics to their achievements', async () => {
    setupMetrics({ reviews: 5, following: 1, clubs: 1 });

    const result = await service.getAchievements(USER);

    expect(find(result, 'first_review').unlocked).toBe(true);
    expect(find(result, 'five_reviews').unlocked).toBe(true);
    expect(find(result, 'first_follow').unlocked).toBe(true);
    expect(find(result, 'club_member').unlocked).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Progress maths
// ---------------------------------------------------------------------------
describe('AchievementService progress', () => {
  it('clamps progress and percent at the threshold', async () => {
    setupMetrics({ reviews: 50 });

    const result = await service.getAchievements(USER);
    const achievement = find(result, 'five_reviews');

    expect(achievement.progress).toBe(5);
    expect(achievement.progressPercent).toBe(100);
  });

  it('reports partial progress as a rounded percentage', async () => {
    setupMetrics({ entries: Array.from({ length: 2 }, () => entry('COMPLETED')) });

    const result = await service.getAchievements(USER);

    // 2 of 5 books = 40%
    expect(find(result, 'five_books').progressPercent).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// Unlock persistence
// ---------------------------------------------------------------------------
describe('AchievementService unlock persistence', () => {
  it('persists newly-satisfied achievements with skipDuplicates', async () => {
    setupMetrics({ entries: [entry('READING')] });

    await service.getAchievements(USER);

    expect(prisma.userAchievement.createMany).toHaveBeenCalledWith({
      data: [{ userId: USER, achievementKey: 'first_book' }],
      skipDuplicates: true,
    });
  });

  it('records a feed event per new unlock with the exact metadata keys', async () => {
    setupMetrics({ entries: [entry('READING')] });

    await service.getAchievements(USER);

    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER,
        type: 'UNLOCKED_ACHIEVEMENT',
        metadata: {
          actorUsername: 'ayush',
          achievementKey: 'first_book',
          achievementTitle: 'First Volume Opened',
        },
      }),
    });
  });

  it('does not re-persist or re-announce an already-stored unlock', async () => {
    const unlockedAt = new Date('2026-01-01T00:00:00Z');
    setupMetrics({
      entries: [entry('READING')],
      unlocked: [{ achievementKey: 'first_book', unlockedAt }],
    });

    const result = await service.getAchievements(USER);

    expect(prisma.userAchievement.createMany).not.toHaveBeenCalled();
    expect(prisma.activity.create).not.toHaveBeenCalled();
    // The stored timestamp wins over "now".
    expect(find(result, 'first_book').unlockedAt).toBe(unlockedAt.toISOString());
  });

  it('still returns achievements when persistence fails', async () => {
    setupMetrics({ entries: [entry('READING')] });
    (prisma.userAchievement.createMany as any).mockRejectedValue(new Error('db down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await service.getAchievements(USER);

    expect(find(result, 'first_book').unlocked).toBe(true);
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it('falls back to "Someone" when the unlocking user has no profile', async () => {
    setupMetrics({ entries: [entry('READING')] });
    (prisma.profile.findUnique as any).mockResolvedValue(null);

    await service.getAchievements(USER);

    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({ actorUsername: 'Someone' }),
      }),
    });
  });
});
