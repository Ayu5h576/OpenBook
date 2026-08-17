/**
 * bookMediaService — collage image gathering.
 *
 * Everything here talks to third-party services with no SLA to us (Open Library,
 * Wikipedia). The property that matters is that the scrapbook page still renders
 * when any of them misbehaves, so the failure paths get as much attention as the
 * happy one.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BookMediaService, type MediaBook } from '../services/bookMediaService';
import { cacheService } from '../cache/cacheService';

const BOOK: MediaBook = {
  id: '22222222-2222-4222-8222-222222222222',
  title: 'The Left Hand of Darkness',
  authors: ['Ursula K. Le Guin'],
  coverImage: 'https://books.google.com/cover.jpg',
  isbn13: '9780441478125',
  publisher: 'Ace Books',
  publishedDate: '1969-03-01',
};

/**
 * Route stubbed responses by URL fragment; unmatched URLs 404.
 *
 * Returns `any` so it can be assigned straight to `global.fetch` without
 * satisfying the full DOM fetch signature.
 */
function stubFetch(routes: { match: string; body?: any; status?: number }[]): any {
  return vi.fn(async (url: string | URL) => {
    const href = String(url);
    const route = routes.find((r) => href.includes(r.match));

    if (!route || route.status === 404) {
      return { ok: false, status: 404, json: async () => ({}) } as any;
    }
    if (route.status && route.status >= 400) {
      return { ok: false, status: route.status, json: async () => ({}) } as any;
    }
    return { ok: true, status: 200, json: async () => route.body } as any;
  });
}

function editions(coverIds: (number[] | undefined)[]) {
  return {
    entries: coverIds.map((covers, i) => ({
      covers,
      publishers: [`Publisher ${i}`],
      publish_date: `19${70 + i}`,
    })),
  };
}

