/**
 * BookClubService — unit tests
 *
 * Prisma is mocked. Emphasis is on the authorization surface — private-club
 * visibility and OWNER/MODERATOR/MEMBER role enforcement — since those are the
 * checks that keep one user's club data out of another user's hands.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookClubService } from '../services/bookClubService';
import { AuthorizationError, ConflictError, NotFoundError } from '../utils/errors';

vi.mock('../config/prisma', () => ({
  prisma: {
    bookClub: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    bookClubMember: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    discussion: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    discussionComment: { create: vi.fn() },
    profile: { findUnique: vi.fn() },
    activity: { create: vi.fn() },
  },
}));

import { prisma } from '../config/prisma';

const service = new BookClubService();
const USER = 'user-1';
const CLUB = 'club-1';

function fakeClub(overrides: Record<string, any> = {}) {
  return {
    id: CLUB,
    name: 'Gothic Nights',
    description: 'Atmospheric fiction',
    coverImage: null,
    isPrivate: false,
    ownerId: 'owner-1',
    owner: { profile: { username: 'owner', avatar: null } },
    currentBook: null,
    _count: { members: 3, discussions: 2 },
    createdAt: new Date('2026-08-01T00:00:00Z'),
    ...overrides,
  };
}

function fakeDiscussion(overrides: Record<string, any> = {}) {
  return {
    id: 'disc-1',
    clubId: CLUB,
    userId: USER,
    title: 'Chapter 1',
    body: 'Thoughts?',
    user: { profile: { username: 'ayush', avatar: null } },
    _count: { comments: 0 },
    createdAt: new Date('2026-08-02T00:00:00Z'),
    updatedAt: new Date('2026-08-02T00:00:00Z'),
    ...overrides,
  };
}

/** Set the caller's membership role, or null for "not a member". */
function asRole(role: string | null) {
  (prisma.bookClubMember.findUnique as any).mockResolvedValue(role ? { id: 'm-1', role } : null);
}

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.profile.findUnique as any).mockResolvedValue({ username: 'ayush' });
  (prisma.activity.create as any).mockResolvedValue({});
  (prisma.bookClub.count as any).mockResolvedValue(1);
});

// ---------------------------------------------------------------------------
// Listing / visibility
// ---------------------------------------------------------------------------
describe('BookClubService.listClubs', () => {
  it('limits results to public clubs plus private clubs the user belongs to', async () => {
    (prisma.bookClub.findMany as any).mockResolvedValue([]);
    (prisma.bookClubMember.findMany as any).mockResolvedValue([]);

    await service.listClubs(USER);

    expect(prisma.bookClub.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ isPrivate: false }, { members: { some: { userId: USER } } }] },
      })
    );
  });

  it('annotates each club with the caller role so the UI can pick Join vs Leave', async () => {
    (prisma.bookClub.findMany as any).mockResolvedValue([
      fakeClub({ id: 'c1' }),
      fakeClub({ id: 'c2' }),
    ]);
    (prisma.bookClubMember.findMany as any).mockResolvedValue([
      { clubId: 'c1', role: 'MODERATOR' },
    ]);

    const clubs = await service.listClubs(USER);

    expect(clubs[0]).toMatchObject({ id: 'c1', viewerRole: 'MODERATOR', isMember: true });
    expect(clubs[1]).toMatchObject({ id: 'c2', viewerRole: null, isMember: false });
  });

  it('exposes member and discussion counts', async () => {
    (prisma.bookClub.findMany as any).mockResolvedValue([fakeClub()]);
    (prisma.bookClubMember.findMany as any).mockResolvedValue([]);

    const [club] = await service.listClubs(USER);

    expect(club).toMatchObject({ memberCount: 3, discussionCount: 2 });
  });
});

