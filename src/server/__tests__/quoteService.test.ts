/**
 * QuoteService — unit tests
 *
 * Covers: paginated getQuotes (no filters, category filter, favorite filter,
 * bookId filter, cursor paging), getCategories, createQuote, updateQuote,
 * deleteQuote, and the ownership guard on write operations.
 *
 * Prisma is fully mocked — no database required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuoteService } from '../services/quoteService';
import { NotFoundError } from '../utils/errors';

vi.mock('../config/prisma', () => ({
  prisma: {
    userQuote: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from '../config/prisma';

const quoteService = new QuoteService();

const USER = 'user-1';
const OTHER = 'user-2';
const QUOTE_ID = 'quote-abc';
const BOOK_ID = 'book-xyz';

const makeQuote = (id = QUOTE_ID) => ({
  id,
  userId: USER,
  text: 'It was the best of times.',
  bookId: BOOK_ID,
  page: 1,
  category: 'Classic',
  isFavorite: false,
  createdAt: new Date(),
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getQuotes — pagination
// ---------------------------------------------------------------------------
describe('QuoteService.getQuotes — pagination', () => {
  it('returns a page of quotes with total and no nextCursor when results fit the limit', async () => {
    (prisma.userQuote.findMany as any).mockResolvedValue([makeQuote()]);
    (prisma.userQuote.count as any).mockResolvedValue(1);

    const result = await quoteService.getQuotes(USER, { limit: 10 });

    expect(result.quotes).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.nextCursor).toBeNull();
  });

  it('returns nextCursor and trims the over-fetched row', async () => {
    const rows = ['q1', 'q2', 'q3'].map(makeQuote);
    (prisma.userQuote.findMany as any).mockResolvedValue(rows);
    (prisma.userQuote.count as any).mockResolvedValue(3);

    const result = await quoteService.getQuotes(USER, { limit: 2 });

    expect(result.quotes.map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(result.nextCursor).toBe('q2');
  });

  it('scopes all queries to the caller', async () => {
    (prisma.userQuote.findMany as any).mockResolvedValue([]);
    (prisma.userQuote.count as any).mockResolvedValue(0);

    await quoteService.getQuotes(USER, { limit: 10 });

    const where = (prisma.userQuote.findMany as any).mock.calls[0][0].where;
    expect(where).toMatchObject({ userId: USER });
  });

  it('passes a cursor when provided', async () => {
    (prisma.userQuote.findMany as any).mockResolvedValue([]);
    (prisma.userQuote.count as any).mockResolvedValue(0);

    await quoteService.getQuotes(USER, { limit: 5, cursor: 'prev-quote' });

    const call = (prisma.userQuote.findMany as any).mock.calls[0][0];
    expect(call.cursor).toEqual({ id: 'prev-quote' });
    expect(call.skip).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getQuotes — filters
// ---------------------------------------------------------------------------
describe('QuoteService.getQuotes — filters', () => {
  beforeEach(() => {
    (prisma.userQuote.findMany as any).mockResolvedValue([]);
    (prisma.userQuote.count as any).mockResolvedValue(0);
  });

  it('filters by category when provided', async () => {
    await quoteService.getQuotes(USER, { limit: 10, category: 'Poetry' });

    const where = (prisma.userQuote.findMany as any).mock.calls[0][0].where;
    expect(where).toMatchObject({ category: 'Poetry' });
  });

  it('filters by isFavorite when favorite is true', async () => {
    await quoteService.getQuotes(USER, { limit: 10, favorite: true });

    const where = (prisma.userQuote.findMany as any).mock.calls[0][0].where;
    expect(where).toMatchObject({ isFavorite: true });
  });

  it('filters by isFavorite: false when favorite is false', async () => {
    await quoteService.getQuotes(USER, { limit: 10, favorite: false });

    const where = (prisma.userQuote.findMany as any).mock.calls[0][0].where;
    expect(where).toMatchObject({ isFavorite: false });
  });

  it('does not add isFavorite when favorite is undefined', async () => {
    await quoteService.getQuotes(USER, { limit: 10 });

    const where = (prisma.userQuote.findMany as any).mock.calls[0][0].where;
    expect(where).not.toHaveProperty('isFavorite');
  });

  it('filters by bookId when provided', async () => {
    await quoteService.getQuotes(USER, { limit: 10, bookId: BOOK_ID });

    const where = (prisma.userQuote.findMany as any).mock.calls[0][0].where;
    expect(where).toMatchObject({ bookId: BOOK_ID });
  });
});

// ---------------------------------------------------------------------------
// getCategories
// ---------------------------------------------------------------------------
describe('QuoteService.getCategories', () => {
  it('returns categories sorted by count descending, then alphabetically', async () => {
    (prisma.userQuote.groupBy as any).mockResolvedValue([
      { category: 'Philosophy', _count: { _all: 5 } },
      { category: 'History', _count: { _all: 10 } },
      { category: 'Classic', _count: { _all: 5 } },
    ]);

    const cats = await quoteService.getCategories(USER);

    expect(cats.map((c) => c.category)).toEqual(['History', 'Classic', 'Philosophy']);
  });

  it('filters out rows with a null category', async () => {
    (prisma.userQuote.groupBy as any).mockResolvedValue([
      { category: null, _count: { _all: 3 } },
      { category: 'Sci-Fi', _count: { _all: 7 } },
    ]);

    const cats = await quoteService.getCategories(USER);

    expect(cats.every((c) => c.category !== null)).toBe(true);
    expect(cats).toHaveLength(1);
  });

  it('only queries quotes belonging to the caller', async () => {
    (prisma.userQuote.groupBy as any).mockResolvedValue([]);

    await quoteService.getCategories(USER);

    expect(prisma.userQuote.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: USER }) })
    );
  });
});

// ---------------------------------------------------------------------------
// createQuote
// ---------------------------------------------------------------------------
describe('QuoteService.createQuote', () => {
  it('creates a quote with all provided fields', async () => {
    const input = { text: 'All animals are equal.', bookId: BOOK_ID, page: 17, category: 'Classic' };
    (prisma.userQuote.create as any).mockResolvedValue({ id: QUOTE_ID, userId: USER, ...input });

    await quoteService.createQuote(USER, input as any);

    expect(prisma.userQuote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: USER, text: input.text, bookId: BOOK_ID, page: 17, category: 'Classic' },
      })
    );
  });

  it('stores null for optional fields when omitted', async () => {
    (prisma.userQuote.create as any).mockResolvedValue({ id: QUOTE_ID });

    await quoteService.createQuote(USER, { text: 'Minimal quote' } as any);

    const data = (prisma.userQuote.create as any).mock.calls[0][0].data;
    expect(data.bookId).toBeNull();
    expect(data.page).toBeNull();
    expect(data.category).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateQuote
// ---------------------------------------------------------------------------
describe('QuoteService.updateQuote', () => {
  it('updates a quote the caller owns', async () => {
    (prisma.userQuote.findFirst as any).mockResolvedValue(makeQuote());
    (prisma.userQuote.update as any).mockResolvedValue(makeQuote());

    await quoteService.updateQuote(USER, QUOTE_ID, { text: 'Updated.' } as any);

    expect(prisma.userQuote.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: QUOTE_ID },
        data: { text: 'Updated.' },
      })
    );
  });

  it('throws NotFoundError (not AuthorizationError) when the quote belongs to another user', async () => {
    // The service filters by { id, userId }, so a wrong-owner quote looks missing.
    (prisma.userQuote.findFirst as any).mockResolvedValue(null);

    await expect(
      quoteService.updateQuote(OTHER, QUOTE_ID, { text: 'Hacked' } as any)
    ).rejects.toThrow(NotFoundError);
    expect(prisma.userQuote.update).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteQuote
// ---------------------------------------------------------------------------
describe('QuoteService.deleteQuote', () => {
  it('deletes a quote the caller owns', async () => {
    (prisma.userQuote.findFirst as any).mockResolvedValue(makeQuote());

    await quoteService.deleteQuote(USER, QUOTE_ID);

    expect(prisma.userQuote.delete).toHaveBeenCalledWith({ where: { id: QUOTE_ID } });
  });

  it('throws NotFoundError when the quote does not exist or belongs to another user', async () => {
    (prisma.userQuote.findFirst as any).mockResolvedValue(null);

    await expect(quoteService.deleteQuote(USER, QUOTE_ID)).rejects.toThrow(NotFoundError);
    expect(prisma.userQuote.delete).not.toHaveBeenCalled();
  });

  it('searches by { id, userId } so one user cannot delete another user\'s quote', async () => {
    (prisma.userQuote.findFirst as any).mockResolvedValue(null);

    await expect(quoteService.deleteQuote(OTHER, QUOTE_ID)).rejects.toThrow(NotFoundError);

    expect(prisma.userQuote.findFirst).toHaveBeenCalledWith({
      where: { id: QUOTE_ID, userId: OTHER },
    });
  });
});
