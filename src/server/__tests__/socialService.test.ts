/**
 * SocialService — unit tests
 *
 * Prisma is mocked. Follow-graph guards, activity metadata shape, and the
 * cursor-paginated feed are exercised without a real database.
 *
 * Note: recordActivity lives in the same module as SocialService and is called
 * as a module-local function, so it cannot be intercepted with vi.mock. It runs
 * for real against the mocked prisma.activity.create — which is useful here,
 * because the exact metadata keys are what the frontend feed reads.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SocialService, recordActivity } from '../services/socialService';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

vi.mock('../config/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    follow: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    bookClubMember: {
      findMany: vi.fn(),
    },
    activity: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '../config/prisma';

const service = new SocialService();

const ME = 'user-me';
const THEM = 'user-them';

function fakeActivity(overrides: Record<string, any> = {}) {
  return {
    id: 'act-1',
    userId: ME,
    type: 'FINISHED_BOOK',
    metadata: { bookTitle: 'Dune' },
    createdAt: new Date('2026-08-01T10:00:00Z'),
    user: { profile: { username: 'ayush', avatar: null } },
    book: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.activity.create as any).mockResolvedValue({});
  // The circle scope always queries the follow graph and club memberships;
  // default both to empty so tests only mock what they care about.
  (prisma.follow.findMany as any).mockResolvedValue([]);
  (prisma.bookClubMember.findMany as any).mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// Follow / unfollow
// ---------------------------------------------------------------------------
describe('SocialService.follow', () => {
  it('rejects following yourself', async () => {
    await expect(service.follow(ME, ME)).rejects.toThrow(ValidationError);
    expect(prisma.follow.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the target user does not exist', async () => {
    (prisma.profile.findUnique as any).mockResolvedValue(null);

    await expect(service.follow(ME, THEM)).rejects.toThrow(NotFoundError);
    expect(prisma.follow.create).not.toHaveBeenCalled();
  });

  it('throws ConflictError when already following (unique constraint P2002)', async () => {
    (prisma.profile.findUnique as any).mockResolvedValue({ id: THEM, username: 'them' });
    (prisma.follow.create as any).mockRejectedValue({ code: 'P2002' });

    await expect(service.follow(ME, THEM)).rejects.toThrow(ConflictError);
  });

  it('creates the follow and records a feed event with the exact metadata keys', async () => {
    (prisma.profile.findUnique as any)
      .mockResolvedValueOnce({ id: THEM, username: 'them' }) // target lookup
      .mockResolvedValueOnce({ username: 'me' }); // actor lookup
    (prisma.follow.create as any).mockResolvedValue({ id: 'follow-1' });

    const result = await service.follow(ME, THEM);

    expect(result).toEqual({ following: true });
    expect(prisma.follow.create).toHaveBeenCalledWith({
      data: { followerId: ME, followingId: THEM },
    });

    // The feed UI reads actorUsername / targetUsername / targetUserId by name.
    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: ME,
        type: 'FOLLOWED_USER',
        metadata: {
          actorUsername: 'me',
          targetUserId: THEM,
          targetUsername: 'them',
        },
      }),
    });
  });

  it('falls back to "Someone" when the actor has no profile', async () => {
    (prisma.profile.findUnique as any)
      .mockResolvedValueOnce({ id: THEM, username: 'them' })
      .mockResolvedValueOnce(null);
    (prisma.follow.create as any).mockResolvedValue({ id: 'follow-1' });

    await service.follow(ME, THEM);

    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        metadata: expect.objectContaining({ actorUsername: 'Someone' }),
      }),
    });
  });
});

describe('SocialService.unfollow', () => {
  it('throws NotFoundError when no follow relationship exists', async () => {
    (prisma.follow.findUnique as any).mockResolvedValue(null);

    await expect(service.unfollow(ME, THEM)).rejects.toThrow(NotFoundError);
    expect(prisma.follow.delete).not.toHaveBeenCalled();
  });

  it('deletes the relationship and reports following: false', async () => {
    (prisma.follow.findUnique as any).mockResolvedValue({ id: 'follow-1' });

    const result = await service.unfollow(ME, THEM);

    expect(prisma.follow.delete).toHaveBeenCalledWith({ where: { id: 'follow-1' } });
    expect(result).toEqual({ following: false });
  });
});

// ---------------------------------------------------------------------------
// Follower lists / stats
// ---------------------------------------------------------------------------
describe('SocialService follower lists', () => {
  it('maps followers to user summaries', async () => {
    (prisma.follow.findMany as any).mockResolvedValue([
      {
        follower: {
          id: 'u1',
          profile: { username: 'reader1', avatar: 'a.png', bio: 'hi' },
        },
      },
    ]);

    const result = await service.getFollowers(ME);

    expect(result).toEqual([{ id: 'u1', username: 'reader1', avatar: 'a.png', bio: 'hi' }]);
  });

  it('falls back to "Reader" when a follower has no profile row', async () => {
    (prisma.follow.findMany as any).mockResolvedValue([
      { follower: { id: 'u1', profile: null } },
    ]);

    const result = await service.getFollowers(ME);

    expect(result).toEqual([{ id: 'u1', username: 'Reader', avatar: null, bio: null }]);
  });

  it('counts followers and following independently', async () => {
    (prisma.follow.count as any).mockResolvedValueOnce(7).mockResolvedValueOnce(3);

    const stats = await service.getSocialStats(ME);

    expect(stats).toEqual({ followers: 7, following: 3 });
  });
});

// ---------------------------------------------------------------------------
// Feed scopes + pagination
// ---------------------------------------------------------------------------
describe('SocialService.getFeed', () => {
  it('scopes "me" to the user\'s own activity', async () => {
    (prisma.activity.findMany as any).mockResolvedValue([]);

    await service.getFeed(ME, { scope: 'me', limit: 10 } as any);

    expect(prisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: ME } })
    );
  });

  it('never queries beyond the caller\'s circle — there is no "everyone" scope', async () => {
    (prisma.follow.findMany as any).mockResolvedValue([]);
    (prisma.activity.findMany as any).mockResolvedValue([]);

    await service.getFeed(ME, { scope: 'circle', limit: 10 } as any);

    // With no follows and no clubs the circle is the user alone — crucially
    // NOT an unfiltered `where: {}`, which would leak everyone's activity.
    expect(prisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: { in: [ME] } } })
    );
  });

  it('unions followed users, club co-members, and the caller', async () => {
    (prisma.follow.findMany as any).mockResolvedValue([
      { followingId: 'followed-a' },
      { followingId: 'followed-b' },
    ]);
    (prisma.bookClubMember.findMany as any)
      .mockResolvedValueOnce([{ clubId: 'club-1' }]) // the caller's clubs
      .mockResolvedValueOnce([{ userId: 'peer-c' }, { userId: ME }]); // members of those clubs
    (prisma.activity.findMany as any).mockResolvedValue([]);

    await service.getFeed(ME, { scope: 'circle', limit: 10 } as any);

    const where = (prisma.activity.findMany as any).mock.calls[0][0].where;
    expect(where.userId.in).toEqual(expect.arrayContaining(['followed-a', 'followed-b', 'peer-c', ME]));
    // The caller appears exactly once despite being a member of their own club.
    expect(where.userId.in.filter((id: string) => id === ME)).toHaveLength(1);
  });

  it('skips the club-member lookup entirely when the user has no clubs', async () => {
    (prisma.bookClubMember.findMany as any).mockResolvedValue([]);
    (prisma.activity.findMany as any).mockResolvedValue([]);

    await service.getFeed(ME, { scope: 'circle', limit: 10 } as any);

    // Only the "which clubs am I in" query — no follow-up peer query.
    expect(prisma.bookClubMember.findMany).toHaveBeenCalledTimes(1);
  });

  it('labels a followed actor with their username and a club peer generically', async () => {
    (prisma.follow.findMany as any).mockResolvedValue([{ followingId: 'followed-a' }]);
    (prisma.bookClubMember.findMany as any)
      .mockResolvedValueOnce([{ clubId: 'club-1' }])
      .mockResolvedValueOnce([{ userId: 'peer-c' }]);
    (prisma.activity.findMany as any).mockResolvedValue([
      fakeActivity({ id: 'a1', userId: 'followed-a', user: { profile: { username: 'priya', avatar: null } } }),
      fakeActivity({ id: 'a2', userId: 'peer-c', user: { profile: { username: 'arjun', avatar: null } } }),
      fakeActivity({ id: 'a3', userId: ME, user: { profile: { username: 'ayush', avatar: null } } }),
    ]);

    const result = await service.getFeed(ME, { scope: 'circle', limit: 10 } as any);

    expect(result.activities.map((a) => a.reason)).toEqual([
      'You follow priya',
      'Fellow club member',
      null, // your own activity needs no explanation
    ]);
  });

  it('prefers the follow label when an actor is both followed and a club peer', async () => {
    (prisma.follow.findMany as any).mockResolvedValue([{ followingId: 'both' }]);
    (prisma.bookClubMember.findMany as any)
      .mockResolvedValueOnce([{ clubId: 'club-1' }])
      .mockResolvedValueOnce([{ userId: 'both' }]);
    (prisma.activity.findMany as any).mockResolvedValue([
      fakeActivity({ userId: 'both', user: { profile: { username: 'meera', avatar: null } } }),
    ]);

    const result = await service.getFeed(ME, { scope: 'circle', limit: 10 } as any);

    expect(result.activities[0].reason).toBe('You follow meera');
  });

  it('omits reasons entirely in the "me" scope', async () => {
    (prisma.activity.findMany as any).mockResolvedValue([fakeActivity()]);

    const result = await service.getFeed(ME, { scope: 'me', limit: 10 } as any);

    expect(result.activities[0].reason).toBeNull();
  });

  it('over-fetches by one and returns a nextCursor when more pages exist', async () => {
    // limit 2 -> service asks for 3; returning 3 means "there is more"
    (prisma.activity.findMany as any).mockResolvedValue([
      fakeActivity({ id: 'act-1' }),
      fakeActivity({ id: 'act-2' }),
      fakeActivity({ id: 'act-3' }),
    ]);

    const result = await service.getFeed(ME, { scope: 'me', limit: 2 } as any);

    expect(prisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
    expect(result.activities).toHaveLength(2);
    // Cursor is the last item of the trimmed page, not the over-fetched row.
    expect(result.nextCursor).toBe('act-2');
  });

  it('returns a null nextCursor on the last page', async () => {
    (prisma.activity.findMany as any).mockResolvedValue([fakeActivity({ id: 'act-1' })]);

    const result = await service.getFeed(ME, { scope: 'me', limit: 2 } as any);

    expect(result.activities).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });

  it('skips the cursor row itself when paginating', async () => {
    (prisma.activity.findMany as any).mockResolvedValue([]);

    await service.getFeed(ME, { scope: 'me', limit: 5, cursor: 'act-9' } as any);

    expect(prisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: 'act-9' }, skip: 1 })
    );
  });

  it('shapes activities with actor fallbacks and an ISO timestamp', async () => {
    (prisma.activity.findMany as any).mockResolvedValue([
      fakeActivity({ user: { profile: null }, book: null }),
    ]);

    const result = await service.getFeed(ME, { scope: 'me', limit: 5 } as any);

    expect(result.activities[0]).toMatchObject({
      actor: { id: ME, username: 'Reader', avatar: null },
      book: null,
      createdAt: '2026-08-01T10:00:00.000Z',
    });
  });

  it('includes book details when the activity references one', async () => {
    (prisma.activity.findMany as any).mockResolvedValue([
      fakeActivity({
        book: { id: 'b1', title: 'Dune', authors: ['Herbert'], coverImage: 'c.png' },
      }),
    ]);

    const result = await service.getFeed(ME, { scope: 'me', limit: 5 } as any);

    expect(result.activities[0].book).toEqual({
      id: 'b1',
      title: 'Dune',
      authors: ['Herbert'],
      coverImage: 'c.png',
    });
  });
});

// ---------------------------------------------------------------------------
// Reader discovery
// ---------------------------------------------------------------------------
describe('SocialService.searchUsers', () => {
  it('searches case-insensitively and excludes the caller', async () => {
    (prisma.profile.findMany as any).mockResolvedValue([]);

    await service.searchUsers(ME, { q: 'pri', limit: 20 } as any);

    expect(prisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          username: { contains: 'pri', mode: 'insensitive' },
          id: { not: ME },
        },
        take: 20,
      })
    );
  });

  it('annotates each hit with whether the caller already follows them', async () => {
    (prisma.profile.findMany as any).mockResolvedValue([
      { id: 'u1', username: 'priya', avatar: null, bio: 'sci-fi' },
      { id: 'u2', username: 'prakash', avatar: null, bio: null },
    ]);
    (prisma.follow.findMany as any).mockResolvedValue([{ followingId: 'u1' }]);

    const result = await service.searchUsers(ME, { q: 'pr', limit: 20 } as any);

    expect(result).toEqual([
      { id: 'u1', username: 'priya', avatar: null, bio: 'sci-fi', isFollowing: true, reason: null },
      { id: 'u2', username: 'prakash', avatar: null, bio: null, isFollowing: false, reason: null },
    ]);
  });

  it('skips the follow-state query when nothing matched', async () => {
    (prisma.profile.findMany as any).mockResolvedValue([]);

    const result = await service.searchUsers(ME, { q: 'zzz', limit: 20 } as any);

    expect(result).toEqual([]);
    expect(prisma.follow.findMany).not.toHaveBeenCalled();
  });
});

describe('SocialService.getSuggestedReaders', () => {
  it('suggests club co-members with the club name as the reason', async () => {
    (prisma.follow.findMany as any).mockResolvedValue([]);
    (prisma.bookClubMember.findMany as any)
      .mockResolvedValueOnce([{ clubId: 'club-1' }])
      .mockResolvedValueOnce([{ userId: 'peer-1', club: { name: 'Sci-Fi Club' } }]);
    (prisma.user.findMany as any).mockResolvedValue([]);
    (prisma.profile.findMany as any).mockResolvedValue([
      { id: 'peer-1', username: 'arjun', avatar: null, bio: null },
    ]);

    const result = await service.getSuggestedReaders(ME, 8);

    expect(result).toEqual([
      {
        id: 'peer-1',
        username: 'arjun',
        avatar: null,
        bio: null,
        isFollowing: false,
        reason: 'In Sci-Fi Club with you',
      },
    ]);
  });

  it('falls back to second-degree follows, crediting the mutual reader', async () => {
    (prisma.follow.findMany as any)
      .mockResolvedValueOnce([{ followingId: 'friend' }]) // who the caller follows
      .mockResolvedValueOnce([
        { followingId: 'fof', follower: { profile: { username: 'priya' } } },
      ]);
    (prisma.bookClubMember.findMany as any).mockResolvedValue([]);
    (prisma.user.findMany as any).mockResolvedValue([]);
    (prisma.profile.findMany as any).mockResolvedValue([
      { id: 'fof', username: 'dev', avatar: null, bio: null },
    ]);

    const result = await service.getSuggestedReaders(ME, 8);

    expect(result[0].reason).toBe('Followed by priya');
  });

  it('never suggests the caller or someone they already follow', async () => {
    (prisma.follow.findMany as any)
      .mockResolvedValueOnce([{ followingId: 'already' }]) // who the caller follows
      .mockResolvedValueOnce([]); // second-degree pass finds nobody new
    (prisma.bookClubMember.findMany as any)
      .mockResolvedValueOnce([{ clubId: 'club-1' }])
      .mockResolvedValueOnce([]);
    (prisma.user.findMany as any).mockResolvedValue([]);
    (prisma.profile.findMany as any).mockResolvedValue([]);

    await service.getSuggestedReaders(ME, 8);

    // Both tiers must filter the same exclusion set at the database level.
    const peerQuery = (prisma.bookClubMember.findMany as any).mock.calls[1][0];
    expect(peerQuery.where.userId.notIn).toEqual(expect.arrayContaining(['already', ME]));
    const secondDegreeQuery = (prisma.follow.findMany as any).mock.calls[1][0];
    expect(secondDegreeQuery.where.followingId.notIn).toEqual(expect.arrayContaining(['already', ME]));
  });

  it('uses the most-followed readers as a cold-start fallback', async () => {
    (prisma.follow.findMany as any).mockResolvedValue([]);
    (prisma.bookClubMember.findMany as any).mockResolvedValue([]);
    (prisma.user.findMany as any).mockResolvedValue([
      { id: 'pop-1', _count: { followers: 12 } },
      { id: 'pop-2', _count: { followers: 0 } },
    ]);
    (prisma.profile.findMany as any).mockResolvedValue([
      { id: 'pop-1', username: 'famous', avatar: null, bio: null },
      { id: 'pop-2', username: 'fresh', avatar: null, bio: null },
    ]);

    const result = await service.getSuggestedReaders(ME, 8);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { followers: { _count: 'desc' } } })
    );
    expect(result.map((u) => u.reason)).toEqual(['12 followers', 'New to OpenBook']);
  });

  it('returns an empty list without querying profiles when nothing surfaced', async () => {
    (prisma.follow.findMany as any).mockResolvedValue([]);
    (prisma.bookClubMember.findMany as any).mockResolvedValue([]);
    (prisma.user.findMany as any).mockResolvedValue([]);

    const result = await service.getSuggestedReaders(ME, 8);

    expect(result).toEqual([]);
    expect(prisma.profile.findMany).not.toHaveBeenCalled();
  });

  it('honours the requested limit across tiers', async () => {
    (prisma.follow.findMany as any).mockResolvedValue([]);
    (prisma.bookClubMember.findMany as any)
      .mockResolvedValueOnce([{ clubId: 'club-1' }])
      .mockResolvedValueOnce([
        { userId: 'p1', club: { name: 'A' } },
        { userId: 'p2', club: { name: 'A' } },
        { userId: 'p3', club: { name: 'A' } },
      ]);
    (prisma.profile.findMany as any).mockResolvedValue([
      { id: 'p1', username: 'one', avatar: null, bio: null },
      { id: 'p2', username: 'two', avatar: null, bio: null },
    ]);

    const result = await service.getSuggestedReaders(ME, 2);

    expect(result).toHaveLength(2);
    // Tier 3 must not run once the limit is already met.
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// recordActivity is best-effort
// ---------------------------------------------------------------------------
describe('recordActivity', () => {
  it('swallows database errors so the primary action still succeeds', async () => {
    (prisma.activity.create as any).mockRejectedValue(new Error('db down'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(recordActivity(ME, 'FINISHED_BOOK' as any)).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it('normalizes a missing bookId to null and missing metadata to undefined', async () => {
    await recordActivity(ME, 'FINISHED_BOOK' as any);

    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: { userId: ME, type: 'FINISHED_BOOK', bookId: null, metadata: undefined },
    });
  });
});