describe('BookClubService.getClub', () => {
  it('throws NotFoundError for an unknown club', async () => {
    (prisma.bookClub.findUnique as any).mockResolvedValue(null);

    await expect(service.getClub(USER, CLUB)).rejects.toThrow(NotFoundError);
  });

  it('refuses a private club to a non-member', async () => {
    (prisma.bookClub.findUnique as any).mockResolvedValue(
      fakeClub({ isPrivate: true, members: [{ userId: 'someone-else', user: {}, role: 'OWNER', joinedAt: new Date() }] })
    );

    await expect(service.getClub(USER, CLUB)).rejects.toThrow(AuthorizationError);
  });

  it('serves a private club to a member', async () => {
    (prisma.bookClub.findUnique as any).mockResolvedValue(
      fakeClub({
        isPrivate: true,
        members: [
          {
            userId: USER,
            role: 'MEMBER',
            joinedAt: new Date('2026-08-01T00:00:00Z'),
            user: { profile: { username: 'ayush', avatar: null } },
          },
        ],
      })
    );

    const club = await service.getClub(USER, CLUB);

    expect(club.viewerRole).toBe('MEMBER');
    expect(club.members).toEqual([
      {
        id: USER,
        username: 'ayush',
        avatar: null,
        role: 'MEMBER',
        joinedAt: '2026-08-01T00:00:00.000Z',
      },
    ]);
  });

  it('falls back to "Reader" for a member with no profile', async () => {
    (prisma.bookClub.findUnique as any).mockResolvedValue(
      fakeClub({
        members: [{ userId: USER, role: 'MEMBER', joinedAt: new Date(), user: { profile: null } }],
      })
    );

    const club = await service.getClub(USER, CLUB);

    expect(club.members[0].username).toBe('Reader');
  });
});

// ---------------------------------------------------------------------------
// Create / update / delete
// ---------------------------------------------------------------------------
describe('BookClubService.createClub', () => {
  it('creates the owner membership in the same write so a club is never memberless', async () => {
    (prisma.bookClub.create as any).mockResolvedValue(fakeClub());

    const club = await service.createClub(USER, { name: 'Gothic Nights', isPrivate: false } as any);

    expect(prisma.bookClub.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerId: USER,
          members: { create: { userId: USER, role: 'OWNER' } },
        }),
      })
    );
    expect(club.viewerRole).toBe('OWNER');
  });

  it('announces the new club to the feed with clubName metadata', async () => {
    (prisma.bookClub.create as any).mockResolvedValue(fakeClub());

    await service.createClub(USER, { name: 'Gothic Nights', isPrivate: false } as any);

    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'CREATED_CLUB',
        metadata: expect.objectContaining({ clubId: CLUB, clubName: 'Gothic Nights' }),
      }),
    });
  });
});

describe('BookClubService.updateClub', () => {
  it('allows an owner', async () => {
    asRole('OWNER');
    (prisma.bookClub.update as any).mockResolvedValue(fakeClub({ name: 'Renamed' }));

    const club = await service.updateClub(USER, CLUB, { name: 'Renamed' } as any);

    expect(club.name).toBe('Renamed');
  });

  it('allows a moderator', async () => {
    asRole('MODERATOR');
    (prisma.bookClub.update as any).mockResolvedValue(fakeClub());

    await expect(service.updateClub(USER, CLUB, { name: 'x' } as any)).resolves.toBeDefined();
  });

  it('rejects a plain member', async () => {
    asRole('MEMBER');

    await expect(service.updateClub(USER, CLUB, { name: 'x' } as any)).rejects.toThrow(
      AuthorizationError
    );
    expect(prisma.bookClub.update).not.toHaveBeenCalled();
  });

  it('rejects a non-member', async () => {
    asRole(null);

    await expect(service.updateClub(USER, CLUB, { name: 'x' } as any)).rejects.toThrow(
      AuthorizationError
    );
  });

  it('reports NotFoundError rather than a permission error when the club is gone', async () => {
    asRole(null);
    (prisma.bookClub.count as any).mockResolvedValue(0);

    await expect(service.updateClub(USER, CLUB, { name: 'x' } as any)).rejects.toThrow(
      NotFoundError
    );
  });
});

