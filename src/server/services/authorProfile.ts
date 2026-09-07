/**
 * Author identity + reading-history math.
 *
 * OpenBook has no `Author` table — a book carries `authors String[]`, and that is
 * the only author fact the database holds. So an author is identified *by name*,
 * which is also the key every upstream source (Google Books `inauthor:`, Open
 * Library `/search/authors`, Wikipedia) actually accepts. The alternative — a
 * synthetic author row — would have to be reconciled against those same names on
 * every lookup anyway, and would still not survive a book being re-imported.
 *
 * The legacy `auth-<uuid>` ids minted by `bookMapper` are a book id wearing an
 * author prefix (two books by one author produced two different "authors"), so
 * they cannot identify anyone. `parseAuthorParam` recognises them and reports
 * them as a book id for the caller to resolve into a name, which keeps every
 * link already rendered in the wild working.
 *
 * Everything here is pure so the rules stay testable without a database.
 */

/** How an `/author/:id` path segment was interpreted. */
export type AuthorRef =
  | { kind: 'name'; name: string }
  | { kind: 'legacy-book'; bookId: string };

const LEGACY_PREFIX = 'auth-';
/** RFC 4122 shape; the legacy ids embed a Book uuid. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Collapse whitespace and drop the trailing punctuation Google Books likes to
 * attach ("Frank Herbert." / "Herbert, Frank"), so the same human resolves to
 * one cache key no matter which record introduced them.
 */
export function normalizeAuthorName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;]+$/, '');
}

/** Case-insensitive identity for matching and de-duping author names. */
export function authorKey(raw: string): string {
  return normalizeAuthorName(raw).toLowerCase();
}

/**
 * Interpret an `/author/:id` segment.
 *
 * A `auth-<uuid>` segment is a legacy book-scoped id; anything else is treated
 * as the author's name (the router hands it over already percent-decoded).
 */
export function parseAuthorParam(param: string): AuthorRef | null {
  const value = (param ?? '').trim();
  if (!value) return null;

  if (value.toLowerCase().startsWith(LEGACY_PREFIX)) {
    const rest = value.slice(LEGACY_PREFIX.length);
    if (UUID_RE.test(rest)) return { kind: 'legacy-book', bookId: rest };
    // `auth-donnatartt` and friends from the demo data: not a uuid, and not a
    // usable name either — a slug cannot be turned back into "Donna Tartt".
    return null;
  }

  const name = normalizeAuthorName(value);
  return name ? { kind: 'name', name } : null;
}

/** The `/author/:id` segment for a name, safe to drop straight into a path. */
export function authorPathParam(name: string): string {
  return encodeURIComponent(normalizeAuthorName(name));
}

// ─── Reading history ──────────────────────────────────────────────────────────

/** One of the reader's library entries for a book by this author. */
export interface AuthorHistoryEntry {
  status: string;
  currentPage?: number | null;
  pageCount?: number | null;
  isFavorite?: boolean | null;
  finishedAt?: string | Date | null;
  startedAt?: string | Date | null;
  /** The reader's own rating, when they left a review. */
  rating?: number | null;
}

export interface AuthorHistory {
  booksInLibrary: number;
  booksCompleted: number;
  booksReading: number;
  /** Pages actually turned — completed books count their full length. */
  pagesRead: number;
  favorites: number;
  /** The reader's mean rating across the books of this author they rated. */
  averageRating: number | null;
  ratedCount: number;
  firstReadAt: string | null;
  lastReadAt: string | null;
}

function toTime(value?: string | Date | null): number | null {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

/**
 * Aggregate the reader's own history with one author.
 *
 * A COMPLETED entry counts its whole page count even when `currentPage` was
 * never advanced to the last page — readers routinely finish a book without the
 * reader view catching up, and reporting "412 of 604 pages" for a book they
 * marked finished reads as a bug. Anything else counts pages actually turned.
 */
export function summarizeAuthorHistory(entries: AuthorHistoryEntry[]): AuthorHistory {
  let booksCompleted = 0;
  let booksReading = 0;
  let pagesRead = 0;
  let favorites = 0;
  let ratingSum = 0;
  let ratedCount = 0;
  let first: number | null = null;
  let last: number | null = null;

  for (const entry of entries) {
    const status = (entry.status ?? '').toUpperCase();
    const pageCount = entry.pageCount ?? 0;
    const currentPage = entry.currentPage ?? 0;

    if (status === 'COMPLETED') {
      booksCompleted += 1;
      pagesRead += Math.max(pageCount, currentPage);
    } else {
      if (status === 'READING') booksReading += 1;
      // Guard against a currentPage past the end (page counts differ per edition).
      pagesRead += pageCount > 0 ? Math.min(currentPage, pageCount) : currentPage;
    }

    if (entry.isFavorite) favorites += 1;

    if (typeof entry.rating === 'number' && !Number.isNaN(entry.rating)) {
      ratingSum += entry.rating;
      ratedCount += 1;
    }

    for (const stamp of [toTime(entry.startedAt), toTime(entry.finishedAt)]) {
      if (stamp === null) continue;
      if (first === null || stamp < first) first = stamp;
      if (last === null || stamp > last) last = stamp;
    }
  }

  return {
    booksInLibrary: entries.length,
    booksCompleted,
    booksReading,
    pagesRead,
    favorites,
    // Rounded to one decimal: "4.7" is the shape the rest of the app shows.
    averageRating: ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 10) / 10 : null,
    ratedCount,
    firstReadAt: first === null ? null : new Date(first).toISOString(),
    lastReadAt: last === null ? null : new Date(last).toISOString(),
  };
}

