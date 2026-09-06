/**
 * AuthorService — unit tests
 *
 * Prisma, Google Books, the cache and `fetch` are all mocked; what is under test
 * is the judgement this service applies to other people's data.
 *
 * Two guards carry most of the weight. Wikipedia's summary endpoint resolves a
 * *title*, and Open Library's author search ranks by popularity, so both will
 * cheerfully answer with the wrong person for a shared or similar name. Showing
 * a stranger's biography under an author's photo is the worst thing this page
 * can do, and nothing downstream could detect it — so the checks live here and
 * are pinned by tests.
 *
 * The third property is that the service never throws: a third-party outage
 * costs the page a section, not the page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthorService } from '../services/authorService';

// Factories are hoisted above every const, so each builds its own state inline
// and exposes it back through the mocked module.
vi.mock('../config/prisma', () => ({
  prisma: {
    book: { findUnique: vi.fn() },
    libraryEntry: { findMany: vi.fn() },
    review: { findMany: vi.fn() },
  },
}));

vi.mock('../cache/cacheService', () => {
  const store = new Map<string, any>();
  return {
    cacheService: {
      __store: store,
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      set: vi.fn(async (key: string, value: any) => {
        store.set(key, value);
      }),
      getOrSet: vi.fn(async (key: string, _ttl: number, compute: () => Promise<any>) => {
        if (store.has(key)) return store.get(key);
        const value = await compute();
        store.set(key, value);
        return value;
      }),
    },
  };
});

vi.mock('../services/bookService', () => ({
  bookService: { searchBooks: vi.fn() },
}));

import { prisma } from '../config/prisma';
import { cacheService } from '../cache/cacheService';
import { bookService } from '../services/bookService';

const cacheStore = (cacheService as any).__store as Map<string, any>;

/** Route fetches by URL substring; anything unrouted 404s. */
function routeFetch(routes: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const match = Object.keys(routes).find((fragment) => String(url).includes(fragment));
      if (!match) return { ok: false, status: 404, json: async () => ({}) };
      const body = routes[match];
      if (body === '__throw__') throw new Error('network unreachable');
      return { ok: true, status: 200, json: async () => body };
    })
  );
}

const HERBERT_WIKI = {
  type: 'standard',
  title: 'Frank Herbert',
  extract: 'Franklin Patrick Herbert Jr. was an American science fiction author best known for Dune.',
  originalimage: { source: 'https://upload.wikimedia.org/herbert.jpg' },
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Frank_Herbert' } },
};

const HERBERT_OL = {
  docs: [
    {
      key: 'OL79034A',
      name: 'Frank Herbert',
      birth_date: '8 October 1920',
      death_date: '11 February 1986',
      top_work: 'Dune',
      work_count: 92,
      top_subjects: ['Science fiction'],
    },
  ],
};

function service() {
  return new AuthorService();
}

beforeEach(() => {
  vi.clearAllMocks();
  cacheStore.clear();
  (prisma.libraryEntry.findMany as any).mockResolvedValue([]);
  (prisma.review.findMany as any).mockResolvedValue([]);
  (bookService.searchBooks as any).mockResolvedValue({ items: [], totalItems: 0 });
  routeFetch({});
});

describe('resolveAuthorName', () => {
  it('passes a plain name through, normalized', async () => {
    expect(await service().resolveAuthorName('  Frank Herbert. ')).toBe('Frank Herbert');
  });

  it('resolves a legacy auth-<uuid> link through the book it points at', async () => {
    (prisma.book.findUnique as any).mockResolvedValue({ authors: ['Frank Herbert'] });
    const name = await service().resolveAuthorName('auth-941a496e-7112-4c1a-94d1-73096853698b');
    expect(name).toBe('Frank Herbert');
  });

  it('returns null when the legacy book no longer exists', async () => {
    (prisma.book.findUnique as any).mockResolvedValue(null);
    expect(
      await service().resolveAuthorName('auth-941a496e-7112-4c1a-94d1-73096853698b')
    ).toBeNull();
  });

  it('returns null for a book row with no authors', async () => {
    (prisma.book.findUnique as any).mockResolvedValue({ authors: [] });
    expect(
      await service().resolveAuthorName('auth-941a496e-7112-4c1a-94d1-73096853698b')
    ).toBeNull();
  });

  it('returns null for the demo-data slugs', async () => {
    expect(await service().resolveAuthorName('auth-frankherbert')).toBeNull();
    expect(prisma.book.findUnique).not.toHaveBeenCalled();
  });
});

