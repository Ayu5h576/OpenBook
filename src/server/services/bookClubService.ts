import { prisma } from '../config/prisma';
import { NotFoundError, ConflictError, AuthorizationError, mapPrismaError } from '../utils/errors';
import { recordActivity } from './socialService';
import type { CreateClubInput, UpdateClubInput, CreateDiscussionInput, CreateCommentInput } from '../validators/social';

const clubInclude = {
  owner: { include: { profile: { select: { username: true, avatar: true } } } },
  currentBook: { select: { id: true, title: true, authors: true, coverImage: true } },
  _count: { select: { members: true, discussions: true } },
} as const;

export class BookClubService {
  // ─── Clubs ──────────────────────────────────────────────────────────────────

  /**
   * Lists clubs the user can see: every public club plus any private club they
   * belong to. Each row is annotated with the caller's membership so the UI can
   * render Join vs. Leave without a second request.
   */
  async listClubs(userId: string) {
    const clubs = await prisma.bookClub.findMany({
      where: {
        OR: [{ isPrivate: false }, { members: { some: { userId } } }],
      },
      include: clubInclude,
      orderBy: { createdAt: 'desc' },
    });

    const memberships = await prisma.bookClubMember.findMany({
      where: { userId, clubId: { in: clubs.map((c) => c.id) } },
      select: { clubId: true, role: true },
    });
    const roleByClub = new Map(memberships.map((m) => [m.clubId, m.role]));

    return clubs.map((c) => this.formatClub(c, roleByClub.get(c.id) ?? null));
  }

  async getClub(userId: string, clubId: string) {
    const club = await prisma.bookClub.findUnique({
      where: { id: clubId },
      include: {
        ...clubInclude,
        members: {
          include: { user: { include: { profile: { select: { username: true, avatar: true } } } } },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });
    if (!club) throw new NotFoundError('Book club');

    const membership = club.members.find((m) => m.userId === userId) ?? null;
    if (club.isPrivate && !membership) {
      throw new AuthorizationError('This club is private');
    }

    return {
      ...this.formatClub(club, membership?.role ?? null),
      members: club.members.map((m) => ({
        id: m.userId,
        username: m.user.profile?.username ?? 'Reader',
        avatar: m.user.profile?.avatar ?? null,
        role: m.role,
        joinedAt: m.joinedAt.toISOString(),
      })),
    };
  }

  async createClub(userId: string, input: CreateClubInput) {
    try {
      // The owner is a member too; created atomically so a club is never memberless.
      const club = await prisma.bookClub.create({
        data: {
          ownerId: userId,
          name: input.name,
          description: input.description,
          coverImage: input.coverImage,
          currentBookId: input.currentBookId,
          isPrivate: input.isPrivate,
          members: { create: { userId, role: 'OWNER' } },
        },
        include: clubInclude,
      });

      const profile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { username: true },
      });

      await recordActivity(userId, 'CREATED_CLUB', {
        bookId: input.currentBookId ?? null,
        metadata: {
          actorUsername: profile?.username ?? 'Someone',
          clubId: club.id,
          clubName: club.name,
        },
      });

      return this.formatClub(club, 'OWNER');
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async updateClub(userId: string, clubId: string, input: UpdateClubInput) {
    await this.requireRole(userId, clubId, ['OWNER', 'MODERATOR']);
    try {
      const club = await prisma.bookClub.update({
        where: { id: clubId },
        data: input,
        include: clubInclude,
      });
      const membership = await prisma.bookClubMember.findUnique({
        where: { clubId_userId: { clubId, userId } },
        select: { role: true },
      });
      return this.formatClub(club, membership?.role ?? null);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async deleteClub(userId: string, clubId: string) {
    const club = await prisma.bookClub.findUnique({ where: { id: clubId }, select: { ownerId: true } });
    if (!club) throw new NotFoundError('Book club');
    if (club.ownerId !== userId) throw new AuthorizationError('Only the owner can delete a club');
    await prisma.bookClub.delete({ where: { id: clubId } });
  }

  // ─── Membership ───────────────────────────────────────────────────────────────

  async joinClub(userId: string, clubId: string) {
    const club = await prisma.bookClub.findUnique({
      where: { id: clubId },
      select: { id: true, name: true, isPrivate: true, currentBookId: true },
    });
    if (!club) throw new NotFoundError('Book club');
    if (club.isPrivate) {
      throw new AuthorizationError('This club is private and requires an invitation');
    }

    try {
      await prisma.bookClubMember.create({ data: { clubId, userId, role: 'MEMBER' } });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictError('You are already a member of this club');
      throw mapPrismaError(error);
    }

    const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { username: true } });
    await recordActivity(userId, 'JOINED_CLUB', {
      bookId: club.currentBookId,
      metadata: {
        actorUsername: profile?.username ?? 'Someone',
        clubId: club.id,
        clubName: club.name,
      },
    });

    return this.getClub(userId, clubId);
  }

  async leaveClub(userId: string, clubId: string) {
    const membership = await prisma.bookClubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
    });
    if (!membership) throw new NotFoundError('Membership');
    if (membership.role === 'OWNER') {
      throw new ConflictError('The owner cannot leave; transfer ownership or delete the club');
    }
    await prisma.bookClubMember.delete({ where: { id: membership.id } });
    return { left: true };
  }

