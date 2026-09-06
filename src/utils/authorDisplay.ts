/**
 * Pure display logic for the author page.
 *
 * Kept out of the component so the rules that matter — never printing a date
 * we don't have, never linking a title that isn't on the page — can be tested
 * without mounting React.
 */
import type { AuthorBio, AuthorBook, AuthorHistory } from '../services/api';

const STATUS_LABEL: Record<string, string> = {
  READING: 'Reading',
  COMPLETED: 'Finished',
  PAUSED: 'Paused',
  DROPPED: 'Set aside',
  ARCHIVED: 'Archived',
  OWNED: 'On the shelf',
};

/** The reader-facing name for a library status, or the raw value if it's new. */
export function statusLabel(status?: string | null): string | null {
  if (!status) return null;
  return STATUS_LABEL[status] ?? status;
}

/**
 * "1920 – 1986", "b. 1920", "d. 1986", or null.
 *
 * Open Library's dates are free text ("8 October 1920", "1920?", "c. 1920"), so
 * only a four-digit year is trusted; anything else prints nothing rather than a
 * half-parsed date.
 */
export function lifespan(author: Pick<AuthorBio, 'birthDate' | 'deathDate'>): string | null {
  const year = (value?: string) => value?.match(/\b(\d{4})\b/)?.[1] ?? null;
  const born = year(author.birthDate);
  const died = year(author.deathDate);
  if (born && died) return `${born} – ${died}`;
  if (born) return `b. ${born}`;
  if (died) return `d. ${died}`;
  return null;
}

/** How far through a book the reader is, or null when there's nothing to show. */
export function progressPercent(currentPage?: number | null, pageCount?: number | null): number | null {
  if (!currentPage || !pageCount || pageCount <= 0) return null;
  return Math.min(100, Math.round((currentPage / pageCount) * 100));
}

/**
 * Find the book a title refers to, case- and whitespace-insensitively.
 *
 * The AI's "start with" pick arrives as a title. The server already drops picks
 * that aren't in the bibliography, but the click still has to resolve to a book
 * id — and returning undefined (rather than navigating hopefully) is what keeps
 * a mismatch from landing the reader on a 404.
 */
export function findBookByTitle(books: AuthorBook[], title: string): AuthorBook | undefined {
  const key = title.trim().toLowerCase();
  if (!key) return undefined;
  return books.find((book) => book.title.trim().toLowerCase() === key);
}

/** Where a book card should navigate, or null when we have no id for it. */
export function bookTarget(book: AuthorBook): string | null {
  return book.id ?? book.googleBooksId ?? null;
}

export interface HistoryStat {
  label: string;
  value: string;
}

/**
 * The "You and <author>" strip.
 *
 * Zero-valued optional stats are omitted rather than shown as 0 — "Favourites 0"
 * reads as a judgement, and the three core counts already carry the shape of the
 * relationship.
 */
export function historyStats(history: AuthorHistory): HistoryStat[] {
  const stats: HistoryStat[] = [
    { label: 'In your library', value: String(history.booksInLibrary) },
    { label: 'Finished', value: String(history.booksCompleted) },
    { label: 'Pages read', value: history.pagesRead.toLocaleString() },
  ];
  if (history.booksReading > 0) stats.push({ label: 'Reading now', value: String(history.booksReading) });
  if (history.favorites > 0) stats.push({ label: 'Favourites', value: String(history.favorites) });
  if (history.averageRating !== null && history.ratedCount > 0) {
    stats.push({ label: `Your rating (${history.ratedCount})`, value: history.averageRating.toFixed(1) });
  }
  return stats;
}
