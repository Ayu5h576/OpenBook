/**
 * PDF reader logic.
 *
 * The interesting cases are all boundary cases, because a page number reaches
 * this module from three places that disagree about what "no page" means: pdf.js
 * counts from 1, `LibraryEntry.currentPage` stores 0 until a book is opened, and
 * a stored page can outlive the edition it was saved against.
 */
import { describe, it, expect } from 'vitest';
import {
  MIN_ZOOM,
  MAX_ZOOM,
  MAX_PDF_BYTES,
  clampPage,
  clampZoom,
  describePdfError,
  highlightsForPage,
  isProbablyPdf,
  nextPage,
  pageChapter,
  pageLabel,
  pageProgressPercent,
  pdfFileProblem,
  previousPage,
  resumePage,
  zoomIn,
  zoomOut,
} from '../pdfReading';

describe('clampPage', () => {
  it('keeps a page that is already in range', () => {
    expect(clampPage(5, 10)).toBe(5);
  });

  it('pulls a page below the start back to the first page', () => {
    expect(clampPage(0, 10)).toBe(1);
    expect(clampPage(-3, 10)).toBe(1);
  });

  it('stops a stale page number running past the end', () => {
    expect(clampPage(400, 340)).toBe(340);
  });

  it('rounds a fractional page', () => {
    expect(clampPage(5.6, 10)).toBe(6);
  });

  it('falls back to page 1 for a document with no pages', () => {
    expect(clampPage(5, 0)).toBe(1);
  });

  it('survives a page number that is not a number', () => {
    expect(clampPage(NaN, 10)).toBe(1);
  });
});

describe('nextPage / previousPage', () => {
  it('steps forward and back', () => {
    expect(nextPage(1, 10)).toBe(2);
    expect(previousPage(2, 10)).toBe(1);
  });

  it('stops at the last page', () => {
    expect(nextPage(10, 10)).toBe(10);
  });

  it('stops at the first page', () => {
    expect(previousPage(1, 10)).toBe(1);
  });

  it('steps from a stale out-of-range page rather than from nowhere', () => {
    // The reader was on page 999 of an older, longer edition.
    expect(nextPage(999, 10)).toBe(10);
  });
});

describe('pageProgressPercent', () => {
  it('reports how far through the document the reader is', () => {
    expect(pageProgressPercent(1, 4)).toBe(25);
  });

  it('reports the last page as complete', () => {
    expect(pageProgressPercent(340, 340)).toBe(100);
  });

  it('reports nothing for a document with no pages', () => {
    expect(pageProgressPercent(1, 0)).toBe(0);
  });

  it('never reports more than complete', () => {
    expect(pageProgressPercent(999, 10)).toBe(100);
  });
});

describe('resumePage', () => {
  it('opens at page 1 for a book that was never opened', () => {
    // currentPage is 0 on a fresh library entry, but asking pdf.js for page 0
    // throws — this is the case that would break on first open.
    expect(resumePage(0, 100)).toBe(1);
  });

  it('opens at page 1 when there is no stored progress at all', () => {
    expect(resumePage(null, 100)).toBe(1);
    expect(resumePage(undefined, 100)).toBe(1);
  });

  it('ignores a negative stored page', () => {
    expect(resumePage(-5, 100)).toBe(1);
  });

  it('resumes where the reader left off', () => {
    expect(resumePage(57, 100)).toBe(57);
  });

  it('does not resume past the end of a different edition', () => {
    expect(resumePage(400, 340)).toBe(340);
  });
});

describe('zoom', () => {
  it('steps up and down by a fixed amount', () => {
    expect(zoomIn(1)).toBe(1.25);
    expect(zoomOut(1)).toBe(0.75);
  });

  it('will not zoom out past the floor', () => {
    expect(zoomOut(MIN_ZOOM)).toBe(MIN_ZOOM);
  });

  it('will not zoom in past the ceiling', () => {
    expect(zoomIn(MAX_ZOOM)).toBe(MAX_ZOOM);
  });

  it('does not drift after repeated steps', () => {
    let zoom = 1;
    for (let i = 0; i < 3; i += 1) zoom = zoomIn(zoom);
    for (let i = 0; i < 3; i += 1) zoom = zoomOut(zoom);
    expect(zoom).toBe(1);
  });

  it('treats a nonsense zoom as 100%', () => {
    expect(clampZoom(NaN)).toBe(1);
  });
});