  // ─── Discussions ────────────────────────────────────────────────────────────

  async listDiscussions(userId: string, clubId: string) {
    await this.requireVisible(userId, clubId);
    const discussions = await prisma.discussion.findMany({
      where: { clubId },
      include: {
        user: { include: { profile: { select: { username: true, avatar: true } } } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return discussions.map((d) => this.formatDiscussion(d));
  }

  async createDiscussion(userId: string, clubId: string, input: CreateDiscussionInput) {
    await this.requireRole(userId, clubId, ['OWNER', 'MODERATOR', 'MEMBER']);
    const club = await prisma.bookClub.findUnique({
      where: { id: clubId },
      select: { name: true, currentBookId: true },
    });

    const discussion = await prisma.discussion.create({
      data: { clubId, userId, title: input.title, body: input.body },
      include: {
        user: { include: { profile: { select: { username: true, avatar: true } } } },
        _count: { select: { comments: true } },
      },
    });

    const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { username: true } });
    await recordActivity(userId, 'POSTED_DISCUSSION', {
      bookId: club?.currentBookId ?? null,
      metadata: {
        actorUsername: profile?.username ?? 'Someone',
        clubId,
        clubName: club?.name ?? 'a club',
        discussionId: discussion.id,
        discussionTitle: discussion.title,
      },
    });

    return this.formatDiscussion(discussion);
  }

  async getDiscussion(userId: string, clubId: string, discussionId: string) {
    await this.requireVisible(userId, clubId);
    const discussion = await prisma.discussion.findFirst({
      where: { id: discussionId, clubId },
      include: {
        user: { include: { profile: { select: { username: true, avatar: true } } } },
        comments: {
          include: { user: { include: { profile: { select: { username: true, avatar: true } } } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { comments: true } },
      },
    });
    if (!discussion) throw new NotFoundError('Discussion');

    return {
      ...this.formatDiscussion(discussion),
      comments: discussion.comments.map((c) => ({
        id: c.id,
        body: c.body,
        author: {
          id: c.userId,
          username: c.user.profile?.username ?? 'Reader',
          avatar: c.user.profile?.avatar ?? null,
        },
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  async addComment(userId: string, clubId: string, discussionId: string, input: CreateCommentInput) {
    await this.requireRole(userId, clubId, ['OWNER', 'MODERATOR', 'MEMBER']);
    const discussion = await prisma.discussion.findFirst({
      where: { id: discussionId, clubId },
      select: { id: true },
    });
    if (!discussion) throw new NotFoundError('Discussion');

    const comment = await prisma.discussionComment.create({
      data: { discussionId, userId, body: input.body },
      include: { user: { include: { profile: { select: { username: true, avatar: true } } } } },
    });

    return {
      id: comment.id,
      body: comment.body,
      author: {
        id: comment.userId,
        username: comment.user.profile?.username ?? 'Reader',
        avatar: comment.user.profile?.avatar ?? null,
      },
      createdAt: comment.createdAt.toISOString(),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private formatClub(club: any, viewerRole: string | null) {
    return {
      id: club.id,
      name: club.name,
      description: club.description ?? null,
      coverImage: club.coverImage ?? null,
      isPrivate: club.isPrivate,
      owner: {
        id: club.ownerId,
        username: club.owner?.profile?.username ?? 'Reader',
        avatar: club.owner?.profile?.avatar ?? null,
      },
      currentBook: club.currentBook
        ? {
            id: club.currentBook.id,
            title: club.currentBook.title,
            authors: club.currentBook.authors,
            coverImage: club.currentBook.coverImage,
          }
        : null,
      memberCount: club._count?.members ?? 0,
      discussionCount: club._count?.discussions ?? 0,
      viewerRole,
      isMember: viewerRole !== null,
      createdAt: club.createdAt?.toISOString?.() ?? club.createdAt,
    };
  }

  private formatDiscussion(d: any) {
    return {
      id: d.id,
      clubId: d.clubId,
      title: d.title,
      body: d.body,
      author: {
        id: d.userId,
        username: d.user?.profile?.username ?? 'Reader',
        avatar: d.user?.profile?.avatar ?? null,
      },
      commentCount: d._count?.comments ?? 0,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    };
  }

  private async requireRole(userId: string, clubId: string, roles: string[]) {
    const membership = await prisma.bookClubMember.findUnique({
      where: { clubId_userId: { clubId, userId } },
      select: { role: true },
    });
    if (!membership) {
      // Distinguish "club gone" from "not a member" for a clearer client message.
      const exists = await prisma.bookClub.count({ where: { id: clubId } });
      if (!exists) throw new NotFoundError('Book club');
      throw new AuthorizationError('You must be a member of this club');
    }
    if (!roles.includes(membership.role)) {
      throw new AuthorizationError('You do not have permission for this action');
    }
    return membership;
  }

  private async requireVisible(userId: string, clubId: string) {
    const club = await prisma.bookClub.findUnique({
      where: { id: clubId },
      select: { isPrivate: true },
    });
    if (!club) throw new NotFoundError('Book club');
    if (club.isPrivate) {
      const membership = await prisma.bookClubMember.count({ where: { clubId, userId } });
      if (!membership) throw new AuthorizationError('This club is private');
    }
  }
}

export const bookClubService = new BookClubService();
