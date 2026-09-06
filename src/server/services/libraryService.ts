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
  ListQueryInput,
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

/**
 * Memory cards are a chronology of finishing books, so `finishedAt` leads.
 * `nulls: 'last'` for the same reason as LIBRARY_ORDER — Postgres sorts NULLs
 * first on DESC, which would float books marked COMPLETED before the column
 * existed above everything actually finished recently.
 */
const MEMORY_ORDER: Prisma.LibraryEntryOrderByWithRelationInput[] = [
  { finishedAt: { sort: 'desc', nulls: 'last' } },
  { updatedAt: 'desc' },
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

  /**
   * The user's copy of a book, if they have one. Returns null rather than
   * throwing so the reader can branch on ownership (annotate vs. offer to add
   * the book) without an exception round-trip. Ownership is enforced by `userId`
   * in the where clause — one reader can never resolve another's entry.
   */
  async getEntryByBook(userId: string, bookId: string) {
    return prisma.libraryEntry.findFirst({ where: { userId, bookId } });
  }

  /**
   * The finished shelf as memory cards: what the reader kept from each book.
   *
   * Every field is read off a real row and is nullable — there are deliberately
   * no placeholder strings. A book the reader never annotated yields a card with
   * a cover, a title and a date, and the client hides the parts that are absent.
   * Inventing a takeaway would be the same mistake as synthesizing a price.
   */
  async getMemories(userId: string, { limit, cursor }: ListQueryInput) {
    const where: Prisma.LibraryEntryWhereInput = { userId, status: LibraryStatus.COMPLETED };

    const [rows, total] = await Promise.all([
      prisma.libraryEntry.findMany({
        where,
        include: {
          book: true,
          // One each: the card has room for a single quote and a single takeaway.
          notes: { orderBy: { createdAt: 'desc' }, take: 1 },
          highlights: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: MEMORY_ORDER,
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      }),
      prisma.libraryEntry.count({ where }),
    ]);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const bookIds = page.map((entry) => entry.bookId);

    // Nothing finished on this page, so nothing to join against.
    if (!bookIds.length) return { memories: [], nextCursor: null, total };

    // Reviews and quotes hang off (userId, bookId), not off LibraryEntry, so they
    // cannot come from the include above. Two batched queries keyed on the page's
    // book ids rather than one pair per card.
    const [reviews, quotes] = await Promise.all([
      prisma.review.findMany({
        where: { userId, bookId: { in: bookIds } },
        select: { bookId: true, rating: true, body: true },
      }),
      prisma.userQuote.findMany({
        where: { userId, bookId: { in: bookIds } },
        // Favourites first, so the quote the reader starred is the one that makes
        // the card.
        orderBy: [{ isFavorite: 'desc' }, { createdAt: 'desc' }],
        select: { bookId: true, text: true },
      }),
    ]);

    const reviewByBook = new Map(reviews.map((review) => [review.bookId, review] as const));

    const quoteByBook = new Map<string, string>();
    for (const quote of quotes) {
      if (quote.bookId && !quoteByBook.has(quote.bookId)) quoteByBook.set(quote.bookId, quote.text);
    }

    const memories = page.map((entry) => {
      const review = reviewByBook.get(entry.bookId);
      return {
        entryId: entry.id,
        book: entry.book,
        // finishedAt can be null on rows marked COMPLETED before it was written;
        // updatedAt is the closest honest stand-in for when that happened.
        finishedDate: entry.finishedAt ?? entry.updatedAt,
        // Prisma hands back a Decimal, which serializes as an object rather than
        // a number — the client renders stars from this, so coerce it here.
        rating: review ? Number(review.rating) : null,
        // A saved quote outranks a highlight: filing it was a deliberate act,
        // while a highlight is just a swipe over some text.
        quote: quoteByBook.get(entry.bookId) ?? entry.highlights[0]?.text ?? null,
        // The review body is the reader's considered verdict; failing that, their
        // most recent note is the nearest thing to one.
        topTakeaway: review?.body ?? entry.notes[0]?.text ?? null,
        moodTag: entry.book.categories[0] ?? null,
        isFavorite: entry.isFavorite,
      };
    });

    return {
      memories,
      nextCursor: hasMore ? page[page.length - 1].id : null,
      total,
    };
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
