import { prisma } from '../config/prisma';
import { recordActivity } from './socialService';

export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
  icon: string; // lucide-react icon name the frontend maps to a component
  category: 'reading' | 'consistency' | 'social' | 'collection';
  threshold: number;
  unit: string;
}

/**
 * The achievement catalog. Definitions live in code so they can be edited
 * without a migration; only a user's unlocks are persisted. `metric` keys are
 * resolved against the computed metric bag in {@link AchievementService.computeMetrics}.
 */
const CATALOG: (AchievementDefinition & { metric: string })[] = [
  { key: 'first_book', title: 'First Volume Opened', description: 'Add your very first book to your library', icon: 'BookOpen', category: 'reading', metric: 'booksInLibrary', threshold: 1, unit: 'book' },
  { key: 'five_books', title: 'Budding Bibliophile', description: 'Finish 5 books', icon: 'BookMarked', category: 'reading', metric: 'booksCompleted', threshold: 5, unit: 'books' },
  { key: 'twenty_books', title: 'Seasoned Reader', description: 'Finish 20 books', icon: 'Library', category: 'reading', metric: 'booksCompleted', threshold: 20, unit: 'books' },
  { key: 'thousand_pages', title: '1,000 Pages Turned', description: 'Read a total of 1,000 pages', icon: 'Star', category: 'reading', metric: 'totalPagesRead', threshold: 1000, unit: 'pages' },
  { key: 'five_thousand_pages', title: '5,000 Pages Milestone', description: 'Read a total of 5,000 pages', icon: 'ShieldCheck', category: 'reading', metric: 'totalPagesRead', threshold: 5000, unit: 'pages' },
  { key: 'streak_7', title: '7-Day Reading Streak', description: 'Read on 7 consecutive days', icon: 'Flame', category: 'consistency', metric: 'readingStreak', threshold: 7, unit: 'days' },
  { key: 'streak_30', title: 'Month of Devotion', description: 'Read on 30 consecutive days', icon: 'CalendarDays', category: 'consistency', metric: 'readingStreak', threshold: 30, unit: 'days' },
  { key: 'ten_hours', title: 'Ten Hours Immersed', description: 'Accumulate 10 hours of reading time', icon: 'Clock', category: 'consistency', metric: 'totalHours', threshold: 10, unit: 'hours' },
  { key: 'genre_explorer', title: 'Genre Explorer', description: 'Read books across 5 different genres', icon: 'Compass', category: 'collection', metric: 'distinctGenres', threshold: 5, unit: 'genres' },
  { key: 'first_review', title: 'The Critic Emerges', description: 'Write your first book review', icon: 'PenLine', category: 'social', metric: 'reviewsWritten', threshold: 1, unit: 'review' },
  { key: 'five_reviews', title: 'Voice of the Community', description: 'Write 5 book reviews', icon: 'MessageSquare', category: 'social', metric: 'reviewsWritten', threshold: 5, unit: 'reviews' },
  { key: 'first_follow', title: 'Making Connections', description: 'Follow another reader', icon: 'UserPlus', category: 'social', metric: 'followingCount', threshold: 1, unit: 'reader' },
  { key: 'club_member', title: 'Joining the Circle', description: 'Join a book club', icon: 'Users', category: 'social', metric: 'clubsJoined', threshold: 1, unit: 'club' },
];

export class AchievementService {
  /**
   * Computes the raw metric bag from the user's real reading and social data.
   * Kept intentionally close to analyticsService's definitions so numbers agree
   * across the two surfaces.
   */
  private async computeMetrics(userId: string): Promise<Record<string, number>> {
    const [entries, sessions, reviewsWritten, followingCount, clubsJoined] = await Promise.all([
      prisma.libraryEntry.findMany({
        where: { userId },
        include: { book: { select: { categories: true } } },
      }),
      prisma.readingSession.findMany({
        where: { entry: { userId } },
        select: { startPage: true, endPage: true, durationSecs: true, startedAt: true },
      }),
      prisma.review.count({ where: { userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.bookClubMember.count({ where: { userId } }),
    ]);

    const booksCompleted = entries.filter((e) => e.status === 'COMPLETED').length;
    const totalPagesRead = sessions.reduce((sum, s) => sum + Math.max(0, s.endPage - s.startPage), 0);
    const totalHours = Math.floor(sessions.reduce((sum, s) => sum + s.durationSecs, 0) / 3600);

    const genres = new Set<string>();
    entries.forEach((e) => (e.book.categories ?? []).forEach((g) => genres.add(g)));

    const sessionDays = new Set(sessions.map((s) => new Date(s.startedAt).toISOString().split('T')[0]));
    let readingStreak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (sessionDays.has(key)) {
        readingStreak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      booksInLibrary: entries.length,
      booksCompleted,
      totalPagesRead,
      totalHours,
      distinctGenres: genres.size,
      readingStreak,
      reviewsWritten,
      followingCount,
      clubsJoined,
    };
  }

  /**
   * Returns every achievement with the user's live progress, unlock state, and
   * unlock date. Newly-satisfied achievements are persisted (and pushed to the
   * activity feed) on read so the unlock timestamp is captured the first time
   * the user views the page after earning it.
   */
  async getAchievements(userId: string) {
    const [metrics, unlockedRows] = await Promise.all([
      this.computeMetrics(userId),
      prisma.userAchievement.findMany({ where: { userId } }),
    ]);

    const unlockedMap = new Map(unlockedRows.map((r) => [r.achievementKey, r.unlockedAt]));

    const newlyUnlocked: string[] = [];
    const achievements = CATALOG.map((def) => {
      const current = metrics[def.metric] ?? 0;
      const satisfied = current >= def.threshold;
      const alreadyStored = unlockedMap.has(def.key);

      if (satisfied && !alreadyStored) newlyUnlocked.push(def.key);

      const unlockedAt = unlockedMap.get(def.key) ?? (satisfied ? new Date() : null);

      return {
        key: def.key,
        title: def.title,
        description: def.description,
        icon: def.icon,
        category: def.category,
        unit: def.unit,
        threshold: def.threshold,
        progress: Math.min(current, def.threshold),
        progressPercent: Math.min(100, Math.round((current / def.threshold) * 100)),
        unlocked: satisfied,
        unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
      };
    });

    // Persist first-time unlocks (best-effort; skipDuplicates guards races).
    if (newlyUnlocked.length > 0) {
      await this.persistUnlocks(userId, newlyUnlocked);
    }

    const unlockedCount = achievements.filter((a) => a.unlocked).length;
    return {
      achievements,
      summary: { unlocked: unlockedCount, total: CATALOG.length },
    };
  }

  private async persistUnlocks(userId: string, keys: string[]) {
    try {
      await prisma.userAchievement.createMany({
        data: keys.map((achievementKey) => ({ userId, achievementKey })),
        skipDuplicates: true,
      });

      const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { username: true } });
      for (const key of keys) {
        const def = CATALOG.find((d) => d.key === key);
        if (!def) continue;
        await recordActivity(userId, 'UNLOCKED_ACHIEVEMENT', {
          metadata: {
            actorUsername: profile?.username ?? 'Someone',
            achievementKey: key,
            achievementTitle: def.title,
          },
        });
      }
    } catch (error) {
      console.error('[Achievements] Failed to persist unlocks:', error);
    }
  }
}

export const achievementService = new AchievementService();