describe('BookClubService.deleteClub', () => {
  it('lets the owner delete', async () => {
    (prisma.bookClub.findUnique as any).mockResolvedValue({ ownerId: USER });

    await service.deleteClub(USER, CLUB);

    expect(prisma.bookClub.delete).toHaveBeenCalledWith({ where: { id: CLUB } });
  });

  it('refuses a non-owner, including moderators', async () => {
    (prisma.bookClub.findUnique as any).mockResolvedValue({ ownerId: 'someone-else' });

    await expect(service.deleteClub(USER, CLUB)).rejects.toThrow(AuthorizationError);
    expect(prisma.bookClub.delete).not.toHaveBeenCalled();
  });

  it('throws NotFoundError for an unknown club', async () => {
    (prisma.bookClub.findUnique as any).mockResolvedValue(null);

    await expect(service.deleteClub(USER, CLUB)).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------
describe('BookClubService.joinClub', () => {
  it('throws NotFoundError for an unknown club', async () => {
    (prisma.bookClub.findUnique as any).mockResolvedValue(null);

    await expect(service.joinClub(USER, CLUB)).rejects.toThrow(NotFoundError);
  });

  it('refuses to self-join a private club', async () => {
    (prisma.bookClub.findUnique as any).mockResolvedValue({
      id: CLUB,
      name: 'Secret',
      isPrivate: true,
      currentBookId: null,
    });

    await expect(service.joinClub(USER, CLUB)).rejects.toThrow(AuthorizationError);
    expect(prisma.bookClubMember.create).not.toHaveBeenCalled();
  });

  it('reports a conflict when already a member', async () => {
    (prisma.bookClub.findUnique as any).mockResolvedValue({
      id: CLUB,
      name: 'Gothic Nights',
      isPrivate: false,
      currentBookId: null,
    });
    (prisma.bookClubMember.create as any).mockRejectedValue({ code: 'P2002' });

    await expect(service.joinClub(USER, CLUB)).rejects.toThrow(ConflictError);
  });

  it('joins as MEMBER and records the activity', async () => {
    (prisma.bookClub.findUnique as any)
      .mockResolvedValueOnce({ id: CLUB, name: 'Gothic Nights', isPrivate: false, currentBookId: null })
      // getClub() re-reads the club at the end of joinClub
      .mockResolvedValueOnce(fakeClub({ members: [{ userId: USER, role: 'MEMBER', joinedAt: new Date(), user: { profile: null } }] }));
    (prisma.bookClubMember.create as any).mockResolvedValue({});

    await service.joinClub(USER, CLUB);

    expect(prisma.bookClubMember.create).toHaveBeenCalledWith({
      data: { clubId: CLUB, userId: USER, role: 'MEMBER' },
    });
    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'JOINED_CLUB',
        metadata: expect.objectContaining({ clubName: 'Gothic Nights' }),
      }),
    });
  });
});

describe('BookClubService.leaveClub', () => {
  it('throws NotFoundError when there is no membership', async () => {
    asRole(null);

    await expect(service.leaveClub(USER, CLUB)).rejects.toThrow(NotFoundError);
  });

  it('blocks the owner from orphaning the club', async () => {
    asRole('OWNER');

    await expect(service.leaveClub(USER, CLUB)).rejects.toThrow(ConflictError);
    expect(prisma.bookClubMember.delete).not.toHaveBeenCalled();
  });

  it('lets a member leave', async () => {
    asRole('MEMBER');

    const result = await service.leaveClub(USER, CLUB);

    expect(prisma.bookClubMember.delete).toHaveBeenCalledWith({ where: { id: 'm-1' } });
    expect(result).toEqual({ left: true });
  });
});

