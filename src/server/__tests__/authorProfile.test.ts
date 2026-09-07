import { describe, expect, it } from 'vitest';
import {
  authorKey,
  authorPathParam,
  dedupeByTitle,
  filterByAuthor,
  normalizeAuthorName,
  parseAuthorParam,
  publishedYear,
  relatedAuthorsFrom,
  splitOwned,
  summarizeAuthorHistory,
  type AuthorHistoryEntry,
} from '../services/authorProfile';

describe('normalizeAuthorName', () => {
  it('collapses internal whitespace', () => {
    expect(normalizeAuthorName('Frank    Herbert')).toBe('Frank Herbert');
  });

  it('strips trailing punctuation the catalog appends', () => {
    expect(normalizeAuthorName('Frank Herbert.')).toBe('Frank Herbert');
    expect(normalizeAuthorName('Herbert, Frank,')).toBe('Herbert, Frank');
  });

  it('trims surrounding space', () => {
    expect(normalizeAuthorName('  Frank Herbert  ')).toBe('Frank Herbert');
  });

  it('survives an empty string', () => {
    expect(normalizeAuthorName('')).toBe('');
  });
});

describe('authorKey', () => {
  it('is case-insensitive so "herbert" and "HERBERT" match', () => {
    expect(authorKey('Frank Herbert')).toBe(authorKey('frank herbert'));
  });

  it('ignores punctuation differences like a trailing period', () => {
    expect(authorKey('Frank Herbert.')).toBe(authorKey('Frank Herbert'));
  });
});

describe('parseAuthorParam', () => {
  it('treats a plain name as a name', () => {
    expect(parseAuthorParam('Frank Herbert')).toEqual({ kind: 'name', name: 'Frank Herbert' });
  });

  it('recognises the legacy auth-uuid form as a book id', () => {
    const id = '941a496e-7112-4c1a-94d1-73096853698b';
    expect(parseAuthorParam(`auth-${id}`)).toEqual({ kind: 'legacy-book', bookId: id });
  });

  it('rejects the demo-data slugs, which cannot be decoded back to a name', () => {
    expect(parseAuthorParam('auth-donnatartt')).toBeNull();
    expect(parseAuthorParam('auth-frankherbert')).toBeNull();
  });

  it('rejects empty and whitespace-only input', () => {
    expect(parseAuthorParam('')).toBeNull();
    expect(parseAuthorParam('   ')).toBeNull();
  });

  it('treats an auth- prefix with a non-uuid as malformed', () => {
    expect(parseAuthorParam('auth-')).toBeNull();
    expect(parseAuthorParam('auth-not-a-uuid')).toBeNull();
  });
});

describe('authorPathParam', () => {
  it('percent-encodes a name safe for a URL path', () => {
    expect(authorPathParam('Ursula K. Le Guin')).toBe('Ursula%20K.%20Le%20Guin');
  });

  it('normalises before encoding', () => {
    expect(authorPathParam('  Frank Herbert. ')).toBe('Frank%20Herbert');
  });
});

