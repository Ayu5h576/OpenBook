import { describe, expect, it } from 'vitest';
import {
  buildAuthorInsightFallback,
  buildAuthorInsightPrompt,
  candidateTitles,
  describeReaderHistory,
  formatAuthorInsight,
  type InsightProfile,
} from '../ai/author/authorPrompts';

const emptyHistory = {
  booksInLibrary: 0,
  booksCompleted: 0,
  booksReading: 0,
  pagesRead: 0,
  favorites: 0,
  averageRating: null as number | null,
  ratedCount: 0,
};

function profile(over: Partial<InsightProfile> = {}): InsightProfile {
  return {
    author: { name: 'Frank Herbert' },
    history: { ...emptyHistory },
    booksInLibrary: [],
    moreByAuthor: [],
    relatedAuthors: [],
    genres: [],
    ...over,
  };
}

describe('describeReaderHistory', () => {
  it('says plainly when the reader owns nothing by the author', () => {
    expect(describeReaderHistory(profile())).toBe(
      "The reader has none of Frank Herbert's books in their library."
    );
  });

  it('reports counts, progress and ratings', () => {
    const text = describeReaderHistory(
      profile({
        history: {
          ...emptyHistory,
          booksInLibrary: 3,
          booksCompleted: 2,
          booksReading: 1,
          pagesRead: 900,
          favorites: 1,
          averageRating: 4.5,
          ratedCount: 2,
        },
      })
    );
    expect(text).toContain('3 books by Frank Herbert');
    expect(text).toContain('2 finished');
    expect(text).toContain('1 in progress');
    expect(text).toContain('900 pages read');
    expect(text).toContain('4.5/5');
  });

  it('singularises a one-book history', () => {
    const text = describeReaderHistory(
      profile({ history: { ...emptyHistory, booksInLibrary: 1 } })
    );
    expect(text).toContain('1 book by');
    expect(text).not.toContain('1 books');
  });
});

describe('buildAuthorInsightPrompt', () => {
  const full = profile({
    author: {
      name: 'Frank Herbert',
      bio: 'Franklin Patrick Herbert Jr. was an American science fiction author.',
      topWork: 'Dune',
      workCount: 92,
    },
    history: { ...emptyHistory, booksInLibrary: 1, booksCompleted: 1, pagesRead: 412 },
    booksInLibrary: [{ title: 'Dune', status: 'COMPLETED', myRating: 5 }],
    moreByAuthor: [{ title: 'Dune Messiah', publishedDate: '1969' }],
    relatedAuthors: [{ name: 'Isaac Asimov', sharedGenres: ['Science Fiction'] }],
    genres: ['Science Fiction'],
  });

  it('carries the facts the model is allowed to use', () => {
    const prompt = buildAuthorInsightPrompt(full);
    expect(prompt).toContain('AUTHOR: Frank Herbert');
    expect(prompt).toContain('American science fiction author');
    expect(prompt).toContain('BEST KNOWN FOR: Dune');
    expect(prompt).toContain('Dune Messiah');
    expect(prompt).toContain('Isaac Asimov');
  });

  it('includes the reader state of each owned book', () => {
    expect(buildAuthorInsightPrompt(full)).toContain('- Dune (completed, rated 5/5)');
  });

  it('forbids invention explicitly', () => {
    const prompt = buildAuthorInsightPrompt(full);
    expect(prompt).toContain('Do not invent titles');
  });

  it('omits sections it has no facts for', () => {
    const prompt = buildAuthorInsightPrompt(profile());
    expect(prompt).not.toContain('ENCYCLOPEDIA SUMMARY');
    expect(prompt).not.toContain("IN THE READER'S LIBRARY");
    expect(prompt).not.toContain('BEST KNOWN FOR');
  });

  it('still asks for JSON when nothing is known but the name', () => {
    expect(buildAuthorInsightPrompt(profile())).toContain('"insight"');
  });
});