describe('pageLabel', () => {
  it('reports the page against the total', () => {
    expect(pageLabel(12, 340)).toBe('12 / 340');
  });

  it('clamps a stale page in the label too, so the two never disagree', () => {
    expect(pageLabel(400, 340)).toBe('340 / 340');
  });

  it('handles a document with no page count', () => {
    expect(pageLabel(1, 0)).toBe('1 / 0');
  });
});

describe('pageChapter', () => {
  it('treats the page as the chapter, so the notes tables need no migration', () => {
    expect(pageChapter(7)).toBe(7);
  });

  it('never returns chapter 0', () => {
    // The highlight validator enforces min 1.
    expect(pageChapter(0)).toBe(1);
  });
});

describe('highlightsForPage', () => {
  const highlights = [
    { id: 'a', chapter: 3 },
    { id: 'b', chapter: 4 },
    { id: 'c', chapter: 3 },
  ];

  it('returns only the highlights saved on the page on screen', () => {
    expect(highlightsForPage(highlights, 3).map((h) => h.id)).toEqual(['a', 'c']);
  });

  it('returns nothing for a page with no highlights', () => {
    expect(highlightsForPage(highlights, 9)).toEqual([]);
  });

  it('treats a highlight with no chapter as belonging to page one', () => {
    const legacy = [{ id: 'x', chapter: undefined }];
    expect(highlightsForPage(legacy, 1).map((h) => h.id)).toEqual(['x']);
    expect(highlightsForPage(legacy, 2)).toEqual([]);
  });
});

describe('pdfFileProblem', () => {
  const file = (over: Partial<{ name: string; type: string; size: number }> = {}) => ({
    name: 'dune.pdf',
    type: 'application/pdf',
    size: 1024,
    ...over,
  });

  it('accepts a PDF', () => {
    expect(pdfFileProblem(file())).toBeNull();
  });

  it('accepts a PDF whose mime type is missing', () => {
    // Dragging a file off the desktop often leaves `type` empty.
    expect(pdfFileProblem(file({ type: '' }))).toBeNull();
  });

  it('rejects another file type', () => {
    expect(pdfFileProblem(file({ name: 'notes.txt', type: 'text/plain' }))).toBe(
      'That file is not a PDF.'
    );
  });

  it('rejects an empty file', () => {
    expect(pdfFileProblem(file({ size: 0 }))).toBe('That file is empty.');
  });

  it('rejects a file past the size ceiling', () => {
    expect(pdfFileProblem(file({ size: MAX_PDF_BYTES + 1 }))).toContain('too large');
  });

  it('accepts a file exactly at the ceiling', () => {
    expect(pdfFileProblem(file({ size: MAX_PDF_BYTES }))).toBeNull();
  });

  it('trusts the mime type when the name has no extension', () => {
    expect(isProbablyPdf({ name: 'scan', type: 'application/pdf' })).toBe(true);
  });
});

describe('describePdfError', () => {
  const named = (name: string) => Object.assign(new Error('boom'), { name });

  it('names a password-protected file, because that one is fixable', () => {
    expect(describePdfError(named('PasswordException'))).toContain('password-protected');
  });

  it('distinguishes a damaged file from an unreadable one', () => {
    expect(describePdfError(named('InvalidPDFException'))).toContain('damaged');
  });

  it('tells the reader to re-attach a file that has gone missing', () => {
    expect(describePdfError(named('MissingPDFException'))).toContain('again');
  });

  it('falls back to a plain sentence for anything else', () => {
    expect(describePdfError(new Error('worker died'))).toBe('That PDF could not be opened.');
  });

  it('survives being handed something that is not an error at all', () => {
    // A rejected promise can carry anything.
    expect(describePdfError(null)).toBe('That PDF could not be opened.');
    expect(describePdfError('nope')).toBe('That PDF could not be opened.');
    expect(describePdfError(undefined)).toBe('That PDF could not be opened.');
  });
});
