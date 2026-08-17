/**
 * Book Media Service — gathers the photos for the scrapbook page.
 *
 * Google Books only ever returns *one* cover image at various resolutions, and
 * interior page scans aren't available through any free API. Real variety comes
 * from Open Library instead: it models a *work* with many *editions*, so the
 * same book yields genuinely different covers across countries, decades and
 * reprints — which is exactly the material a scrapbook collage wants.
 *
 * Every external call here is best-effort. Open Library and Wikipedia are
 * third-party services with no SLA to us; if any of them is slow or down the
 * spread must still render, so this module never throws and always returns at
 * least the cover we already have locally.
 */
import { createHash } from 'crypto';
import { cacheService } from '../cache/cacheService';
import { bookService } from './bookService';

const OPEN_LIBRARY = 'https://openlibrary.org';
const OL_COVERS = 'https://covers.openlibrary.org';
const WIKIPEDIA_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary';

// Edition metadata is effectively immutable, so cache it hard.
const MEDIA_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FETCH_TIMEOUT_MS = 6000;
/** Enough to fill a collage without turning the page into a wall of thumbnails. */
const MAX_IMAGES = 12;
const MAX_EDITIONS = 50;

export type MediaKind = 'cover' | 'edition' | 'author';

export interface MediaImage {
  url: string;
  kind: MediaKind;
  caption?: string;
  sourceName: string;
  sourceUrl: string;
}

export interface BookMediaResult {
  images: MediaImage[];
}

export interface MediaBook {
  id: string;
  googleBooksId?: string | null;
  title: string;
  authors: string[];
  coverImage?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  publisher?: string | null;
  publishedDate?: string | null;
}

function mediaCacheKey(parts: unknown[]): string {
  const hash = createHash('sha1').update(JSON.stringify(parts)).digest('hex');
  return `media:${hash}`;
}

/**
 * GET + parse JSON, resolving to null on any failure (network, timeout, non-2xx,
 * malformed body). Callers treat a null as "this source had nothing".
 */
async function fetchJson<T = any>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        Accept: 'application/json',
        // Wikimedia's API policy asks for an identifying User-Agent.
        'User-Agent': 'openbook-app (book metadata enrichment)',
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * `default=false` makes a missing cover 404 instead of serving Open Library's
 * blank placeholder, so the client can drop the image instead of pasting an
 * empty grey rectangle into the collage.
 */
function coverUrl(coverId: number | string, size: 'M' | 'L' = 'L'): string {
  return `${OL_COVERS}/b/id/${coverId}-${size}.jpg?default=false`;
}

function authorPhotoUrl(olid: string): string {
  return `${OL_COVERS}/a/olid/${olid}-M.jpg?default=false`;
}

/** "/works/OL123W" -> "OL123W" */
function olKeyToId(key?: string): string | undefined {
  if (!key) return undefined;
  const parts = key.split('/').filter(Boolean);
  return parts[parts.length - 1] || undefined;
}

interface EditionEntry {
  covers?: number[];
  title?: string;
  publish_date?: string;
  publishers?: string[];
}

/** Resolve the Open Library work key for a book, by ISBN when we have one. */
async function resolveWorkKey(book: MediaBook): Promise<{ workId?: string; coverIds: number[] }> {
  const isbn = book.isbn13 ?? book.isbn10;

  if (isbn) {
    // This endpoint 302s to /books/OL…M.json; fetch follows redirects by default.
    const edition = await fetchJson<{ works?: { key: string }[]; covers?: number[] }>(
      `${OPEN_LIBRARY}/isbn/${encodeURIComponent(isbn)}.json`
    );
    if (edition) {
      return {
        workId: olKeyToId(edition.works?.[0]?.key),
        coverIds: edition.covers?.filter((id) => id > 0) ?? [],
      };
    }
  }

  // No ISBN, or the ISBN is unknown to Open Library — fall back to title search.
  const params = new URLSearchParams({
    title: book.title,
    fields: 'key,cover_i',
    limit: '1',
  });
  if (book.authors?.[0]) params.set('author', book.authors[0]);

  const search = await fetchJson<{ docs?: { key?: string; cover_i?: number }[] }>(
    `${OPEN_LIBRARY}/search.json?${params}`
  );
  const doc = search?.docs?.[0];

  return {
    workId: olKeyToId(doc?.key),
    coverIds: doc?.cover_i ? [doc.cover_i] : [],
  };
}

