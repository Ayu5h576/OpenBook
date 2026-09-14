/**
 * Text-layer geometry.
 *
 * The cases below use a real US Letter page (612 × 792 pt) so the expected
 * numbers are checkable by hand rather than copied from whatever the code
 * happened to produce.
 */
import { describe, it, expect } from 'vitest';
import {
  canvasScale,
  locateHighlight,
  multiplyTransform,
  normalizeAngle,
  pageText,
  textItemPlacement,
} from '../pdfTextLayer';

/** The viewport of an unrotated 792pt-tall page at `scale`. */
const letterViewport = (scale = 1) => [scale, 0, 0, -scale, 0, 792 * scale];

/** A 12pt text item whose baseline starts 100pt from the left, 700pt up the page. */
const twelvePointText = [12, 0, 0, 12, 100, 700];

describe('multiplyTransform', () => {
  it('is the identity when multiplied by the identity', () => {
    expect(multiplyTransform([1, 0, 0, 1, 0, 0], [1, 0, 0, 1, 0, 0])).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('applies the second matrix first', () => {
    // Scale by 2, then translate by 10 — the translation is not doubled.
    const scaled = multiplyTransform([2, 0, 0, 2, 0, 0], [1, 0, 0, 1, 10, 0]);
    expect(scaled).toEqual([2, 0, 0, 2, 20, 0]);
  });
});

describe('normalizeAngle', () => {
  it('reads an upright run as 0', () => {
    expect(normalizeAngle([12, 0, 0, -12, 100, 92])).toBe(0);
  });

  it('reads a sideways run as 90', () => {
    expect(normalizeAngle([0, 12, 12, 0, 100, 92])).toBe(90);
  });

  it('snaps a run that is a fraction of a degree off', () => {
    // Scanned pages carry tiny skew; rendering it rotated would break selection
    // for no visible gain.
    expect(normalizeAngle([12, 0.2, -0.2, -12, 0, 0])).toBe(0);
  });

  it('turns a negative angle into a positive one', () => {
    expect(normalizeAngle([0, -12, -12, 0, 0, 0])).toBe(270);
  });

  it('reports a full half turn as 180, not 0', () => {
    expect(normalizeAngle([-12, 0, 0, 12, 0, 0])).toBe(180);
  });
});

describe('textItemPlacement', () => {
  it('puts a line where the ink is, not on the baseline', () => {
    // Baseline is 92px from the top (792 - 700); the 12pt ascent lifts the box
    // to 80. Reading the baseline directly would sit the text 12px too low.
    expect(textItemPlacement(twelvePointText, letterViewport())).toEqual({
      left: 100,
      top: 80,
      fontSize: 12,
      angle: 0,
    });
  });

  it('scales with the viewport', () => {
    // Everything doubles at 2× — position, size, and the ascent offset.
    expect(textItemPlacement(twelvePointText, letterViewport(2))).toEqual({
      left: 200,
      top: 160,
      fontSize: 24,
      angle: 0,
    });
  });

  it('follows the viewport origin when a page is rotated', () => {
    // A /Rotate 90 viewport: the matrix carries the rotation, so the placement
    // must come out sideways without this module knowing the page was rotated.
    const rotated = [0, 1, 1, 0, 0, 0];
    // Sideways text is offset along its own normal, so the box starts a full
    // font size to the right of the baseline origin.
    expect(textItemPlacement([12, 0, 0, 12, 0, 0], rotated)).toEqual({
      left: 12,
      top: 0,
      fontSize: 12,
      angle: 90,
    });
  });

  it('ignores an item with no height', () => {
    // pdf.js emits these for whitespace; a zero-size span is a selection target
    // with nothing in it.
    expect(textItemPlacement([0, 0, 0, 0, 100, 700], letterViewport())).toBeNull();
  });

  it('ignores an item whose transform is not finite', () => {
    expect(textItemPlacement([NaN, 0, 0, NaN, 0, 0], letterViewport())).toBeNull();
  });

  it('rounds to hundredths so the emitted CSS stays readable', () => {
    const placement = textItemPlacement([12.3456, 0, 0, 12.3456, 10.005, 700], letterViewport());
    expect(placement?.fontSize).toBe(12.35);
    expect(placement?.left).toBe(10.01);
  });
});

describe('pageText', () => {
  it('concatenates runs without inventing spaces', () => {
    // pdf.js splits a line at kerning boundaries; "un" + "broken" is one word.
    expect(pageText([{ str: 'un' }, { str: 'broken' }])).toBe('unbroken');
  });

  it('keeps the spaces pdf.js put inside a run', () => {
    expect(pageText([{ str: 'the ' }, { str: 'sand' }])).toBe('the sand');
  });

  it('breaks the line where pdf.js said the line ended', () => {
    expect(pageText([{ str: 'first', hasEOL: true }, { str: 'second' }])).toBe('first\nsecond');
  });

  it('collapses the blank runs page furniture leaves behind', () => {
    expect(pageText([{ str: 'a', hasEOL: true }, { str: '', hasEOL: true }, { str: '', hasEOL: true }, { str: '', hasEOL: true }, { str: 'b' }])).toBe('a\n\nb');
  });

  it('trims the leading and trailing whitespace of a page', () => {
    expect(pageText([{ str: '  ' }, { str: 'text' }, { str: '\n ' }])).toBe('text');
  });

  it('skips an item with no string', () => {
    expect(pageText([{ str: 'a' }, {} as any, { str: 'b' }])).toBe('ab');
  });

  it('reports an empty page as empty rather than throwing', () => {
    expect(pageText([])).toBe('');
  });
});

describe('locateHighlight', () => {
  it('finds a highlight inside a single run', () => {
    expect(locateHighlight([{ str: 'the sandworm rises' }], 'sandworm')).toEqual({
      startRun: 0,
      startOffset: 4,
      endRun: 0,
      endOffset: 11,
    });
  });

  it('finds a highlight split across runs mid-word, without inventing a space', () => {
    // A kerning split: "sand" + "worm" is one word, so joining the runs with a
    // space would make this excerpt unfindable.
    expect(locateHighlight([{ str: 'the sand' }, { str: 'worm rises' }], 'sandworm rises')).toEqual({
      startRun: 0,
      startOffset: 4,
      endRun: 1,
      endOffset: 9,
    });
  });

  it('finds a highlight the selection reported across a line break', () => {
    // The runs carry no whitespace at the break — `hasEOL` is the only thing
    // that says a line ended there, and the reader's selection saw a newline.
    expect(
      locateHighlight([{ str: 'end of one', hasEOL: true }, { str: 'start of two' }], 'one start')
    ).toEqual({
      startRun: 0,
      startOffset: 7,
      endRun: 1,
      endOffset: 4,
    });
  });

  it('finds a highlight when the runs have more whitespace than the selection', () => {
    expect(locateHighlight([{ str: 'the ' }, { str: '  sandworm' }], 'the sandworm')).toEqual({
      startRun: 0,
      startOffset: 0,
      endRun: 1,
      endOffset: 9,
    });
  });

  it('reports a highlight it cannot find rather than guessing', () => {
    // The reader attached a different edition, so the old excerpt is gone.
    expect(locateHighlight([{ str: 'different text entirely' }], 'sandworm')).toBeNull();
  });

  it('refuses to match an empty or whitespace-only excerpt', () => {
    expect(locateHighlight([{ str: 'some text' }], '')).toBeNull();
    expect(locateHighlight([{ str: 'some text' }], '   ')).toBeNull();
  });

  it('ignores leading and trailing whitespace in the excerpt', () => {
    expect(locateHighlight([{ str: 'the sandworm rises' }], '  sandworm \n')).toEqual({
      startRun: 0,
      startOffset: 4,
      endRun: 0,
      endOffset: 11,
    });
  });

  it('finds the first occurrence when the phrase appears twice', () => {
    expect(locateHighlight([{ str: 'sand and sand' }], 'sand')).toEqual({
      startRun: 0,
      startOffset: 0,
      endRun: 0,
      endOffset: 3,
    });
  });

  it('does not let a trailing line break extend a match', () => {
    // The deferred space must never be emitted at the very end of the page,
    // or an excerpt would match text that is not on it.
    expect(locateHighlight([{ str: 'sand', hasEOL: true }], 'sand ')).toEqual({
      startRun: 0,
      startOffset: 0,
      endRun: 0,
      endOffset: 3,
    });
  });

  it('handles a page whose runs are empty', () => {
    expect(locateHighlight([], 'anything')).toBeNull();
    expect(locateHighlight([{ str: '' }, { hasEOL: true }], 'anything')).toBeNull();
  });
});

describe('canvasScale', () => {
  it('renders at native resolution on a retina screen', () => {
    expect(canvasScale(1, 2)).toBe(2);
  });

  it('leaves a standard screen alone', () => {
    expect(canvasScale(1, 1)).toBe(1);
  });

  it('folds zoom into the pixel ratio', () => {
    expect(canvasScale(1.5, 2)).toBe(3);
  });

  it('falls back to 1 for a nonsense pixel ratio', () => {
    expect(canvasScale(1, NaN)).toBe(1);
    expect(canvasScale(1, 0)).toBe(1);
  });

  it('falls back to 1 for a nonsense zoom', () => {
    expect(canvasScale(NaN, 2)).toBe(2);
    expect(canvasScale(0, 2)).toBe(2);
  });
});
