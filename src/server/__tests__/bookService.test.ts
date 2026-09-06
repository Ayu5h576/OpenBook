/**
 * BookService — unit tests
 *
 * BookService has two distinct parts:
 *  1. Pure mapping/utility functions (mapVolume, normalizeImageUrl,
 *     isPlaceholderVolume, buildCoverUrl, buildLargeCoverUrl, extractIsbn)
 *     tested via the public searchBooks / importBook surface.
 *  2. Prisma-backed persistence (importBook, getBookById).
 *
 * The Google Books HTTP calls are mocked via vi.stubGlobal('fetch', ...) so
 * no network requests are made. The cache is mocked to pass through to the
 * factory on every call (i.e. no caching is simulated).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookService } from '../services/bookService';
import { NotFoundError, ServerError } from '../utils/errors';

// ---- Prisma mock ----------------------------------------------------------
vi.mock('../config/prisma', () => ({
  prisma: {
    book: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// ---- CacheService mock — always calls through to the factory --------------
vi.mock('../cache/cacheService', () => ({
  cacheService: {
    getOrSet: vi.fn((_key: string, _ttl: number, factory: () => Promise<unknown>) => factory()),
  },
}));

import { prisma } from '../config/prisma';

const bookService = new BookService();

const GOOGLE_ID = 'abc123XYZ';

/** Minimal Google Books volume response */
const makeGoogleVolume = (overrides: Record<string, unknown> = {}) => ({
  id: GOOGLE_ID,
  volumeInfo: {
    title: 'The Great Book',
    authors: ['Author One', 'Author Two'],
    description: 'A wonderful read.',
    pageCount: 320,
    categories: ['Fiction'],
    language: 'en',
    publisher: 'Penguin',
    publishedDate: '2020-05-01',
    industryIdentifiers: [
      { type: 'ISBN_10', identifier: '0123456789' },
      { type: 'ISBN_13', identifier: '9780123456789' },
    ],
    averageRating: 4.5,
    ratingsCount: 1200,
    imageLinks: {
      smallThumbnail: 'http://books.google.com/books/content?id=abc&zoom=5&edge=curl',
      thumbnail: 'http://books.google.com/books/content?id=abc&zoom=1&edge=curl',
    },
    ...overrides,
  },
});

/** Stub global fetch to return a given body */
function mockFetch(body: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// searchBooks
// ---------------------------------------------------------------------------
describe('BookService.searchBooks', () => {
  it('maps a successful Google Books response to GoogleBookResult[]', async () => {
    mockFetch({ items: [makeGoogleVolume()], totalItems: 1 });

    const result = await bookService.searchBooks('Great Book', 'title', 0, 10);

    expect(result.totalItems).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      googleBooksId: GOOGLE_ID,
      title: 'The Great Book',
      authors: ['Author One', 'Author Two'],
      isbn10: '0123456789',
      isbn13: '9780123456789',
      ratingsCount: 1200,
    });
  });

  it('returns an empty array when the API returns no items', async () => {
    mockFetch({ totalItems: 0 });

    const result = await bookService.searchBooks('nothing', 'title', 0, 10);

    expect(result.items).toEqual([]);
    expect(result.totalItems).toBe(0);
  });

  it('uses the correct field prefix per search type', async () => {
    mockFetch({ items: [], totalItems: 0 });

    await bookService.searchBooks('Tolkien', 'author', 0, 5);

    const url: string = (fetch as any).mock.calls[0][0];
    expect(url).toContain('inauthor%3ATolkien');
  });

  it('throws ServerError when Google returns a non-2xx status', async () => {
    mockFetch({}, false);

    await expect(bookService.searchBooks('x', 'title', 0, 10)).rejects.toThrow(ServerError);
  });
});