describe('getAuthorBio', () => {
  it('merges Wikipedia prose with Open Library facts', async () => {
    routeFetch({
      'wikipedia.org/api': HERBERT_WIKI,
      'openlibrary.org/search/authors': HERBERT_OL,
    });

    const bio = await service().getAuthorBio('Frank Herbert');

    expect(bio.bio).toContain('American science fiction author');
    expect(bio.birthDate).toBe('8 October 1920');
    expect(bio.workCount).toBe(92);
    expect(bio.topWork).toBe('Dune');
    expect(bio.subjects).toEqual(['Science fiction']);
    // Wikipedia's photograph wins over Open Library's avatar.
    expect(bio.portraitUrl).toBe('https://upload.wikimedia.org/herbert.jpg');
    expect(bio.sources.map((s) => s.name)).toEqual(['Wikipedia', 'Open Library']);
  });

  it('rejects a disambiguation page rather than describing the wrong person', async () => {
    routeFetch({
      'wikipedia.org/api': {
        type: 'disambiguation',
        extract: 'Herbert may refer to several people.',
      },
    });

    const bio = await service().getAuthorBio('Frank Herbert');
    expect(bio.bio).toBeUndefined();
  });

  it("rejects an article that never mentions the author's surname", async () => {
    // The classic failure: the name resolves to a place, a band, or a book.
    routeFetch({
      'wikipedia.org/api': {
        type: 'standard',
        extract: 'Dune is a 1965 epic science fiction novel.',
      },
    });

    const bio = await service().getAuthorBio('Frank Herbert');
    expect(bio.bio).toBeUndefined();
  });

  it('ignores an Open Library hit whose name does not match', async () => {
    routeFetch({
      'openlibrary.org/search/authors': {
        docs: [{ key: 'OL1A', name: 'Brian Herbert', work_count: 40 }],
      },
    });

    const bio = await service().getAuthorBio('Frank Herbert');
    expect(bio.workCount).toBeUndefined();
    expect(bio.portraitUrl).toBeUndefined();
  });

  it('finds the exact match further down a fuzzy result list', async () => {
    routeFetch({
      'openlibrary.org/search/authors': {
        docs: [
          { key: 'OL1A', name: 'Brian Herbert', work_count: 40 },
          { key: 'OL79034A', name: 'Frank Herbert', work_count: 92 },
        ],
      },
    });

    const bio = await service().getAuthorBio('Frank Herbert');
    expect(bio.workCount).toBe(92);
  });

  it('returns a bare record when every source is down, and never throws', async () => {
    routeFetch({ 'wikipedia.org/api': '__throw__', 'openlibrary.org': '__throw__' });

    const bio = await service().getAuthorBio('Frank Herbert');
    expect(bio).toEqual({
      name: 'Frank Herbert',
      bio: undefined,
      portraitUrl: undefined,
      birthDate: undefined,
      deathDate: undefined,
      topWork: undefined,
      workCount: undefined,
      subjects: [],
      sources: [],
    });
  });

  it('does not cache an empty biography', async () => {
    // Otherwise a one-minute outage blanks the author page for a week.
    routeFetch({});
    await service().getAuthorBio('Frank Herbert');
    expect(cacheService.set).not.toHaveBeenCalled();
  });

  it('caches a biography it actually found', async () => {
    routeFetch({ 'wikipedia.org/api': HERBERT_WIKI });
    await service().getAuthorBio('Frank Herbert');
    expect(cacheService.set).toHaveBeenCalledTimes(1);
  });

  it('serves the cached biography without calling out again', async () => {
    routeFetch({ 'wikipedia.org/api': HERBERT_WIKI });
    await service().getAuthorBio('Frank Herbert');
    const callsAfterFirst = (globalThis.fetch as any).mock.calls.length;

    await service().getAuthorBio('Frank Herbert');
    expect((globalThis.fetch as any).mock.calls.length).toBe(callsAfterFirst);
  });

  it('treats differently punctuated spellings as the same author', async () => {
    routeFetch({ 'wikipedia.org/api': HERBERT_WIKI });
    await service().getAuthorBio('Frank Herbert');
    const callsAfterFirst = (globalThis.fetch as any).mock.calls.length;

    await service().getAuthorBio('frank herbert.');
    expect((globalThis.fetch as any).mock.calls.length).toBe(callsAfterFirst);
  });
});

