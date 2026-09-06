/**
 * Author Service — assembles everything the author page shows.
 *
 * Five things come together here, from three very different sources:
 *   1. who the author is       → Wikipedia + Open Library (external, best-effort)
 *   2. their bibliography      → Google Books `inauthor:` (external, cached)
 *   3. what the reader owns    → our own database (authoritative)
 *   4. the reader's history    → our own database (authoritative)
 *   5. adjacent authors        → the reader's own shelf (local, explainable)
 *
 * Only (3) and (4) are facts we own; the rest are other people's data and may be
 * missing, slow, or wrong. So every external call is best-effort and this module
 * **never throws** — the same contract `bookMediaService` keeps. A Wikipedia
 * outage costs the page its biography paragraph, not the page.
 *
 * Nothing about an author is ever synthesized. If no source describes them, the
 * page says so; it does not invent a life. This is the same rule the purchase
 * page follows for prices, for the same reason: a plausible-looking fabricated
 * fact is worse than a visible gap.
 */
import { createHash } from 'crypto';
import { prisma } from '../config/prisma';
import { cacheService } from '../cache/cacheService';
import { bookService } from './bookService';
import {
  authorKey,
  dedupeByTitle,
  filterByAuthor,
  normalizeAuthorName,
  parseAuthorParam,
  relatedAuthorsFrom,
  splitOwned,
  summarizeAuthorHistory,
  type AuthorHistory,
  type AuthorHistoryEntry,
  type RelatedAuthor,
} from './authorProfile';

const OPEN_LIBRARY = 'https://openlibrary.org';
const OL_COVERS = 'https://covers.openlibrary.org';
const WIKIPEDIA_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary';

/** Biographies do not change; cache them as hard as edition metadata. */
const BIO_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const FETCH_TIMEOUT_MS = 6000;
/** Google Books' per-request ceiling. */
const BIBLIOGRAPHY_MAX = 40;
/** Enough of the reader's shelf to find neighbours without scanning a library. */
const SHELF_SAMPLE = 200;

export interface AuthorSource {
  name: string;
  url: string;
}

export interface AuthorBio {
  name: string;
  /** Encyclopedia summary. Absent when no source had one — never invented. */
  bio?: string;
  portraitUrl?: string;
  birthDate?: string;
  deathDate?: string;
  topWork?: string;
  workCount?: number;
  subjects: string[];
  /** Attribution for the CC-licensed text and images above; render them. */
  sources: AuthorSource[];
}

export interface AuthorBook {
  /** Local Book id — present only for books already in our database. */
  id?: string;
  googleBooksId?: string;
  title: string;
  authors: string[];
  coverImage?: string;
  publishedDate?: string;
  pageCount?: number;
  categories: string[];
  averageRating?: number;
  // ─ Reader state, present only for books in this reader's library ─
  entryId?: string;
  status?: string;
  currentPage?: number;
  isFavorite?: boolean;
  myRating?: number;
}

export interface AuthorProfile {
  author: AuthorBio;
  history: AuthorHistory;
  /** The reader's own copies, richest first-class objects on the page. */
  booksInLibrary: AuthorBook[];
  /** The rest of the bibliography, for discovery. */
  moreByAuthor: AuthorBook[];
  relatedAuthors: RelatedAuthor[];
  genres: string[];
  /** True when Google Books answered; false means the "more by" rail is unknown, not empty. */
  bibliographyAvailable: boolean;
}

function authorCacheKey(kind: string, parts: unknown[]): string {
  const hash = createHash('sha1').update(JSON.stringify(parts)).digest('hex');
  return `author:${kind}:${hash}`;
}

/** GET + parse JSON, resolving to null on any failure. */
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

interface WikiSummary {
  type?: string;
  title?: string;
  description?: string;
  extract?: string;
  originalimage?: { source?: string };
  thumbnail?: { source?: string };
  content_urls?: { desktop?: { page?: string } };
}

/**
 * Wikipedia's summary for an author.
 *
 * The summary endpoint resolves a *title*, not a person, so it will happily
 * return the article for a band, a town, or a disambiguation list when the name
 * is shared. Two guards keep a stranger's biography off the page: the article
 * must be a normal one (`type: 'standard'` — this rejects disambiguation pages),
 * and its text must actually mention the author's last name. A wrong biography
 * is far worse than none, and there is no way to tell them apart downstream.
 */