// ─── Bibliography ─────────────────────────────────────────────────────────────

export interface BibliographyBook {
  id?: string | null;
  googleBooksId?: string | null;
  title: string;
  authors?: string[] | null;
  coverImage?: string | null;
  publishedDate?: string | null;
  pageCount?: number | null;
  averageRating?: number | null;
  categories?: string[] | null;
}

/** Year as a number for sorting, or null when the date is missing/unparseable. */
export function publishedYear(date?: string | null): number | null {
  if (!date) return null;
  const match = /\d{4}/.exec(date);
  if (!match) return null;
  const year = Number(match[0]);
  return year >= 1000 && year <= 2999 ? year : null;
}

/**
 * Books actually written by this author, newest first.
 *
 * Google Books' `inauthor:` is a fuzzy match: a search for one author returns
 * anthologies, "introduction by" reprints, and books about them. Requiring the
 * name to appear in the volume's own author list is what keeps a bibliography
 * from filling with books the author did not write.
 */
export function filterByAuthor<T extends BibliographyBook>(books: T[], name: string): T[] {
  const key = authorKey(name);
  return books.filter((book) => (book.authors ?? []).some((a) => authorKey(a) === key));
}

/**
 * One entry per work, newest first, undated titles last.
 *
 * Google Books returns *editions* in relevance order, so the same work arrives
 * several times with different years. Keeping whichever copy happened to come
 * first would date Dune to a 2021 reprint; the earliest year is the work's own
 * publication date, which is what a bibliography means.
 */
export function dedupeByTitle<T extends BibliographyBook>(books: T[]): T[] {
  const bestByTitle = new Map<string, T>();

  for (const book of books) {
    const key = book.title.trim().toLowerCase();
    if (!key) continue;

    const held = bestByTitle.get(key);
    if (!held) {
      bestByTitle.set(key, book);
      continue;
    }

    const heldYear = publishedYear(held.publishedDate);
    const year = publishedYear(book.publishedDate);
    // A dated edition beats an undated one; between two dated ones the earlier
    // year is the original.
    if (year !== null && (heldYear === null || year < heldYear)) bestByTitle.set(key, book);
  }

  return [...bestByTitle.values()].sort((a, b) => {
    const yearA = publishedYear(a.publishedDate);
    const yearB = publishedYear(b.publishedDate);
    if (yearA === yearB) return a.title.localeCompare(b.title);
    if (yearA === null) return 1;
    if (yearB === null) return -1;
    return yearB - yearA;
  });
}

/**
 * Split a bibliography into the books the reader already owns and the rest.
 *
 * Matching is by title because the two lists come from different sources: the
 * owned side is a local Book row, the discovery side a Google volume, and the
 * same book carries different ids in each.
 */
export function splitOwned<T extends BibliographyBook>(
  all: T[],
  ownedTitles: string[]
): { owned: T[]; more: T[] } {
  const owned = new Set(ownedTitles.map((t) => t.trim().toLowerCase()));
  const inLibrary: T[] = [];
  const more: T[] = [];

  for (const book of all) {
    (owned.has(book.title.trim().toLowerCase()) ? inLibrary : more).push(book);
  }

  return { owned: inLibrary, more };
}

// ─── Related authors ──────────────────────────────────────────────────────────

export interface RelatedAuthor {
  name: string;
  /** Why this author surfaced — shown under the name, never invented. */
  reason: string;
  sharedGenres: string[];
  /** How many of the reader's own books support the link. */
  weight: number;
}

export interface RelatedSourceBook {
  authors?: string[] | null;
  categories?: string[] | null;
}

/**
 * Authors adjacent to this one, drawn from the reader's own shelf.
 *
 * Ranked by how many genres they share with the subject's books, then by how
 * often the reader has picked them up. This is a *local* signal on purpose: it
 * explains itself ("you both read them in Science Fiction") and needs no
 * external call, so the section renders even when Open Library is down.
 */
export function relatedAuthorsFrom(
  subject: string,
  subjectGenres: string[],
  shelf: RelatedSourceBook[],
  limit = 6
): RelatedAuthor[] {
  const subjectKey = authorKey(subject);
  const genres = new Set(subjectGenres.map((g) => g.toLowerCase()));

  const byAuthor = new Map<string, { name: string; shared: Set<string>; count: number }>();

  for (const book of shelf) {
    const shared = (book.categories ?? []).filter((c) => genres.has(c.toLowerCase()));

    for (const raw of book.authors ?? []) {
      const key = authorKey(raw);
      if (!key || key === subjectKey) continue;

      const entry = byAuthor.get(key) ?? { name: normalizeAuthorName(raw), shared: new Set(), count: 0 };
      entry.count += 1;
      for (const genre of shared) entry.shared.add(genre);
      byAuthor.set(key, entry);
    }
  }

  return [...byAuthor.values()]
    .filter((entry) => entry.shared.size > 0)
    .sort((a, b) => b.shared.size - a.shared.size || b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((entry) => {
      const sharedGenres = [...entry.shared];
      return {
        name: entry.name,
        sharedGenres,
        weight: entry.count,
        reason: `Also on your shelf in ${sharedGenres.slice(0, 2).join(' and ')}`,
      };
    });
}