describe('summarizeAuthorHistory', () => {
  const entry = (over: Partial<AuthorHistoryEntry>): AuthorHistoryEntry => ({
    status: 'COMPLETED',
    currentPage: 100,
    pageCount: 412,
    isFavorite: false,
    startedAt: '2024-03-01T00:00:00.000Z',
    finishedAt: '2024-03-09T00:00:00.000Z',
    rating: 5,
    ...over,
  });

  it('counts readers and sums completed page counts fully', () => {
    const result = summarizeAuthorHistory([
      entry({ status: 'COMPLETED', pageCount: 412 }),
      entry({ status: 'COMPLETED', pageCount: 300 }),
      entry({ status: 'READING', currentPage: 50, pageCount: 600 }),
      entry({ status: 'OWNED', currentPage: 0, pageCount: 200 }),
    ]);
    expect(result.booksInLibrary).toBe(4);
    expect(result.booksCompleted).toBe(2);
    expect(result.booksReading).toBe(1);
    // 412 + 300 fully, 50 turned of the reading one, 0 of the owned one.
    expect(result.pagesRead).toBe(762);
  });

  it('uses the full page count for a COMPLETED book even when currentPage lags', () => {
    const result = summarizeAuthorHistory([entry({ status: 'COMPLETED', currentPage: 3, pageCount: 604 })]);
    expect(result.pagesRead).toBe(604);
  });

  it('clamps a reading book past the end of its edition', () => {
    const result = summarizeAuthorHistory([entry({ status: 'READING', currentPage: 700, pageCount: 500 })]);
    expect(result.pagesRead).toBe(500);
  });

  it('averages only rated books and reports the rated count', () => {
    const result = summarizeAuthorHistory([
      entry({ rating: 5 }),
      entry({ rating: 4 }),
      entry({ rating: null }),
    ]);
    expect(result.averageRating).toBe(4.5);
    expect(result.ratedCount).toBe(2);
  });

  it('returns null average when nothing was rated', () => {
    const result = summarizeAuthorHistory([entry({ rating: null })]);
    expect(result.averageRating).toBeNull();
    expect(result.ratedCount).toBe(0);
  });

  it('spans first and last read from started/finished stamps', () => {
    const result = summarizeAuthorHistory([
      entry({ status: 'COMPLETED', startedAt: '2024-03-01T00:00:00.000Z', finishedAt: '2024-03-09T00:00:00.000Z' }),
      entry({ status: 'COMPLETED', startedAt: '2026-08-01T00:00:00.000Z', finishedAt: '2026-08-20T00:00:00.000Z' }),
    ]);
    expect(result.firstReadAt).toBe('2024-03-01T00:00:00.000Z');
    expect(result.lastReadAt).toBe('2026-08-20T00:00:00.000Z');
  });

  it('counts favorites', () => {
    const result = summarizeAuthorHistory([entry({ isFavorite: true }), entry({ isFavorite: false })]);
    expect(result.favorites).toBe(1);
  });

  it('handles a completely empty history', () => {
    expect(summarizeAuthorHistory([])).toEqual({
      booksInLibrary: 0,
      booksCompleted: 0,
      booksReading: 0,
      pagesRead: 0,
      favorites: 0,
      averageRating: null,
      ratedCount: 0,
      firstReadAt: null,
      lastReadAt: null,
    });
  });
});

describe('publishedYear', () => {
  it('extracts the year from a full date', () => {
    expect(publishedYear('1965-08-01')).toBe(1965);
  });

  it('extracts the year from a bare year', () => {
    expect(publishedYear('1965')).toBe(1965);
  });

  it('returns null for missing or unparseable dates', () => {
    expect(publishedYear(null)).toBeNull();
    expect(publishedYear('')).toBeNull();
    expect(publishedYear('not a date')).toBeNull();
  });

  it('ignores years outside the plausible range', () => {
    expect(publishedYear('0999')).toBeNull();
    expect(publishedYear('3001')).toBeNull();
  });
});

describe('filterByAuthor', () => {
  const dune = { title: 'Dune', authors: ['Frank Herbert'] };
  const intro = { title: 'Dune: A Reader Guide', authors: ['Some Critic', 'Frank Herbert'] };
  const about = { title: 'Frank Herbert: A Biography', authors: ['Other Author'] };

  it('keeps only volumes that list the author among their own authors', () => {
    const result = filterByAuthor([dune, intro, about], 'Frank Herbert');
    expect(result).toEqual([dune, intro]);
  });

  it('matches case-insensitively', () => {
    expect(filterByAuthor([{ title: 'X', authors: ['frank herbert'] }], 'Frank Herbert')).toHaveLength(1);
  });

  it('returns nothing when no volume lists them', () => {
    expect(filterByAuthor([about], 'Frank Herbert')).toEqual([]);
  });

  it('keeps volumes with missing author lists out', () => {
    expect(filterByAuthor([{ title: 'Y', authors: null }], 'Frank Herbert')).toEqual([]);
  });
});

