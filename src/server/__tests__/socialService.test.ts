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
    profile: {
      findUnique: vi.fn(),
    },
    follow: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
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

  it('scopes "global" to everyone', async () => {
    (prisma.activity.findMany as any).mockResolvedValue([]);

    await service.getFeed(ME, { scope: 'global', limit: 10 } as any);

    expect(prisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it('scopes "following" to followed users plus the user themselves', async () => {
    (prisma.follow.findMany as any).mockResolvedValue([
      { followingId: 'a' },
      { followingId: 'b' },
    ]);
    (prisma.activity.findMany as any).mockResolvedValue([]);

    await service.getFeed(ME, { scope: 'following', limit: 10 } as any);

    expect(prisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: { in: ['a', 'b', ME] } } })
    );
  });

  it('over-fetches by one and returns a nextCursor when more pages exist', async () => {
    // limit 2 -> service asks for 3; returning 3 means "there is more"
    (prisma.activity.findMany as any).mockResolvedValue([
      fakeActivity({ id: 'act-1' }),
      fakeActivity({ id: 'act-2' }),
      fakeActivity({ id: 'act-3' }),
    ]);

    const result = await service.getFeed(ME, { scope: 'global', limit: 2 } as any);

    expect(prisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 })
    );
    expect(result.activities).toHaveLength(2);
    // Cursor is the last item of the trimmed page, not the over-fetched row.
    expect(result.nextCursor).toBe('act-2');
  });

  it('returns a null nextCursor on the last page', async () => {
    (prisma.activity.findMany as any).mockResolvedValue([fakeActivity({ id: 'act-1' })]);

    const result = await service.getFeed(ME, { scope: 'global', limit: 2 } as any);

    expect(result.activities).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });

  it('skips the cursor row itself when paginating', async () => {
    (prisma.activity.findMany as any).mockResolvedValue([]);

    await service.getFeed(ME, { scope: 'global', limit: 5, cursor: 'act-9' } as any);

    expect(prisma.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: 'act-9' }, skip: 1 })
    );
  });

  it('shapes activities with actor fallbacks and an ISO timestamp', async () => {
    (prisma.activity.findMany as any).mockResolvedValue([
      fakeActivity({ user: { profile: null }, book: null }),
    ]);

    const result = await service.getFeed(ME, { scope: 'global', limit: 5 } as any);

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

    const result = await service.getFeed(ME, { scope: 'global', limit: 5 } as any);

    expect(result.activities[0].book).toEqual({
      id: 'b1',
      title: 'Dune',
      authors: ['Herbert'],
      coverImage: 'c.png',
    });
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
