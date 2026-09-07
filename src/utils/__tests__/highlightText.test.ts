/**
 * highlightText — unit tests
 *
 * Pure functions that re-locate saved highlights in rendered prose. The contract
 * worth pinning down: a highlight whose text is no longer in the passage is
 * skipped, not thrown; the first occurrence is the one marked; and segments
 * never nest a <mark> inside another.
 */
import { describe, it, expect } from 'vitest';
import { matchesInParagraph, segmentParagraph } from '../highlightText';

const P = 'The old clock on the mantel struck midnight, and the fire burned low.';

describe('matchesInParagraph', () => {
  it('returns highlights whose text appears verbatim', () => {
    const result = matchesInParagraph(P, [{ id: 'a', text: 'the fire burned low' }]);
    expect(result).toEqual([{ id: 'a', text: 'the fire burned low' }]);
  });

  it('trims whitespace around stored text before matching', () => {
    expect(matchesInParagraph(P, [{ id: 'a', text: '  the fire burned low  ' }])).toHaveLength(1);
  });

  it('drops empty or whitespace-only highlights', () => {
    expect(matchesInParagraph(P, [{ id: 'a', text: '   ' }])).toEqual([]);
  });

  it('skips (does not throw on) text that is no longer in the paragraph', () => {
    expect(matchesInParagraph(P, [{ id: 'a', text: 'a passage that was edited away' }])).toEqual([]);
  });

  it('reports each highlight at most once', () => {
    // 'the' appears many times, but a verbatim re-match cannot tell which
    // occurrence was highlighted — report the highlight once.
    expect(matchesInParagraph(P, [{ id: 'a', text: 'the' }])).toHaveLength(1);
  });

  it('is case-sensitive like the stored selection was', () => {
    expect(matchesInParagraph(P, [{ id: 'a', text: 'THE FIRE' }])).toEqual([]);
  });
});

describe('segmentParagraph', () => {
  it('marks only the first occurrence of a repeated highlight', () => {
    const segments = segmentParagraph('one two one', [{ id: 'h', text: 'one' }]);
    expect(segments).toEqual([
      { text: 'one', id: 'h' }, // first occurrence, marked
      { text: ' two one' }, // remainder, including the second unmarked 'one'
    ]);
    expect(segments.filter((s) => s.id !== undefined)).toHaveLength(1);
  });

  it('reassembles the paragraph exactly when a highlight is present', () => {
    const h = { id: 'h', text: 'the fire burned low' };
    const joined = segmentParagraph(P, [h])
      .map((s) => s.text)
      .join('');
    expect(joined).toBe(P);
  });

  it('never nests marks for overlapping highlights', () => {
    // 'clock struck' sits inside 'the clock struck twelve'; the first listed
    // match is placed and the overlapping one is skipped so a <mark> never
    // wraps another <mark>.
    const P2 = 'The fire burned low as the clock struck twelve.';
    const segments = segmentParagraph(P2, [
      { id: 'outer', text: 'the clock struck twelve' },
      { id: 'inner', text: 'clock struck' },
    ]);
    const marked = segments.filter((s) => s.id !== undefined);
    expect(marked).toHaveLength(1);
    expect(marked[0].id).toBe('outer');
    expect(marked[0].text).toBe('the clock struck twelve');
  });

  it('returns the paragraph unmarked when nothing matches', () => {
    expect(segmentParagraph(P, [{ id: 'x', text: 'missing' }])).toEqual([{ text: P }]);
  });

  it('handles an empty highlight list', () => {
    expect(segmentParagraph(P, [])).toEqual([{ text: P }]);
  });

  it('keeps two disjoint highlights distinct', () => {
    const segments = segmentParagraph(P, [
      { id: 'a', text: 'old clock' },
      { id: 'b', text: 'fire burned' },
    ]);
    const marked = segments.filter((s) => s.id !== undefined).map((s) => s.id);
    expect(marked).toEqual(['a', 'b']);
  });
});