async function fetchWikipediaAuthor(name: string): Promise<Partial<AuthorBio> | null> {
  const title = encodeURIComponent(name.replace(/\s+/g, '_'));
  const summary = await fetchJson<WikiSummary>(`${WIKIPEDIA_SUMMARY}/${title}`);
  if (!summary || summary.type !== 'standard') return null;

  const extract = summary.extract?.trim();
  if (!extract) return null;

  const surname = name.split(' ').filter(Boolean).pop()?.toLowerCase();
  if (surname && !extract.toLowerCase().includes(surname)) return null;

  const page =
    summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${title}`;

  return {
    bio: extract,
    portraitUrl: summary.originalimage?.source ?? summary.thumbnail?.source,
    sources: [{ name: 'Wikipedia', url: page }],
  };
}

interface OLAuthorDoc {
  key?: string;
  name?: string;
  birth_date?: string;
  death_date?: string;
  top_work?: string;
  work_count?: number;
  top_subjects?: string[];
}

/**
 * Open Library's author record: dates, work count, and the subjects they are
 * shelved under.
 *
 * Their author search is fuzzy and ranks by popularity, so the top hit for a
 * lesser-known writer is often a more famous one with a similar name. Only an
 * exact name match is accepted.
 */
async function fetchOpenLibraryAuthor(name: string): Promise<Partial<AuthorBio> | null> {
  const data = await fetchJson<{ docs?: OLAuthorDoc[] }>(
    `${OPEN_LIBRARY}/search/authors.json?q=${encodeURIComponent(name)}`
  );

  const key = authorKey(name);
  const doc = (data?.docs ?? []).find((d) => d.name && authorKey(d.name) === key);
  if (!doc?.key) return null;

  return {
    birthDate: doc.birth_date,
    deathDate: doc.death_date,
    topWork: doc.top_work,
    workCount: doc.work_count,
    subjects: doc.top_subjects ?? [],
    // `default=false` makes a missing portrait 404 instead of serving a blank
    // grey avatar, so the client can fall back to initials.
    portraitUrl: `${OL_COVERS}/a/olid/${doc.key}-M.jpg?default=false`,
    sources: [{ name: 'Open Library', url: `${OPEN_LIBRARY}/authors/${doc.key}` }],
  };
}

export class AuthorService {
  /**
   * Turn an `/author/:id` path segment into an author name.
   *
   * Legacy `auth-<uuid>` links point at a *book*; the author is whoever that
   * book's first author is. Resolving them here keeps every link already
   * rendered in the app working after the switch to name-based ids.
   */
  async resolveAuthorName(param: string): Promise<string | null> {
    const ref = parseAuthorParam(param);
    if (!ref) return null;
    if (ref.kind === 'name') return ref.name;

    const book = await prisma.book.findUnique({
      where: { id: ref.bookId },
      select: { authors: true },
    });
    const first = book?.authors?.[0];
    return first ? normalizeAuthorName(first) : null;
  }

  /**
   * Who this author is, merged from Wikipedia (prose + portrait) and Open
   * Library (dates, subjects, portrait fallback).
   */
  async getAuthorBio(rawName: string): Promise<AuthorBio> {
    const name = normalizeAuthorName(rawName);
    const cacheKey = authorCacheKey('bio', [authorKey(name)]);

    const cached = await cacheService.get<AuthorBio>(cacheKey);
    if (cached) return cached;

    let wiki: Partial<AuthorBio> | null = null;
    let openLibrary: Partial<AuthorBio> | null = null;

    try {
      [wiki, openLibrary] = await Promise.all([
        fetchWikipediaAuthor(name),
        fetchOpenLibraryAuthor(name),
      ]);
    } catch (err) {
      console.error(`[AuthorService] biography lookup failed for "${name}":`, err);
    }

    const bio: AuthorBio = {
      name,
      bio: wiki?.bio,
      // Wikipedia portraits are real photographs; Open Library's are a fallback.
      portraitUrl: wiki?.portraitUrl ?? openLibrary?.portraitUrl,
      birthDate: openLibrary?.birthDate,
      deathDate: openLibrary?.deathDate,
      topWork: openLibrary?.topWork,
      workCount: openLibrary?.workCount,
      subjects: openLibrary?.subjects ?? [],
      sources: [...(wiki?.sources ?? []), ...(openLibrary?.sources ?? [])],
    };

    // Only cache a biography that actually found something. Caching an empty
    // result would turn a one-minute Wikipedia outage into a week of blank
    // author pages.
    if (bio.bio || bio.portraitUrl || bio.workCount) {
      await cacheService.set(cacheKey, bio, BIO_TTL_MS);
    }

    return bio;
  }

  /**
   * The reader's own books by this author, with their reading state.
   *
   * Matched on the stored `authors` array, which is exact and case-sensitive in
   * Postgres. Names reach us from a book's own author list (a click-through) or
   * from a URL, so a stray trailing period is the one realistic mismatch —
   * hence the variant list rather than a full-library scan.
   */
  private async getOwnedBooks(userId: string, name: string) {
    const variants = [...new Set([name, `${name}.`])];

    const entries = await prisma.libraryEntry.findMany({
      where: { userId, book: { authors: { hasSome: variants } } },
      select: {
        id: true,
        bookId: true,
        status: true,
        currentPage: true,
        isFavorite: true,
        startedAt: true,
        finishedAt: true,
        book: {
          select: {
            id: true,
            googleBooksId: true,
            title: true,
            authors: true,
            coverImage: true,
            publishedDate: true,
            pageCount: true,
            categories: true,
            averageRating: true,
          },
        },
      },
      // Most recently touched first, so the book they are actually reading leads
      // the shelf. Without an explicit order Postgres returns whatever the plan
      // produced, which reshuffles between visits.
      orderBy: { updatedAt: 'desc' },
    });

    if (entries.length === 0) return { entries, ratingByBook: new Map<string, number>() };

    // One batched query rather than a review lookup per book.
    const reviews = await prisma.review.findMany({
      where: { userId, bookId: { in: entries.map((e) => e.bookId) } },
      select: { bookId: true, rating: true },
    });

    return {
      entries,
      // Prisma returns Decimal for `rating`; Number() is how the rest of the
      // app coerces it before arithmetic.
      ratingByBook: new Map(reviews.map((r) => [r.bookId, Number(r.rating)])),
    };
  }

  /** Books by other authors the reader owns, used to find adjacent writers. */
  private async getShelfSample(userId: string) {
    return prisma.libraryEntry.findMany({
      where: { userId },
      select: { book: { select: { authors: true, categories: true } } },
      // `updatedAt` rather than `lastReadAt`: the latter is null for anything
      // never opened, and Postgres sorts nulls first on DESC, which would fill
      // the sample with untouched books.
      orderBy: { updatedAt: 'desc' },
      take: SHELF_SAMPLE,
    });
  }

  /**
   * The author's published works, from Google Books.
   *
   * Returns null (not an empty list) when the lookup fails, so the page can say
   * "couldn't load" instead of implying the author wrote nothing.
   */
  private async getBibliography(name: string): Promise<AuthorBook[] | null> {
    try {
      const { items } = await bookService.searchBooks(name, 'author', 0, BIBLIOGRAPHY_MAX);
      const own = filterByAuthor(items, name);

      return dedupeByTitle(own).map((volume) => ({
        googleBooksId: volume.googleBooksId,
        title: volume.title,
        authors: volume.authors,
        coverImage: volume.coverImage,
        publishedDate: volume.publishedDate,
        pageCount: volume.pageCount,
        categories: volume.categories,
        averageRating: volume.averageRating,
      }));
    } catch (err) {
      console.error(`[AuthorService] bibliography lookup failed for "${name}":`, err);
      return null;
    }
  }

  /**
   * The whole author page.
   *
   * `userId` is optional: signed out, the page still shows who the author is
   * and what they wrote — it just has no reading history to report.
   */
  async getProfile(rawName: string, userId?: string): Promise<AuthorProfile> {
    const name = normalizeAuthorName(rawName);

    const [author, bibliography, owned, shelf] = await Promise.all([
      this.getAuthorBio(name),
      this.getBibliography(name),
      userId ? this.getOwnedBooks(userId, name) : null,
      userId ? this.getShelfSample(userId) : null,
    ]);

    const entries = owned?.entries ?? [];
    const ratingByBook = owned?.ratingByBook ?? new Map<string, number>();

    const booksInLibrary: AuthorBook[] = entries.map((entry) => ({
      id: entry.book.id,
      googleBooksId: entry.book.googleBooksId ?? undefined,
      title: entry.book.title,
      authors: entry.book.authors,
      coverImage: entry.book.coverImage ?? undefined,
      publishedDate: entry.book.publishedDate ?? undefined,
      pageCount: entry.book.pageCount ?? undefined,
      categories: entry.book.categories,
      averageRating:
        entry.book.averageRating === null ? undefined : Number(entry.book.averageRating),
      entryId: entry.id,
      status: entry.status,
      currentPage: entry.currentPage,
      isFavorite: entry.isFavorite,
      myRating: ratingByBook.get(entry.bookId),
    }));

    const historyEntries: AuthorHistoryEntry[] = entries.map((entry) => ({
      status: entry.status,
      currentPage: entry.currentPage,
      pageCount: entry.book.pageCount,
      isFavorite: entry.isFavorite,
      startedAt: entry.startedAt,
      finishedAt: entry.finishedAt,
      rating: ratingByBook.get(entry.bookId) ?? null,
    }));

    // Drop the books the reader already owns from the discovery rail — seeing
    // your own book offered as something new to try reads as a bug.
    const ownedTitles = booksInLibrary.map((b) => b.title);
    const moreByAuthor = bibliography ? splitOwned(bibliography, ownedTitles).more : [];

    // Genres come from the reader's own copies first (they describe the books
    // that are actually here), then the wider bibliography, then Open Library.
    const genres = [
      ...new Set([
        ...booksInLibrary.flatMap((b) => b.categories),
        ...(bibliography ?? []).flatMap((b) => b.categories),
        ...author.subjects,
      ]),
    ].slice(0, 12);

    const relatedAuthors = relatedAuthorsFrom(
      name,
      genres,
      (shelf ?? []).map((entry) => entry.book)
    );

    return {
      author,
      history: summarizeAuthorHistory(historyEntries),
      booksInLibrary,
      moreByAuthor,
      relatedAuthors,
      genres,
      bibliographyAvailable: bibliography !== null,
    };
  }
}

export const authorService = new AuthorService();