describe('BookMediaService.getBookMedia', () => {
  let service: BookMediaService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new BookMediaService();
    // Cast: getOrSet is generic and its signature won't match a plain stub.
    vi.spyOn(cacheService, 'getOrSet').mockImplementation((async (
      _key: string,
      _ttl: number,
      compute: () => Promise<any>
    ) => compute()) as any);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('leads with the local cover and adds distinct edition covers', async () => {
    global.fetch = stubFetch([
      { match: '/isbn/9780441478125.json', body: { works: [{ key: '/works/OL456W' }], covers: [11] } },
      { match: '/works/OL456W/editions.json', body: editions([[22], [33]]) },
      { match: '/works/OL456W.json', body: { authors: [{ author: { key: '/authors/OL99A' } }] } },
    ]);

    const { images } = await service.getBookMedia(BOOK);

    expect(images[0]).toMatchObject({ url: BOOK.coverImage, kind: 'cover' });
    const editionUrls = images.filter((i) => i.kind === 'edition').map((i) => i.url);
    expect(editionUrls.some((u) => u.includes('/b/id/11-'))).toBe(true);
    expect(editionUrls.some((u) => u.includes('/b/id/22-'))).toBe(true);
    expect(editionUrls.some((u) => u.includes('/b/id/33-'))).toBe(true);
  });

  it('collapses duplicate cover ids', async () => {
    global.fetch = stubFetch([
      { match: '/isbn/9780441478125.json', body: { works: [{ key: '/works/OL456W' }], covers: [11] } },
      { match: '/works/OL456W/editions.json', body: editions([[11], [11], [22], [22]]) },
      { match: '/works/OL456W.json', body: {} },
    ]);

    const { images } = await service.getBookMedia(BOOK);
    const urls = images.map((i) => i.url);

    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.filter((u) => u.includes('/b/id/11-'))).toHaveLength(1);
  });

  it('caps the collage at 12 images', async () => {
    const many = Array.from({ length: 40 }, (_, i) => [100 + i]);
    global.fetch = stubFetch([
      { match: '/isbn/9780441478125.json', body: { works: [{ key: '/works/OL456W' }], covers: [] } },
      { match: '/works/OL456W/editions.json', body: editions(many) },
      { match: '/works/OL456W.json', body: {} },
    ]);

    const { images } = await service.getBookMedia(BOOK);

    expect(images).toHaveLength(12);
  });

  it('skips editions that have no cover at all', async () => {
    global.fetch = stubFetch([
      { match: '/isbn/9780441478125.json', body: { works: [{ key: '/works/OL456W' }], covers: [] } },
      { match: '/works/OL456W/editions.json', body: editions([undefined, [], [55]]) },
      { match: '/works/OL456W.json', body: {} },
    ]);

    const { images } = await service.getBookMedia(BOOK);
    const editionUrls = images.filter((i) => i.kind === 'edition');

    expect(editionUrls).toHaveLength(1);
    expect(editionUrls[0].url).toContain('/b/id/55-');
  });

  it('requests missing covers with default=false so the client can drop 404s', async () => {
    global.fetch = stubFetch([
      { match: '/isbn/9780441478125.json', body: { works: [{ key: '/works/OL456W' }], covers: [11] } },
      { match: '/works/OL456W/editions.json', body: editions([]) },
      { match: '/works/OL456W.json', body: {} },
    ]);

    const { images } = await service.getBookMedia(BOOK);
    const edition = images.find((i) => i.kind === 'edition')!;

    expect(edition.url).toContain('default=false');
  });

  it('searches by title when the book has no ISBN', async () => {
    const fetchMock = stubFetch([
      { match: '/search.json', body: { docs: [{ key: '/works/OL789W', cover_i: 77 }] } },
      { match: '/works/OL789W/editions.json', body: editions([[88]]) },
      { match: '/works/OL789W.json', body: {} },
    ]);
    global.fetch = fetchMock;

    const { images } = await service.getBookMedia({ ...BOOK, isbn13: null, isbn10: null });

    const calls = fetchMock.mock.calls.map((c) => String(c[0]));
    expect(calls.some((u) => u.includes('/search.json'))).toBe(true);
    expect(calls.some((u) => u.includes('/isbn/'))).toBe(false);
    expect(images.some((i) => i.url.includes('/b/id/77-'))).toBe(true);
  });

  it('falls back to title search when Open Library does not know the ISBN', async () => {
    const fetchMock = stubFetch([
      { match: '/isbn/9780441478125.json', status: 404 },
      { match: '/search.json', body: { docs: [{ key: '/works/OL789W', cover_i: 77 }] } },
      { match: '/works/OL789W/editions.json', body: editions([]) },
      { match: '/works/OL789W.json', body: {} },
    ]);
    global.fetch = fetchMock;

    const { images } = await service.getBookMedia(BOOK);

    expect(images.some((i) => i.url.includes('/b/id/77-'))).toBe(true);
  });

  it('still returns the local cover when Open Library is down', async () => {
    global.fetch = stubFetch([{ match: 'openlibrary.org', status: 500 }]);

    const { images } = await service.getBookMedia(BOOK);

    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({ url: BOOK.coverImage, kind: 'cover' });
  });

  it('returns an empty collage rather than throwing when everything fails', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('network down');
    }) as any;

    const { images } = await service.getBookMedia({ ...BOOK, coverImage: null });

    expect(images).toEqual([]);
  });

  it('adds the author portrait from Open Library with a credit', async () => {
    global.fetch = stubFetch([
      { match: '/isbn/9780441478125.json', body: { works: [{ key: '/works/OL456W' }], covers: [] } },
      { match: '/works/OL456W/editions.json', body: editions([]) },
      { match: '/works/OL456W.json', body: { authors: [{ author: { key: '/authors/OL99A' } }] } },
    ]);

    const { images } = await service.getBookMedia(BOOK);
    const author = images.find((i) => i.kind === 'author')!;

    expect(author.url).toContain('/a/olid/OL99A-M.jpg');
    expect(author.sourceName).toBe('Open Library');
    expect(author.sourceUrl).toContain('/authors/OL99A');
  });

  it('falls back to Wikipedia for the portrait, carrying its attribution', async () => {
    global.fetch = stubFetch([
      { match: '/isbn/9780441478125.json', body: { works: [{ key: '/works/OL456W' }], covers: [] } },
      { match: '/works/OL456W/editions.json', body: editions([]) },
      // No author key on the work, so the Open Library portrait path yields nothing.
      { match: '/works/OL456W.json', body: {} },
      {
        match: 'wikipedia.org/api/rest_v1/page/summary',
        body: {
          originalimage: { source: 'https://upload.wikimedia.org/leguin.jpg' },
          content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Ursula_K._Le_Guin' } },
        },
      },
    ]);

    const { images } = await service.getBookMedia(BOOK);
    const author = images.find((i) => i.kind === 'author')!;

    expect(author.url).toBe('https://upload.wikimedia.org/leguin.jpg');
    expect(author.sourceName).toBe('Wikipedia');
    expect(author.sourceUrl).toContain('en.wikipedia.org/wiki/');
  });
});
