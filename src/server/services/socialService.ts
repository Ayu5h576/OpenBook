import { prisma } from '../config/prisma';
import type { ActivityType, Prisma } from '@prisma/client';
import { NotFoundError, ConflictError, ValidationError, mapPrismaError } from '../utils/errors';
import type { FeedQueryInput } from '../validators/social';

/**
 * Records an activity feed event. Called from social actions and from reading
 * milestones (finishing a book, writing a review). The metadata payload is
 * denormalized on purpose so the feed renders without extra joins and survives
 * deletion of the referenced entity.
 *
 * Best-effort: a feed write must never break the primary action, so failures
 * are logged and swallowed rather than propagated.
 */
export async function recordActivity(
  userId: string,
  type: ActivityType,
  options: { bookId?: string | null; metadata?: Prisma.JsonObject } = {}
): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        userId,
        type,
        bookId: options.bookId ?? null,
        metadata: options.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error('[Social] Failed to record activity:', error);
  }
}

export class SocialService {
  // ─── Follow graph ─────────────────────────────────────────────────────────────

  async follow(followerId: string, targetUserId: string) {
    if (followerId === targetUserId) {
      throw new ValidationError('You cannot follow yourself');
    }

    const target = await prisma.profile.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true },
    });
    if (!target) throw new NotFoundError('User');

    try {
      await prisma.follow.create({
        data: { followerId, followingId: targetUserId },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictError('You already follow this user');
      }
      throw mapPrismaError(error);
    }

    const me = await prisma.profile.findUnique({
      where: { id: followerId },
      select: { username: true },
    });

    await recordActivity(followerId, 'FOLLOWED_USER', {
      metadata: {
        actorUsername: me?.username ?? 'Someone',
        targetUserId,
        targetUsername: target.username,
      },
    });

    return { following: true };
  }

  async unfollow(followerId: string, targetUserId: string) {
    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId: targetUserId } },
    });
    if (!existing) throw new NotFoundError('Follow relationship');

    await prisma.follow.delete({ where: { id: existing.id } });
    return { following: false };
  }

  async getFollowers(userId: string) {
    const rows = await prisma.follow.findMany({
      where: { followingId: userId },
      include: { follower: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.formatUserSummary(r.follower.id, r.follower.profile));
  }

  async getFollowing(userId: string) {
    const rows = await prisma.follow.findMany({
      where: { followerId: userId },
      include: { following: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.formatUserSummary(r.following.id, r.following.profile));
  }

  async getSocialStats(userId: string) {
    const [followers, following] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);
    return { followers, following };
  }

  // ─── Activity feed ────────────────────────────────────────────────────────────

  /**
   * Cursor-paginated feed. `following` shows the people the user follows (plus
   * their own actions), `me` is the user's own activity, `global` is everyone's.
   */
  async getFeed(userId: string, query: FeedQueryInput) {
    const { scope, limit, cursor } = query;

    let where: Prisma.ActivityWhereInput;
    if (scope === 'me') {
      where = { userId };
    } else if (scope === 'global') {
      where = {};
    } else {
      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const authorIds = [...following.map((f) => f.followingId), userId];
      where = { userId: { in: authorIds } };
    }

    // Over-fetch by one to detect whether another page exists.
    const rows = await prisma.activity.findMany({
      where,
      include: {
        user: { include: { profile: { select: { username: true, avatar: true } } } },
        book: { select: { id: true, title: true, authors: true, coverImage: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      activities: page.map((a) => ({
        id: a.id,
        type: a.type,
        actor: {
          id: a.userId,
          username: a.user.profile?.username ?? 'Reader',
          avatar: a.user.profile?.avatar ?? null,
        },
        book: a.book
          ? {
              id: a.book.id,
              title: a.book.title,
              authors: a.book.authors,
              coverImage: a.book.coverImage,
            }
          : null,
        metadata: (a.metadata as Prisma.JsonObject) ?? {},
        createdAt: a.createdAt.toISOString(),
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  private formatUserSummary(
    id: string,
    profile: { username: string; avatar: string | null; bio: string | null } | null
  ) {
    return {
      id,
      username: profile?.username ?? 'Reader',
      avatar: profile?.avatar ?? null,
      bio: profile?.bio ?? null,
    };
  }
}

export const socialService = new SocialService();