describe('buildAuthorInsightFallback', () => {
  it('states the author is new when the reader owns nothing', () => {
    const result = buildAuthorInsightFallback(
      profile({ genres: ['Science Fiction', 'Fantasy'] })
    );
    expect(result.insight).toContain('new to your library');
    expect(result.insight).toContain('Science Fiction');
  });

  it('reports real history rather than an error', () => {
    const result = buildAuthorInsightFallback(
      profile({ history: { ...emptyHistory, booksInLibrary: 2, booksCompleted: 2, pagesRead: 700 } })
    );
    expect(result.insight).toContain('2 books by Frank Herbert');
    expect(result.insight).toContain('700 pages read');
  });

  it('builds connections from the shelf neighbours', () => {
    const result = buildAuthorInsightFallback(
      profile({ relatedAuthors: [{ name: 'Isaac Asimov', sharedGenres: ['Science Fiction'] }] })
    );
    expect(result.connections).toEqual([
      'Isaac Asimov is also on your shelf in Science Fiction.',
    ]);
  });

  it('suggests a real unowned title as a starting point', () => {
    const result = buildAuthorInsightFallback(
      profile({ moreByAuthor: [{ title: 'Dune Messiah' }] })
    );
    expect(result.startWith?.title).toBe('Dune Messiah');
  });

  it('suggests nothing when the bibliography is empty', () => {
    expect(buildAuthorInsightFallback(profile()).startWith).toBeUndefined();
  });
});

describe('formatAuthorInsight', () => {
  const base = profile({
    booksInLibrary: [{ title: 'Dune' }],
    moreByAuthor: [{ title: 'Dune Messiah' }],
  });

  it('keeps a startWith title that exists in the bibliography', () => {
    const result = formatAuthorInsight(
      { insight: 'Dense, political science fiction.', startWith: { title: 'Dune Messiah', why: 'Picks up where Dune ends.' } },
      base
    );
    expect(result.startWith).toEqual({
      title: 'Dune Messiah',
      why: 'Picks up where Dune ends.',
    });
  });

  it('matches a title case-insensitively and echoes our own spelling', () => {
    const result = formatAuthorInsight({ startWith: { title: 'dune messiah' } }, base);
    expect(result.startWith?.title).toBe('Dune Messiah');
  });

  it('drops a startWith the model invented', () => {
    // The single most damaging failure mode: a confident recommendation to read
    // a book that does not exist.
    const result = formatAuthorInsight(
      { insight: 'x', startWith: { title: 'Dune: The Lost Chapter', why: 'Made up.' } },
      base
    );
    expect(result.startWith).toBeUndefined();
  });

  it('falls back to our own text when the model returns nothing usable', () => {
    const result = formatAuthorInsight({}, base);
    expect(result.insight).toBe(buildAuthorInsightFallback(base).insight);
  });

  it('keeps model connections when it supplied them', () => {
    const result = formatAuthorInsight({ connections: ['  You finished Dune.  ', ''] }, base);
    expect(result.connections).toEqual(['You finished Dune.']);
  });

  it('falls back to shelf connections when the model supplied none', () => {
    const withNeighbour = profile({
      relatedAuthors: [{ name: 'Isaac Asimov', sharedGenres: ['Science Fiction'] }],
    });
    const result = formatAuthorInsight({ connections: [] }, withNeighbour);
    expect(result.connections).toHaveLength(1);
  });

  it('caps the connection list', () => {
    const result = formatAuthorInsight(
      { connections: ['a', 'b', 'c', 'd', 'e', 'f'] },
      base
    );
    expect(result.connections).toHaveLength(4);
  });

  it('always reports the author name we resolved, not one the model echoed', () => {
    expect(formatAuthorInsight({ insight: 'x' }, base).author).toBe('Frank Herbert');
  });
});

describe('candidateTitles', () => {
  it('spans owned and unowned books and drops blanks', () => {
    const result = candidateTitles(
      profile({ booksInLibrary: [{ title: 'Dune' }, { title: '  ' }], moreByAuthor: [{ title: 'Dune Messiah' }] })
    );
    expect(result).toEqual(['Dune', 'Dune Messiah']);
  });
});
