import { LibraryStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ConflictError, NotFoundError, mapPrismaError } from '../utils/errors';
import { recordActivity } from './socialService';
import { invalidateUserStats } from './analyticsService';
import type {
  AddToLibraryInput,
  UpdateLibraryEntryInput,
  LogSessionInput,
  LibraryQueryInput,
  WishlistQueryInput,
} from '../validators/books';

/**
 * Pinned first, then most recently read. Two keys here are load-bearing:
 *
 *  - `nulls: 'last'` on `lastReadAt`. Postgres sorts NULLs *first* for DESC, so
 *    without it every never-opened book floats above the one you are actually
 *    reading. That was merely odd while the whole shelf came back in a single
 *    response; now that only the first page does, it would starve "Continue
 *    reading" and "Recently opened" of anything in progress.
 *  - `id` as the final key. Prisma resolves a cursor as "the rows after this id
 *    in this order", so a non-total order lets rows with equal keys repeat or
 *    vanish between pages. `isPinned`, `lastReadAt` and `createdAt` are all
 *    non-unique; `id` makes the order total.
 */
const LIBRARY_ORDER: Prisma.LibraryEntryOrderByWithRelationInput[] = [
  { isPinned: 'desc' },
  { lastReadAt: { sort: 'desc', nulls: 'last' } },
  { createdAt: 'desc' },
  { id: 'desc' },
];

/** Same total-order requirement as LIBRARY_ORDER; priority is an enum, so HIGH first. */
const WISHLIST_ORDER: Prisma.WishlistEntryOrderByWithRelationInput[] = [
  { priority: 'asc' },
  { createdAt: 'desc' },
  { id: 'desc' },
];

export class LibraryService {
  /**
   * One cursor-paginated page of the reader's shelf, newest activity first.
   *
   * `total` is the real size of the filtered set, not the page — the library
   * header reads "N Total Volumes Curated", which would otherwise silently
   * degrade into "N loaded so far".
   */
  async getUserLibrary(userId: string, { status, bookId, limit, cursor }: LibraryQueryInput) {
    const where: Prisma.LibraryEntryWhereInput = {
      userId,
      ...(status && { status: status as LibraryStatus }),
      ...(bookId && { bookId }),
    };

    const [rows, total] = await Promise.all([
      prisma.libraryEntry.findMany({
        where,
        include: { book: true },
        orderBy: LIBRARY_ORDER,
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      }),
      prisma.libraryEntry.count({ where }),
    ]);

    const hasMore = rows.length > limit;
    const entries = hasMore ? rows.slice(0, limit) : rows;

    return {
      entries,
      nextCursor: hasMore ? entries[entries.length - 1].id : null,
      total,
    };
  }

  async addToLibrary(userId: string, input: AddToLibraryInput) {
    const existing = await prisma.libraryEntry.findUnique({
      where: { userId_bookId: { userId, bookId: input.bookId } },
    });
    if (existing) throw new ConflictError('Book is already in your library');

    try {
      const created = await prisma.libraryEntry.create({
        data: {
          userId,
          bookId: input.bookId,
          status: input.status as LibraryStatus,
          currentPage: input.currentPage,
          ...(input.status === 'READING' ? { startedAt: new Date() } : {}),
        },
        include: { book: true },
      });
      await invalidateUserStats(userId);
      return created;
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

    const updated = await prisma.libraryEntry.update({
      where: { id: entryId },
      data,
      include: { book: true },
    });

    // Status / page changes feed every stats aggregate, so drop the cache.
    await invalidateUserStats(userId);

    // Surface finishing a book to the community feed. Only fires on the
    // transition into COMPLETED so re-saving a finished book stays quiet.
    if (input.status === 'COMPLETED' && entry.status !== 'COMPLETED') {
      await recordActivity(userId, 'FINISHED_BOOK', {
        bookId: updated.bookId,
        metadata: { bookTitle: updated.book.title, authors: updated.book.authors },
      });
    }

    return updated;
  }

  async removeFromLibrary(userId: string, entryId: string) {
    await this.requireEntry(userId, entryId);
    await prisma.libraryEntry.delete({ where: { id: entryId } });
    await invalidateUserStats(userId);
  }

  async logSession(userId: string, entryId: string, input: LogSessionInput) {
    const entry = await this.requireEntry(userId, entryId);

    // Logging time against a book you had only marked OWNED/PAUSED/DROPPED means
    // you are reading it again — promote it so it shows up under Currently Reading.
    const resumes = entry.status !== 'READING' && entry.status !== 'COMPLETED';

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
          ...(resumes
            ? {
                status: LibraryStatus.READING,
                startedAt: entry.startedAt ?? new Date(input.startedAt),
              }
            : {}),
        },
      }),
    ]);

    // Sessions drive pages/hours/streak/heatmap — the bulk of the stats payload.
    await invalidateUserStats(userId);

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

  async getWishlist(userId: string, { bookId, limit, cursor }: WishlistQueryInput) {
    const where: Prisma.WishlistEntryWhereInput = { userId, ...(bookId && { bookId }) };

    const [rows, total] = await Promise.all([
      prisma.wishlistEntry.findMany({
        where,
        include: { book: true },
        orderBy: WISHLIST_ORDER,
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      }),
      prisma.wishlistEntry.count({ where }),
    ]);

    const hasMore = rows.length > limit;
    const entries = hasMore ? rows.slice(0, limit) : rows;

    return {
      entries,
      nextCursor: hasMore ? entries[entries.length - 1].id : null,
      total,
    };
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