// ---------------------------------------------------------------------------
// getGoogleBook
// ---------------------------------------------------------------------------
describe('BookService.getGoogleBook', () => {
  it('maps a single volume correctly', async () => {
    mockFetch(makeGoogleVolume());

    const vol = await bookService.getGoogleBook(GOOGLE_ID);

    expect(vol.googleBooksId).toBe(GOOGLE_ID);
    expect(vol.language).toBe('en');
  });

  it('defaults language to "en" when absent from the response', async () => {
    mockFetch(makeGoogleVolume({ language: undefined }));

    const vol = await bookService.getGoogleBook(GOOGLE_ID);

    expect(vol.language).toBe('en');
  });

  it('defaults ratingsCount to 0 when absent', async () => {
    mockFetch(makeGoogleVolume({ ratingsCount: undefined }));

    const vol = await bookService.getGoogleBook(GOOGLE_ID);

    expect(vol.ratingsCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Cover URL normalisation
// ---------------------------------------------------------------------------
describe('BookService — cover URL normalisation', () => {
  it('upgrades http to https in cover URLs', async () => {
    mockFetch({ items: [makeGoogleVolume()], totalItems: 1 });

    const { items } = await bookService.searchBooks('test', 'title', 0, 10);

    expect(items[0].coverImage).toMatch(/^https:\/\//);
  });

  it('rewrites zoom to 2 for thumbnail covers', async () => {
    mockFetch({ items: [makeGoogleVolume()], totalItems: 1 });

    const { items } = await bookService.searchBooks('test', 'title', 0, 10);

    expect(items[0].coverImage).toContain('zoom=2');
    expect(items[0].coverImage).not.toContain('zoom=5');
    expect(items[0].coverImage).not.toContain('zoom=1');
  });

  it('strips the edge=curl artifact from cover URLs', async () => {
    mockFetch({ items: [makeGoogleVolume()], totalItems: 1 });

    const { items } = await bookService.searchBooks('test', 'title', 0, 10);

    expect(items[0].coverImage).not.toContain('edge=curl');
    expect(items[0].coverImage).toContain('edge=none');
  });

  it('sets coverImage to undefined for placeholder volumes (CAAJ suffix)', async () => {
    const placeholder = makeGoogleVolume() as any;
    placeholder.id = 'fakeidAAACAJsuffix'; // isPlaceholderVolume returns true for CAAJ
    mockFetch({ items: [placeholder], totalItems: 1 });

    // Build a volume whose id ends in CAAJ
    const caajVol = { ...makeGoogleVolume(), id: 'AAAACAAJ' } as any;
    mockFetch({ items: [caajVol], totalItems: 1 });

    const { items } = await bookService.searchBooks('placeholder', 'title', 0, 10);
    expect(items[0].coverImage).toBeUndefined();
  });

  it('returns undefined coverImage when imageLinks is absent', async () => {
    const vol = makeGoogleVolume({ imageLinks: undefined }) as any;
    mockFetch({ items: [vol], totalItems: 1 });

    const { items } = await bookService.searchBooks('no cover', 'title', 0, 10);

    expect(items[0].coverImage).toBeUndefined();
    expect(items[0].largeCoverImage).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// importBook
// ---------------------------------------------------------------------------
describe('BookService.importBook', () => {
  it('returns the existing DB record without hitting Google when the book is already imported', async () => {
    const existing = { id: 'db-id', googleBooksId: GOOGLE_ID, title: 'Cached' };
    (prisma.book.findUnique as any).mockResolvedValue(existing);

    // Stub fetch as a spy so we can assert it was never invoked.
    // fetch is a Node 18+ built-in and is always defined, so typeof checks don't work.
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await bookService.importBook(GOOGLE_ID);

    expect(result).toEqual(existing);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches from Google and creates a DB record on first import', async () => {
    (prisma.book.findUnique as any).mockResolvedValue(null);
    mockFetch(makeGoogleVolume());
    (prisma.book.create as any).mockResolvedValue({ id: 'new-db-id', googleBooksId: GOOGLE_ID });

    const result = await bookService.importBook(GOOGLE_ID);

    expect(prisma.book.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          googleBooksId: GOOGLE_ID,
          title: 'The Great Book',
        }),
      })
    );
    expect(result).toMatchObject({ googleBooksId: GOOGLE_ID });
  });
});

// ---------------------------------------------------------------------------
// getBookById
// ---------------------------------------------------------------------------
describe('BookService.getBookById', () => {
  it('returns the book when found', async () => {
    const book = { id: 'local-1', title: 'Known Book' };
    (prisma.book.findUnique as any).mockResolvedValue(book);

    await expect(bookService.getBookById('local-1')).resolves.toEqual(book);
  });

  it('throws NotFoundError when the book is missing', async () => {
    (prisma.book.findUnique as any).mockResolvedValue(null);

    await expect(bookService.getBookById('ghost')).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// getVolumeSaleInfo
// ---------------------------------------------------------------------------
describe('BookService.getVolumeSaleInfo', () => {
  it('returns parsed sale info for a book that is for sale', async () => {
    mockFetch({
      id: GOOGLE_ID,
      volumeInfo: { title: 'Test' },
      saleInfo: {
        saleability: 'FOR_SALE',
        isEbook: true,
        retailPrice: { amount: 9.99, currencyCode: 'USD' },
        buyLink: 'https://play.google.com/store/books/details?id=abc',
      },
    });

    const info = await bookService.getVolumeSaleInfo(GOOGLE_ID, 'US');

    expect(info).toMatchObject({
      saleability: 'FOR_SALE',
      isEbook: true,
      price: 9.99,
      currency: 'USD',
    });
    expect(info?.buyLink).toContain('play.google.com');
  });

  it('returns null (not a throw) when Google returns a non-2xx for the country', async () => {
    mockFetch({}, false); // ServerError inside cacheService factory

    const info = await bookService.getVolumeSaleInfo(GOOGLE_ID, 'XX');

    expect(info).toBeNull();
  });

  it('returns null when the volume has no saleInfo', async () => {
    mockFetch({ id: GOOGLE_ID, volumeInfo: { title: 'Test' } }); // no saleInfo key

    const info = await bookService.getVolumeSaleInfo(GOOGLE_ID, 'US');

    expect(info).toBeNull();
  });

  it('uses listPrice as a fallback when retailPrice is absent', async () => {
    mockFetch({
      id: GOOGLE_ID,
      volumeInfo: { title: 'Test' },
      saleInfo: {
        saleability: 'FOR_SALE',
        isEbook: false,
        listPrice: { amount: 14.99, currencyCode: 'GBP' },
      },
    });

    const info = await bookService.getVolumeSaleInfo(GOOGLE_ID, 'GB');

    expect(info?.price).toBe(14.99);
    expect(info?.currency).toBe('GBP');
  });
});