describe('getProfile', () => {
  const dune = {
    googleBooksId: 'gb-dune',
    title: 'Dune',
    authors: ['Frank Herbert'],
    categories: ['Science Fiction'],
    publishedDate: '1965',
  };
  const messiah = {
    googleBooksId: 'gb-messiah',
    title: 'Dune Messiah',
    authors: ['Frank Herbert'],
    categories: ['Science Fiction'],
    publishedDate: '1969',
  };
  const aboutHim = {
    googleBooksId: 'gb-bio',
    title: 'The Life of Frank Herbert',
    authors: ['Some Biographer'],
    categories: ['Biography'],
    publishedDate: '2003',
  };

  const ownedEntry = {
    id: 'entry-1',
    bookId: 'book-1',
    status: 'COMPLETED',
    currentPage: 10,
    isFavorite: true,
    startedAt: new Date('2024-03-01T00:00:00.000Z'),
    finishedAt: new Date('2024-03-09T00:00:00.000Z'),
    book: {
      id: 'book-1',
      googleBooksId: 'gb-dune',
      title: 'Dune',
      authors: ['Frank Herbert'],
      coverImage: 'https://example.test/dune.jpg',
      publishedDate: '1965',
      pageCount: 412,
      categories: ['Science Fiction'],
      averageRating: null,
    },
  };

  it('splits the bibliography into owned books and discovery', async () => {
    (prisma.libraryEntry.findMany as any)
      .mockResolvedValueOnce([ownedEntry]) // owned-by-author query
      .mockResolvedValueOnce([]); // shelf sample
    (bookService.searchBooks as any).mockResolvedValue({
      items: [dune, messiah, aboutHim],
      totalItems: 3,
    });

    const profile = await service().getProfile('Frank Herbert', 'user-1');

    expect(profile.booksInLibrary.map((b) => b.title)).toEqual(['Dune']);
    // Dune is already owned, and the biography is not by him.
    expect(profile.moreByAuthor.map((b) => b.title)).toEqual(['Dune Messiah']);
  });

  it('reports the reading history, folding in the reader\'s own rating', async () => {
    (prisma.libraryEntry.findMany as any)
      .mockResolvedValueOnce([ownedEntry])
      .mockResolvedValueOnce([]);
    (prisma.review.findMany as any).mockResolvedValue([{ bookId: 'book-1', rating: 4.5 }]);

    const profile = await service().getProfile('Frank Herbert', 'user-1');

    expect(profile.history.booksInLibrary).toBe(1);
    expect(profile.history.booksCompleted).toBe(1);
    // COMPLETED counts the whole book even though currentPage stalled at 10.
    expect(profile.history.pagesRead).toBe(412);
    expect(profile.history.favorites).toBe(1);
    expect(profile.history.averageRating).toBe(4.5);
    expect(profile.booksInLibrary[0].myRating).toBe(4.5);
  });

  it('flags a failed bibliography lookup instead of implying an empty one', async () => {
    (bookService.searchBooks as any).mockRejectedValue(new Error('Google Books API error: 503'));

    const profile = await service().getProfile('Frank Herbert', 'user-1');

    expect(profile.bibliographyAvailable).toBe(false);
    expect(profile.moreByAuthor).toEqual([]);
  });

  it('reports a successful lookup as available even when it found nothing', async () => {
    const profile = await service().getProfile('Frank Herbert', 'user-1');
    expect(profile.bibliographyAvailable).toBe(true);
  });

  it('surfaces related authors from the reader\'s shelf', async () => {
    (prisma.libraryEntry.findMany as any)
      .mockResolvedValueOnce([ownedEntry])
      .mockResolvedValueOnce([
        { book: { authors: ['Isaac Asimov'], categories: ['Science Fiction'] } },
        { book: { authors: ['Jane Austen'], categories: ['Romance'] } },
      ]);

    const profile = await service().getProfile('Frank Herbert', 'user-1');
    const names = profile.relatedAuthors.map((a) => a.name);

    expect(names).toContain('Isaac Asimov');
    expect(names).not.toContain('Jane Austen');
  });

  it('renders for a signed-out reader without touching their library', async () => {
    (bookService.searchBooks as any).mockResolvedValue({ items: [dune], totalItems: 1 });

    const profile = await service().getProfile('Frank Herbert');

    expect(prisma.libraryEntry.findMany).not.toHaveBeenCalled();
    expect(profile.history.booksInLibrary).toBe(0);
    expect(profile.booksInLibrary).toEqual([]);
    expect(profile.moreByAuthor.map((b) => b.title)).toEqual(['Dune']);
  });

  it('survives every external source failing at once', async () => {
    routeFetch({ 'wikipedia.org': '__throw__', 'openlibrary.org': '__throw__' });
    (bookService.searchBooks as any).mockRejectedValue(new Error('down'));
    (prisma.libraryEntry.findMany as any).mockResolvedValue([]);

    const profile = await service().getProfile('Frank Herbert', 'user-1');

    expect(profile.author.name).toBe('Frank Herbert');
    expect(profile.bibliographyAvailable).toBe(false);
  });

  it('matches a stored author name that carries a trailing period', async () => {
    (prisma.libraryEntry.findMany as any).mockResolvedValue([]);
    await service().getProfile('Frank Herbert', 'user-1');

    const where = (prisma.libraryEntry.findMany as any).mock.calls[0][0].where;
    expect(where.book.authors.hasSome).toEqual(['Frank Herbert', 'Frank Herbert.']);
  });

  it('orders the reader\'s own shelf explicitly', async () => {
    // Without an orderBy the shelf reshuffles between visits.
    (prisma.libraryEntry.findMany as any).mockResolvedValue([]);
    await service().getProfile('Frank Herbert', 'user-1');

    expect((prisma.libraryEntry.findMany as any).mock.calls[0][0].orderBy).toEqual({
      updatedAt: 'desc',
    });
  });
});
