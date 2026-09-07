import { prisma } from '../config/prisma';
import type { ActivityType, Prisma } from '@prisma/client';
import { NotFoundError, ConflictError, ValidationError, mapPrismaError } from '../utils/errors';
import { notify } from './notificationService';
import type { FeedQueryInput, UserSearchInput } from '../validators/social';

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

    // Tell the person they were followed; broadcast activity alone is easy to miss.
    await notify(targetUserId, 'FOLLOWED_YOU', {
      actorId: followerId,
      metadata: { actorUsername: me?.username ?? 'Someone' },
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
   * Cursor-paginated feed. `me` is the user's own activity; `circle` is the
   * union of the caller, everyone they follow, and their club co-members.
   *
   * Because `circle` merges two different relationships, every row carries a
   * `reason` string explaining why it is there ("You follow priya" / "Fellow
   * club member"). A direct follow outranks a shared club, and the user's own
   * rows carry no reason at all.
   */
  async getFeed(userId: string, query: FeedQueryInput) {
    const { scope, limit, cursor } = query;

    let where: Prisma.ActivityWhereInput;
    const relationByActor = new Map<string, 'following' | 'club'>();

    if (scope === 'me') {
      where = { userId };
    } else {
      const [following, myClubs] = await Promise.all([
        prisma.follow.findMany({
          where: { followerId: userId },
          select: { followingId: true },
        }),
        prisma.bookClubMember.findMany({
          where: { userId },
          select: { clubId: true },
        }),
      ]);

      // Everyone who shares at least one club with the caller.
      const clubPeers = myClubs.length
        ? await prisma.bookClubMember.findMany({
            where: { clubId: { in: myClubs.map((c) => c.clubId) } },
            select: { userId: true },
          })
        : [];

      // Club peers first, so a direct follow overwrites the weaker label.
      for (const peer of clubPeers) relationByActor.set(peer.userId, 'club');
      for (const f of following) relationByActor.set(f.followingId, 'following');
      // The caller is in their own clubs; their rows need no explanation.
      relationByActor.delete(userId);

      const authorIds = [...relationByActor.keys(), userId];
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
      activities: page.map((a) => {
        const username = a.user.profile?.username ?? 'Reader';
        const relation = relationByActor.get(a.userId);
        return {
          id: a.id,
          type: a.type,
          actor: {
            id: a.userId,
            username,
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
          reason:
            relation === 'following'
              ? `You follow ${username}`
              : relation === 'club'
                ? 'Fellow club member'
                : null,
          createdAt: a.createdAt.toISOString(),
        };
      }),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  // ─── Reader discovery ─────────────────────────────────────────────────────────

  /**
   * Username search, case-insensitive substring. Excludes the caller and
   * annotates each hit with whether they already follow them, so the result
   * list can render Follow vs. Following without a second request.
   */
  async searchUsers(viewerId: string, { q, limit }: UserSearchInput) {
    const profiles = await prisma.profile.findMany({
      where: {
        username: { contains: q, mode: 'insensitive' },
        id: { not: viewerId },
      },
      select: { id: true, username: true, avatar: true, bio: true },
      orderBy: { username: 'asc' },
      take: limit,
    });

    return this.annotateFollowState(viewerId, profiles);
  }

  /**
   * "Readers you may like", in descending order of signal strength:
   *   1. club co-members they do not follow yet
   *   2. second-degree follows (followed by someone they follow)
   *   3. the most-followed readers, as a cold-start fallback
   *
   * Each suggestion carries the reason it surfaced, and anyone already
   * followed is excluded at every tier.
   */
  async getSuggestedReaders(viewerId: string, limit: number) {
    const [followingRows, myClubs] = await Promise.all([
      prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }),
      prisma.bookClubMember.findMany({ where: { userId: viewerId }, select: { clubId: true } }),
    ]);

    const followingIds = followingRows.map((f) => f.followingId);
    const excluded = new Set<string>([...followingIds, viewerId]);
    const reasons = new Map<string, string>();

    const consider = (id: string, reason: string) => {
      if (excluded.has(id) || reasons.has(id) || reasons.size >= limit) return;
      reasons.set(id, reason);
    };

    // 1. Club co-members.
    if (myClubs.length) {
      const peers = await prisma.bookClubMember.findMany({
        where: {
          clubId: { in: myClubs.map((c) => c.clubId) },
          userId: { notIn: [...excluded] },
        },
        select: { userId: true, club: { select: { name: true } } },
        take: limit * 4,
      });
      for (const p of peers) consider(p.userId, `In ${p.club.name} with you`);
    }

    // 2. Followed by someone the caller follows.
    if (followingIds.length && reasons.size < limit) {
      const secondDegree = await prisma.follow.findMany({
        where: {
          followerId: { in: followingIds },
          followingId: { notIn: [...excluded] },
        },
        select: {
          followingId: true,
          follower: { select: { profile: { select: { username: true } } } },
        },
        take: limit * 4,
      });
      for (const f of secondDegree) {
        consider(f.followingId, `Followed by ${f.follower?.profile?.username ?? 'a reader you follow'}`);
      }
    }

    // 3. Cold-start fallback: the most-followed readers.
    if (reasons.size < limit) {
      const popular = await prisma.user.findMany({
        where: { id: { notIn: [...excluded, ...reasons.keys()] }, profile: { isNot: null } },
        select: { id: true, _count: { select: { followers: true } } },
        orderBy: { followers: { _count: 'desc' } },
        take: limit - reasons.size,
      });
      for (const u of popular) {
        const count = u._count.followers;
        consider(u.id, count > 0 ? `${count} follower${count === 1 ? '' : 's'}` : 'New to OpenBook');
      }
    }

    if (!reasons.size) return [];

    const profiles = await prisma.profile.findMany({
      where: { id: { in: [...reasons.keys()] } },
      select: { id: true, username: true, avatar: true, bio: true },
    });

    // Preserve the tier ordering built above, which findMany does not honour.
    const order = [...reasons.keys()];
    return profiles
      .map((p) => ({
        id: p.id,
        username: p.username,
        avatar: p.avatar,
        bio: p.bio,
        isFollowing: false,
        reason: reasons.get(p.id) ?? null,
      }))
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  }

  private async annotateFollowState(
    viewerId: string,
    profiles: { id: string; username: string; avatar: string | null; bio: string | null }[]
  ) {
    if (!profiles.length) return [];

    const following = await prisma.follow.findMany({
      where: { followerId: viewerId, followingId: { in: profiles.map((p) => p.id) } },
      select: { followingId: true },
    });
    const followingSet = new Set(following.map((f) => f.followingId));

    return profiles.map((p) => ({
      id: p.id,
      username: p.username,
      avatar: p.avatar,
      bio: p.bio,
      isFollowing: followingSet.has(p.id),
      reason: null as string | null,
    }));
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