/** Distinct edition covers for a work, newest-looking captions attached. */
async function fetchEditionCovers(workId: string): Promise<MediaImage[]> {
  const data = await fetchJson<{ entries?: EditionEntry[] }>(
    `${OPEN_LIBRARY}/works/${encodeURIComponent(workId)}/editions.json?limit=${MAX_EDITIONS}`
  );
  if (!data?.entries?.length) return [];

  const seen = new Set<number>();
  const images: MediaImage[] = [];

  for (const entry of data.entries) {
    const coverId = entry.covers?.find((id) => id > 0);
    if (!coverId || seen.has(coverId)) continue;
    seen.add(coverId);

    const captionParts = [entry.publishers?.[0], entry.publish_date].filter(Boolean);

    images.push({
      url: coverUrl(coverId),
      kind: 'edition',
      caption: captionParts.length ? captionParts.join(' · ') : undefined,
      sourceName: 'Open Library',
      sourceUrl: `${OPEN_LIBRARY}/works/${workId}`,
    });
  }

  return images;
}

/**
 * Author portrait: Open Library first (same request chain, same licence story),
 * then Wikipedia. Wikipedia images are CC-licensed, so the credit carried on the
 * returned object has to be rendered by the UI.
 */
async function fetchAuthorPortrait(
  workId: string | undefined,
  authorName: string | undefined
): Promise<MediaImage | null> {
  if (workId) {
    const work = await fetchJson<{ authors?: { author?: { key?: string } }[] }>(
      `${OPEN_LIBRARY}/works/${encodeURIComponent(workId)}.json`
    );
    const authorOlid = olKeyToId(work?.authors?.[0]?.author?.key);
    if (authorOlid) {
      return {
        url: authorPhotoUrl(authorOlid),
        kind: 'author',
        caption: authorName,
        sourceName: 'Open Library',
        sourceUrl: `${OPEN_LIBRARY}/authors/${authorOlid}`,
      };
    }
  }

  if (authorName) {
    const summary = await fetchJson<{
      originalimage?: { source?: string };
      thumbnail?: { source?: string };
      content_urls?: { desktop?: { page?: string } };
    }>(`${WIKIPEDIA_SUMMARY}/${encodeURIComponent(authorName.replace(/\s+/g, '_'))}`);

    const url = summary?.originalimage?.source ?? summary?.thumbnail?.source;
    if (url) {
      return {
        url,
        kind: 'author',
        caption: authorName,
        sourceName: 'Wikipedia',
        sourceUrl:
          summary?.content_urls?.desktop?.page ??
          `https://en.wikipedia.org/wiki/${encodeURIComponent(authorName.replace(/\s+/g, '_'))}`,
      };
    }
  }

  return null;
}

/**
 * Sharpest version of the book's own cover.
 *
 * The URL stored on the Book row is the Google Books *thumbnail*, which looks
 * soft as the collage's hero photo. The volume record often carries larger
 * links, and that lookup is already cached for a week, so it's worth asking.
 */
async function bestLocalCover(book: MediaBook): Promise<string | undefined> {
  if (book.googleBooksId) {
    try {
      const volume = await bookService.getGoogleBook(book.googleBooksId);
      if (volume.largeCoverImage) return volume.largeCoverImage;
    } catch (err) {
      console.error(`[BookMediaService] cover upgrade failed for ${book.id}:`, err);
    }
  }
  return book.coverImage ?? undefined;
}

export class BookMediaService {
  async getBookMedia(book: MediaBook): Promise<BookMediaResult> {
    return cacheService.getOrSet(mediaCacheKey([book.id]), MEDIA_TTL_MS, async () => {
      const images: MediaImage[] = [];
      const seenUrls = new Set<string>();

      const push = (image: MediaImage | null) => {
        if (!image || seenUrls.has(image.url) || images.length >= MAX_IMAGES) return;
        seenUrls.add(image.url);
        images.push(image);
      };

      // The local cover always leads — it is the one image guaranteed to load.
      const coverUrlForHero = await bestLocalCover(book);
      if (coverUrlForHero) {
        const captionParts = [book.publisher, book.publishedDate?.substring(0, 4)].filter(Boolean);
        push({
          url: coverUrlForHero,
          kind: 'cover',
          caption: captionParts.length ? captionParts.join(' · ') : book.title,
          sourceName: 'Google Books',
          sourceUrl: 'https://books.google.com',
        });
      }

      let workId: string | undefined;

      try {
        const resolved = await resolveWorkKey(book);
        workId = resolved.workId;

        for (const coverId of resolved.coverIds) {
          push({
            url: coverUrl(coverId),
            kind: 'edition',
            sourceName: 'Open Library',
            sourceUrl: workId ? `${OPEN_LIBRARY}/works/${workId}` : OPEN_LIBRARY,
          });
        }

        if (workId) {
          for (const image of await fetchEditionCovers(workId)) push(image);
        }
      } catch (err) {
        console.error(`[BookMediaService] Open Library lookup failed for ${book.id}:`, err);
      }

      try {
        push(await fetchAuthorPortrait(workId, book.authors?.[0]));
      } catch (err) {
        console.error(`[BookMediaService] author portrait failed for ${book.id}:`, err);
      }

      return { images };
    });
  }
}

export const bookMediaService = new BookMediaService();
