/**
 * Author page display logic.
 *
 * These are the rules that decide what the reader is told about someone else's
 * life and work, so the interesting cases are all about *not* printing things:
 * a half-parsed date, a status we don't recognise, a link to a book that isn't
 * on the page.
 */
import { describe, it, expect } from 'vitest';
import {
  lifespan,
  statusLabel,
  progressPercent,
  findBookByTitle,
  bookTarget,
  historyStats,
} from '../authorDisplay';
import type { AuthorBook, AuthorHistory } from '../../services/api';

const book = (over: Partial<AuthorBook> = {}): AuthorBook => ({
  title: 'Dune',
  authors: ['Frank Herbert'],
  categories: [],
  ...over,
});

const history = (over: Partial<AuthorHistory> = {}): AuthorHistory => ({
  booksInLibrary: 3,
  booksCompleted: 2,
  booksReading: 0,
  pagesRead: 1234,
  favorites: 0,
  averageRating: null,
  ratedCount: 0,
  firstReadAt: null,
  lastReadAt: null,
  ...over,
});

describe('lifespan', () => {
  it('prints a full span when both dates are known', () => {
    expect(lifespan({ birthDate: '8 October 1920', deathDate: '11 February 1986' })).toBe('1920 – 1986');
  });

  it('prints a birth year alone for a living author', () => {
    expect(lifespan({ birthDate: '1947' })).toBe('b. 1947');
  });

  it('prints a death year alone when the birth is unknown', () => {
    expect(lifespan({ deathDate: '1986' })).toBe('d. 1986');
  });

  it('returns nothing when neither date is known', () => {
    expect(lifespan({})).toBeNull();
  });

  it('ignores a date with no four-digit year rather than half-parsing it', () => {
    // Open Library's dates are free text; "c. 20th century" is not a year.
    expect(lifespan({ birthDate: 'c. 20th century' })).toBeNull();
  });

  it('reads the year out of a longer date string', () => {
    expect(lifespan({ birthDate: 'October 8, 1920' })).toBe('b. 1920');
  });
});

describe('statusLabel', () => {
  it('translates the stored statuses', () => {
    expect(statusLabel('COMPLETED')).toBe('Finished');
    expect(statusLabel('READING')).toBe('Reading');
    expect(statusLabel('DROPPED')).toBe('Set aside');
  });

  it('passes an unknown status through instead of dropping the badge', () => {
    // A status added to the schema later should still show something.
    expect(statusLabel('LENT_OUT')).toBe('LENT_OUT');
  });

  it('returns null for a book with no reader state', () => {
    expect(statusLabel(undefined)).toBeNull();
    expect(statusLabel(null)).toBeNull();
  });
});

describe('progressPercent', () => {
  it('reports how far through the reader is', () => {
    expect(progressPercent(103, 412)).toBe(25);
  });

  it('caps a stale page number at 100', () => {
    expect(progressPercent(500, 412)).toBe(100);
  });

  it('returns null when either number is missing or zero', () => {
    expect(progressPercent(0, 412)).toBeNull();
    expect(progressPercent(103, 0)).toBeNull();
    expect(progressPercent(undefined, 412)).toBeNull();
    expect(progressPercent(103, null)).toBeNull();
  });
});

describe('findBookByTitle', () => {
  const books = [book({ title: 'Dune', id: 'b1' }), book({ title: 'Dune Messiah', id: 'b2' })];

  it('finds a book regardless of case and padding', () => {
    expect(findBookByTitle(books, '  dune MESSIAH ')?.id).toBe('b2');
  });

  it('returns undefined for a title that is not on the page', () => {
    // The server already drops invented picks; this is the second line of defence,
    // and it must not navigate hopefully.
    expect(findBookByTitle(books, 'Children of Dune')).toBeUndefined();
  });

  it('returns undefined for an empty title', () => {
    expect(findBookByTitle(books, '   ')).toBeUndefined();
  });
});

describe('bookTarget', () => {
  it('prefers our own book id', () => {
    expect(bookTarget(book({ id: 'local-1', googleBooksId: 'gb-1' }))).toBe('local-1');
  });

  it('falls back to the Google Books id for a book we do not hold', () => {
    expect(bookTarget(book({ googleBooksId: 'gb-1' }))).toBe('gb-1');
  });

  it('returns null when there is nothing to navigate to', () => {
    expect(bookTarget(book())).toBeNull();
  });
});

describe('historyStats', () => {
  it('always reports the three core counts', () => {
    expect(historyStats(history()).map((s) => s.label)).toEqual([
      'In your library',
      'Finished',
      'Pages read',
    ]);
  });

  it('groups the digits of a large page count', () => {
    expect(historyStats(history({ pagesRead: 12345 }))[2].value).toBe((12345).toLocaleString());
  });

  it('omits zero-valued optional stats rather than showing a 0', () => {
    const labels = historyStats(history({ booksReading: 0, favorites: 0 })).map((s) => s.label);
    expect(labels).not.toContain('Reading now');
    expect(labels).not.toContain('Favourites');
  });

  it('adds the optional stats once they have something to say', () => {
    const stats = historyStats(history({ booksReading: 1, favorites: 2 }));
    expect(stats.find((s) => s.label === 'Reading now')?.value).toBe('1');
    expect(stats.find((s) => s.label === 'Favourites')?.value).toBe('2');
  });

  it('reports the rating with the number of books behind it', () => {
    const stats = historyStats(history({ averageRating: 4.25, ratedCount: 4 }));
    const rating = stats.find((s) => s.label.startsWith('Your rating'));
    expect(rating?.label).toBe('Your rating (4)');
    expect(rating?.value).toBe('4.3');
  });

  it('omits the rating when nothing has been rated', () => {
    // averageRating of 0 across 0 books is not a 0-star opinion.
    const labels = historyStats(history({ averageRating: 0, ratedCount: 0 })).map((s) => s.label);
    expect(labels.some((l) => l.startsWith('Your rating'))).toBe(false);
  });
});
