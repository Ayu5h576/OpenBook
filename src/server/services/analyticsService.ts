import { prisma } from '../config/prisma';
import { cacheService } from '../cache/cacheService';
import type { UpsertGoalInput } from '../validators/books';

/**
 * getStats is the heaviest read in the app — it loads every library entry with
 * nested sessions plus every reading session, then buckets 12 months in JS.
 * It is cached per user with a short TTL and invalidated explicitly whenever
 * something it derives from changes (see invalidateUserStats callers).
 */
const STATS_TTL_MS = 5 * 60 * 1000;

export const statsCacheKey = (userId: string) => `analytics:stats:${userId}`;

/** Drop a user's cached stats. Best-effort: never throws into the caller. */
export async function invalidateUserStats(userId: string): Promise<void> {
  try {
    await cacheService.del(statsCacheKey(userId));
  } catch (err) {
    console.error('[Analytics] Failed to invalidate stats cache:', err);
  }
}

export class AnalyticsService {
  async getStats(userId: string) {
    return cacheService.getOrSet(statsCacheKey(userId), STATS_TTL_MS, () =>
      this.computeStats(userId)
    );
  }

  private async computeStats(userId: string) {
    const [entries, sessions, goal] = await Promise.all([
      prisma.libraryEntry.findMany({
        where: { userId },
        include: { book: { select: { pageCount: true, categories: true } }, readingSessions: true },
      }),
      prisma.readingSession.findMany({
        where: { entry: { userId } },
        orderBy: { startedAt: 'asc' },
      }),
      prisma.readingGoal.findFirst({
        where: { userId, year: new Date().getFullYear() },
      }),
    ]);

    const completed = entries.filter((e) => e.status === 'COMPLETED');
    const reading = entries.filter((e) => e.status === 'READING');

    const totalPagesRead = sessions.reduce((sum, s) => sum + (s.endPage - s.startPage), 0);
    const totalSecs = sessions.reduce((sum, s) => sum + s.durationSecs, 0);
    const totalHours = Math.round(totalSecs / 3600);

    // Genre distribution
    const genreMap: Record<string, number> = {};
    entries.forEach((e) => {
      (e.book.categories ?? []).forEach((g) => {
        genreMap[g] = (genreMap[g] ?? 0) + 1;
      });
    });
    const genreDistribution = Object.entries(genreMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    // Monthly progress (last 12 months)
    const now = new Date();
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.toLocaleString('en', { month: 'short' });
      const year = d.getFullYear();
      const monthSessions = sessions.filter((s) => {
        const sd = new Date(s.startedAt);
        return sd.getMonth() === d.getMonth() && sd.getFullYear() === year;
      });
      const pages = monthSessions.reduce((sum, s) => sum + (s.endPage - s.startPage), 0);
      const hours = Math.round(monthSessions.reduce((sum, s) => sum + s.durationSecs, 0) / 3600);
      const books = completed.filter((e) => {
        if (!e.finishedAt) return false;
        const fd = new Date(e.finishedAt);
        return fd.getMonth() === d.getMonth() && fd.getFullYear() === year;
      }).length;
      return { month: `${month} ${year}`, pages, hours, books };
    }).reverse();

    // Reading streak (consecutive days with at least one session)
    const sessionDays = new Set(
      sessions.map((s) => new Date(s.startedAt).toISOString().split('T')[0])
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (sessionDays.has(key)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // Reading calendar heatmap (last 365 days)
    const calendarMap: Record<string, number> = {};
    sessions.forEach((s) => {
      const day = new Date(s.startedAt).toISOString().split('T')[0];
      calendarMap[day] = (calendarMap[day] ?? 0) + Math.round(s.durationSecs / 60);
    });

    // Fastest / longest / shortest
    const completedWithPages = completed
      .filter((e) => e.book.pageCount && e.startedAt && e.finishedAt)
      .map((e) => ({
        title: '',
        bookId: e.bookId,
        pageCount: e.book.pageCount!,
        days: Math.ceil(
          (new Date(e.finishedAt!).getTime() - new Date(e.startedAt!).getTime()) / 86400000
        ),
      }));

    const longestBook = entries.reduce<{ bookId: string; pageCount: number } | null>((max, e) => {
      if (!e.book.pageCount) return max;
      return !max || e.book.pageCount > max.pageCount ? { bookId: e.bookId, pageCount: e.book.pageCount } : max;
    }, null);

    const shortestBook = completed.reduce<{ bookId: string; pageCount: number } | null>((min, e) => {
      if (!e.book.pageCount) return min;
      return !min || e.book.pageCount < min.pageCount ? { bookId: e.bookId, pageCount: e.book.pageCount } : min;
    }, null);

    const fastestRead = completedWithPages.reduce<(typeof completedWithPages)[0] | null>((best, e) => {
      return !best || (e.days > 0 && e.days < best.days) ? e : best;
    }, null);

    return {
      overview: {
        booksInLibrary: entries.length,
        booksCompleted: completed.length,
        booksReading: reading.length,
        totalPagesRead,
        totalHours,
        readingStreak: streak,
        yearlyGoal: goal?.targetBooks ?? null,
        yearlyCompleted: completed.filter((e) => {
          if (!e.finishedAt) return false;
          return new Date(e.finishedAt).getFullYear() === new Date().getFullYear();
        }).length,
      },
      genreDistribution,
      monthly,
      calendar: Object.entries(calendarMap).map(([date, minutes]) => ({ date, minutes })),
      records: {
        longestBookId: longestBook?.bookId ?? null,
        shortestBookId: shortestBook?.bookId ?? null,
        fastestReadBookId: fastestRead?.bookId ?? null,
        fastestReadDays: fastestRead?.days ?? null,
      },
    };
  }

  async upsertGoal(userId: string, input: UpsertGoalInput) {
    const goal = await prisma.readingGoal.upsert({
      where: { userId_year: { userId, year: input.year } },
      create: { userId, ...input } as any,
      update: { targetBooks: input.targetBooks, targetPages: input.targetPages },
    });
    // The goal feeds overview.yearlyGoal, so cached stats are now stale.
    await invalidateUserStats(userId);
    return goal;
  }

  async getGoal(userId: string, year: number) {
    return prisma.readingGoal.findUnique({ where: { userId_year: { userId, year } } });
  }
}

export const analyticsService = new AnalyticsService();