// ---------------------------------------------------------------------------
// Discussions + comments
// ---------------------------------------------------------------------------
describe('BookClubService discussions', () => {
  it('hides a private club\'s discussions from non-members', async () => {
    (prisma.bookClub.findUnique as any).mockResolvedValue({ isPrivate: true });
    (prisma.bookClubMember.count as any).mockResolvedValue(0);

    await expect(service.listDiscussions(USER, CLUB)).rejects.toThrow(AuthorizationError);
    expect(prisma.discussion.findMany).not.toHaveBeenCalled();
  });

  it('shows a private club\'s discussions to members', async () => {
    (prisma.bookClub.findUnique as any).mockResolvedValue({ isPrivate: true });
    (prisma.bookClubMember.count as any).mockResolvedValue(1);
    (prisma.discussion.findMany as any).mockResolvedValue([fakeDiscussion()]);

    const discussions = await service.listDiscussions(USER, CLUB);

    expect(discussions).toHaveLength(1);
    expect(discussions[0]).toMatchObject({ id: 'disc-1', title: 'Chapter 1', commentCount: 0 });
  });

  it('lets any member post a discussion', async () => {
    asRole('MEMBER');
    (prisma.bookClub.findUnique as any).mockResolvedValue({ name: 'Gothic Nights', currentBookId: null });
    (prisma.discussion.create as any).mockResolvedValue(fakeDiscussion());

    const discussion = await service.createDiscussion(USER, CLUB, {
      title: 'Chapter 1',
      body: 'Thoughts?',
    } as any);

    expect(discussion.title).toBe('Chapter 1');
  });

  it('records a discussion with discussionTitle metadata the feed reads by name', async () => {
    asRole('MEMBER');
    (prisma.bookClub.findUnique as any).mockResolvedValue({ name: 'Gothic Nights', currentBookId: null });
    (prisma.discussion.create as any).mockResolvedValue(fakeDiscussion());

    await service.createDiscussion(USER, CLUB, { title: 'Chapter 1', body: 'x' } as any);

    expect(prisma.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'POSTED_DISCUSSION',
        metadata: expect.objectContaining({
          discussionId: 'disc-1',
          discussionTitle: 'Chapter 1',
          clubName: 'Gothic Nights',
        }),
      }),
    });
  });

  it('refuses a non-member posting a discussion', async () => {
    asRole(null);

    await expect(
      service.createDiscussion(USER, CLUB, { title: 't', body: 'b' } as any)
    ).rejects.toThrow(AuthorizationError);
    expect(prisma.discussion.create).not.toHaveBeenCalled();
  });

  it('throws NotFoundError for a discussion outside the club', async () => {
    (prisma.bookClub.findUnique as any).mockResolvedValue({ isPrivate: false });
    (prisma.discussion.findFirst as any).mockResolvedValue(null);

    await expect(service.getDiscussion(USER, CLUB, 'disc-x')).rejects.toThrow(NotFoundError);
  });

  it('returns a thread with comments in order', async () => {
    (prisma.bookClub.findUnique as any).mockResolvedValue({ isPrivate: false });
    (prisma.discussion.findFirst as any).mockResolvedValue(
      fakeDiscussion({
        comments: [
          {
            id: 'c1',
            userId: 'u2',
            body: 'First',
            createdAt: new Date('2026-08-03T00:00:00Z'),
            user: { profile: { username: 'other', avatar: null } },
          },
        ],
      })
    );

    const thread = await service.getDiscussion(USER, CLUB, 'disc-1');

    expect(thread.comments).toEqual([
      {
        id: 'c1',
        body: 'First',
        author: { id: 'u2', username: 'other', avatar: null },
        createdAt: '2026-08-03T00:00:00.000Z',
      },
    ]);
  });

  it('refuses a comment from a non-member', async () => {
    asRole(null);

    await expect(
      service.addComment(USER, CLUB, 'disc-1', { body: 'hi' } as any)
    ).rejects.toThrow(AuthorizationError);
    expect(prisma.discussionComment.create).not.toHaveBeenCalled();
  });

  it('rejects a comment on a discussion that is not in this club', async () => {
    asRole('MEMBER');
    (prisma.discussion.findFirst as any).mockResolvedValue(null);

    await expect(
      service.addComment(USER, CLUB, 'disc-x', { body: 'hi' } as any)
    ).rejects.toThrow(NotFoundError);
  });

  it('adds a comment for a member', async () => {
    asRole('MEMBER');
    (prisma.discussion.findFirst as any).mockResolvedValue({ id: 'disc-1' });
    (prisma.discussionComment.create as any).mockResolvedValue({
      id: 'c1',
      userId: USER,
      body: 'hi',
      createdAt: new Date('2026-08-04T00:00:00Z'),
      user: { profile: { username: 'ayush', avatar: null } },
    });

    const comment = await service.addComment(USER, CLUB, 'disc-1', { body: 'hi' } as any);

    expect(comment).toEqual({
      id: 'c1',
      body: 'hi',
      author: { id: USER, username: 'ayush', avatar: null },
      createdAt: '2026-08-04T00:00:00.000Z',
    });
  });
});
