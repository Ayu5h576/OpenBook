import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { NotFoundError, mapPrismaError } from '../utils/errors';
import type { CreateQuoteInput, UpdateQuoteInput } from '../validators/books';

/**
 * Newest first, with `id` as the final key.
 *
 * The `id` tiebreak is load-bearing, not decorative: Prisma resolves a cursor as
 * "the rows after this id in this order", so a non-total order lets rows with
 * equal `createdAt` repeat or vanish between pages, and two quotes saved in the
 * same burst share a timestamp. Same reasoning as LIBRARY_ORDER.
 */
const QUOTE_ORDER: Prisma.UserQuoteOrderByWithRelationInput[] = [
  { createdAt: 'desc' },
  { id: 'desc' },
];

/**
 * A quote card shows a cover, a title and an author, and nothing else off the
 * book row — so `select`, not `include`. Books are public data, but pulling every
 * scalar for every quote on the wall is wasted bytes.
 */
const QUOTE_BOOK_SELECT = {
  select: { id: true, title: true, authors: true, coverImage: true },
} as const;

/** Shared by every read path, so the client's shape never depends on the route. */
const QUOTE_SHAPE = { include: { book: QUOTE_BOOK_SELECT } } as const;

interface QuoteFilters {
  category?: string;
  /** Already converted from the query string by the controller. */
  favorite?: boolean;
  bookId?: string;
  limit: number;
  cursor?: string;
}

export class QuoteService {
  /**
   * One cursor-paginated page of the caller's quotes.
   *
   * `userId` is in the `where` of every method here and never taken from the
   * request path — a quote is private, and an id-only lookup would let one reader
   * page through another's commonplace book.
   */
  async getQuotes(userId: string, { category, favorite, bookId, limit, cursor }: QuoteFilters) {
    const where: Prisma.UserQuoteWhereInput = {
      userId,
      ...(category && { category }),
      ...(favorite !== undefined && { isFavorite: favorite }),
      ...(bookId && { bookId }),
    };

    const [rows, total] = await Promise.all([
      prisma.userQuote.findMany({
        where,
        ...QUOTE_SHAPE,
        orderBy: QUOTE_ORDER,
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      }),
      prisma.userQuote.count({ where }),
    ]);

    const hasMore = rows.length > limit;
    const quotes = hasMore ? rows.slice(0, limit) : rows;

    return {
      quotes,
      nextCursor: hasMore ? quotes[quotes.length - 1].id : null,
      /** Size of the whole filtered set, not of this page. */
      total,
    };
  }

  /**
   * The category chips above the wall, derived from the reader's own rows.
   *
   * The wall used to hard-code five categories, which meant its filters were
   * fiction whatever the reader had actually saved. Deriving them means a
   * category exists exactly as long as a quote uses it.
   *
   * Sorted in JS rather than by `orderBy: { _count: ... }` so the tiebreak is
   * deterministic — two equally-used categories would otherwise swap places
   * between requests and make the chips jump.
   */
  async getCategories(userId: string) {
    const rows = await prisma.userQuote.groupBy({
      by: ['category'],
      where: { userId, category: { not: null } },
      _count: { _all: true },
    });

    return rows
      .filter((row) => !!row.category)
      .map((row) => ({ category: row.category as string, count: row._count._all }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
  }

  async createQuote(userId: string, input: CreateQuoteInput) {
    try {
      return await prisma.userQuote.create({
        data: {
          userId,
          text: input.text,
          bookId: input.bookId ?? null,
          page: input.page ?? null,
          category: input.category ?? null,
        },
        ...QUOTE_SHAPE,
      });
    } catch (e) {
      // A bookId that does not exist arrives as a foreign-key violation, which
      // would otherwise surface as a 500 rather than a 400.
      throw mapPrismaError(e);
    }
  }

  async updateQuote(userId: string, quoteId: string, input: UpdateQuoteInput) {
    await this.requireQuote(userId, quoteId);
    return prisma.userQuote.update({
      where: { id: quoteId },
      data: input,
      ...QUOTE_SHAPE,
    });
  }

  async deleteQuote(userId: string, quoteId: string) {
    await this.requireQuote(userId, quoteId);
    await prisma.userQuote.delete({ where: { id: quoteId } });
  }

  /**
   * Ownership guard. Matches on `{ id, userId }` together, so a quote belonging
   * to someone else reads as missing rather than as forbidden — the same shape as
   * `libraryService.requireEntry` and `notificationService.markRead`.
   */
  private async requireQuote(userId: string, quoteId: string) {
    const quote = await prisma.userQuote.findFirst({ where: { id: quoteId, userId } });
    if (!quote) throw new NotFoundError('Quote');
    return quote;
  }
}

export const quoteService = new QuoteService();