describe('dedupeByTitle', () => {
  it('removes duplicate editions and sorts newest first', () => {
    const books = [
      { title: 'Dune', publishedDate: '1965' },
      { title: 'Dune', publishedDate: '2021' },
      { title: 'Children of Dune', publishedDate: '1976' },
    ];
    // Children of Dune (1976) postdates Dune (1965), so it leads.
    expect(dedupeByTitle(books).map((b) => b.title)).toEqual(['Children of Dune', 'Dune']);
  });

  it('keeps the earliest edition of a work, not whichever came back first', () => {
    const books = [
      { title: 'Dune', publishedDate: '2021' },
      { title: 'Dune', publishedDate: '1965' },
    ];
    // Google Books returns editions in relevance order; a 2021 reprint must not
    // become the work's date.
    expect(dedupeByTitle(books)[0].publishedDate).toBe('1965');
  });

  it('prefers a dated edition over an undated one', () => {
    const books = [
      { title: 'Dune', publishedDate: null },
      { title: 'Dune', publishedDate: '1965' },
    ];
    expect(dedupeByTitle(books)[0].publishedDate).toBe('1965');
  });

  it('sorts undated titles last', () => {
    const books = [
      { title: 'Undated', publishedDate: null },
      { title: 'Old', publishedDate: '1900' },
      { title: 'New', publishedDate: '2000' },
    ];
    expect(dedupeByTitle(books).map((b) => b.title)).toEqual(['New', 'Old', 'Undated']);
  });

  it('drops empty titles', () => {
    expect(dedupeByTitle([{ title: '   ' }, { title: 'Real' }])).toEqual([{ title: 'Real' }]);
  });
});

describe('splitOwned', () => {
  it('divides a merged list by title, matching case-insensitively', () => {
    const all = [
      { title: 'Dune', authors: ['Frank Herbert'] },
      { title: 'dune', authors: ['Frank Herbert'] },
      { title: 'God Emperor of Dune', authors: ['Frank Herbert'] },
    ];
    const { owned, more } = splitOwned(all, ['DUNE']);
    expect(owned).toHaveLength(2);
    expect(more).toHaveLength(1);
    expect(more[0].title).toBe('God Emperor of Dune');
  });

  it('puts nothing owned when the lists are disjoint', () => {
    const { owned, more } = splitOwned([{ title: 'Dune' }], ['Something Else']);
    expect(owned).toEqual([]);
    expect(more).toHaveLength(1);
  });
});

describe('relatedAuthorsFrom', () => {
  const shelf = [
    { authors: ['Frank Herbert'], categories: ['Science Fiction'] },
    { authors: ['Ursula K. Le Guin'], categories: ['Science Fiction', 'Fantasy'] },
    { authors: ['Isaac Asimov'], categories: ['Science Fiction'] },
    { authors: ['Jane Austen'], categories: ['Romance'] },
  ];

  it('excludes the subject and authors who share no genre', () => {
    const result = relatedAuthorsFrom('Frank Herbert', ['Science Fiction'], shelf);
    const names = result.map((r) => r.name);
    expect(names).toContain('Ursula K. Le Guin');
    expect(names).toContain('Isaac Asimov');
    expect(names).not.toContain('Frank Herbert');
    expect(names).not.toContain('Jane Austen');
  });

  it('ranks by shared genre count then shelf weight', () => {
    const result = relatedAuthorsFrom('Frank Herbert', ['Science Fiction', 'Fantasy'], shelf);
    // Le Guin shares two genres, Asimov one.
    expect(result[0].name).toBe('Ursula K. Le Guin');
    expect(result[0].sharedGenres).toContain('Science Fiction');
    expect(result[1].name).toBe('Isaac Asimov');
  });

  it('builds a reason from the shared genres', () => {
    const [first] = relatedAuthorsFrom('Frank Herbert', ['Science Fiction'], shelf);
    expect(first.reason).toContain('Science Fiction');
  });

  it('returns nothing when no shelf book shares a genre', () => {
    const result = relatedAuthorsFrom('Frank Herbert', ['Horror'], shelf);
    expect(result).toEqual([]);
  });

  it('dedupes an author across multiple shelf books, weighting by count', () => {
    const shelfWithDup = [
      { authors: ['Le Guin'], categories: ['Sci-Fi'] },
      { authors: ['Le Guin'], categories: ['Sci-Fi'] },
    ];
    const result = relatedAuthorsFrom('Herbert', ['Sci-Fi'], shelfWithDup);
    expect(result).toHaveLength(1);
    expect(result[0].weight).toBe(2);
  });
});
