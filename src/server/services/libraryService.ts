import { LibraryStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ConflictError, NotFoundError, mapPrismaError } from '../utils/errors';
import type { AddToLibraryInput, UpdateLibraryEntryInput, LogSessionInput } from '../validators/books';

export class LibraryService {
  async getUserLibrary(userId: string, status?: LibraryStatus) {
    return prisma.libraryEntry.findMany({
      where: { userId, ...(status ? { status } : {}) },
      include: { book: true },
      orderBy: [{ isPinned: 'desc' }, { lastReadAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async addToLibrary(userId: string, input: AddToLibraryInput) {
    const existing = await prisma.libraryEntry.findUnique({
      where: { userId_bookId: { userId, bookId: input.bookId } },
    });
    if (existing) throw new ConflictError('Book is already in your library');

    try {
      return await prisma.libraryEntry.create({
        data: {
          userId,
          bookId: input.bookId,
          status: input.status as LibraryStatus,
          currentPage: input.currentPage,
          ...(input.status === 'READING' ? { startedAt: new Date() } : {}),
        },
        include: { book: true },
      });
    } catch (e) {
      throw mapPrismaError(e);
    }
  }

  async updateEntry(userId: string, entryId: string, input: UpdateLibraryEntryInput) {
    const entry = await this.requireEntry(userId, entryId);

    const data: any = { ...input };

    if (input.status === 'READING' && entry.status !== 'READING') {
      data.startedAt = entry.startedAt ?? new Date();
      data.lastReadAt = new Date();
    }
    if (input.status === 'COMPLETED' && entry.status !== 'COMPLETED') {
      data.finishedAt = data.finishedAt ? new Date(data.finishedAt) : new Date();
    }
    if (input.currentPage !== undefined) {
      data.lastReadAt = new Date();
    }

    return prisma.libraryEntry.update({
      where: { id: entryId },
      data,
      include: { book: true },
    });
  }

  async removeFromLibrary(userId: string, entryId: string) {
    await this.requireEntry(userId, entryId);
    await prisma.libraryEntry.delete({ where: { id: entryId } });
  }

  async logSession(userId: string, entryId: string, input: LogSessionInput) {
    const entry = await this.requireEntry(userId, entryId);

    const [session] = await prisma.$transaction([
      prisma.readingSession.create({
        data: {
          entryId,
          startPage: input.startPage,
          endPage: input.endPage,
          durationSecs: input.durationSecs,
          startedAt: new Date(input.startedAt),
          endedAt: new Date(input.endedAt),
        },
      }),
      prisma.libraryEntry.update({
        where: { id: entryId },
        data: {
          currentPage: Math.max(entry.currentPage, input.endPage),
          lastReadAt: new Date(input.endedAt),
        },
      }),
    ]);

    return session;
  }

  async getEntry(userId: string, entryId: string) {
    const entry = await prisma.libraryEntry.findFirst({
      where: { id: entryId, userId },
      include: {
        book: true,
        readingSessions: { orderBy: { startedAt: 'desc' }, take: 20 },
        notes: { orderBy: { createdAt: 'desc' } },
        highlights: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!entry) throw new NotFoundError('Library entry');
    return entry;
  }

  async getWishlist(userId: string) {
    return prisma.wishlistEntry.findMany({
      where: { userId },
      include: { book: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async addToWishlist(userId: string, bookId: string, priority: string, notes?: string) {
    const existing = await prisma.wishlistEntry.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });
    if (existing) throw new ConflictError('Book is already in your wishlist');

    try {
      return await prisma.wishlistEntry.create({
        data: { userId, bookId, priority: priority as any, notes },
        include: { book: true },
      });
    } catch (e) {
      throw mapPrismaError(e);
    }
  }

  async removeFromWishlist(userId: string, wishlistEntryId: string) {
    const entry = await prisma.wishlistEntry.findFirst({
      where: { id: wishlistEntryId, userId },
    });
    if (!entry) throw new NotFoundError('Wishlist entry');
    await prisma.wishlistEntry.delete({ where: { id: wishlistEntryId } });
  }

  private async requireEntry(userId: string, entryId: string) {
    const entry = await prisma.libraryEntry.findFirst({ where: { id: entryId, userId } });
    if (!entry) throw new NotFoundError('Library entry');
    return entry;
  }
}

export const libraryService = new LibraryService();
