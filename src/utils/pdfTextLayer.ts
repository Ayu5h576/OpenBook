/**
 * Where the selectable text of a PDF page sits, in CSS pixels.
 *
 * Kept free of both pdf.js and the DOM so the arithmetic can be tested directly.
 * This is the part of a text layer that is easy to get subtly wrong: a flipped
 * axis or a missing ascent offset still *looks* fine, because the spans are
 * transparent — but every selection the reader makes, and therefore every
 * highlight they save, lands somewhere other than the ink they dragged over.
 *
 * Page space is PDF's own: origin bottom-left, y increasing upwards. CSS space is
 * origin top-left, y increasing downwards. `viewportTransform` is what carries
 * one to the other; pdf.js builds it (`PDFPageProxy.getViewport().transform`) and
 * it already folds in the render scale and the page's `/Rotate`.
 */

/** An affine matrix `[a, b, c, d, e, f]`, as pdf.js represents one. */
export type Matrix = readonly number[];

/**
 * pdf.js's `Util.transform`: apply `m2` first, then `m1`.
 *
 * Derived rather than imported so this module stays dependency-free; it is the
 * same six-term matrix product pdf.js performs.
 */
export function multiplyTransform(m1: Matrix, m2: Matrix): number[] {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

/**
 * The text layer only ever positions spans on quarter turns.
 *
 * Real PDF text can sit at any angle, but a run that is a fraction of a degree
 * off horizontal renders identically whether we snap it or not — whereas
 * snapping keeps `sin`/`cos` exact, so the placement below has no rounding drift.
 */
export function normalizeAngle(transform: Matrix): number {
  const radians = Math.atan2(transform[1], transform[0]);
  const degrees = (radians * 180) / Math.PI;
  const quarterTurn = Math.round(degrees / 90) * 90;
  return ((quarterTurn % 360) + 360) % 360;
}

export interface TextPlacement {
  /** CSS px from the left edge of the rendered page. */
  left: number;
  /** CSS px from the top edge of the rendered page. */
  top: number;
  fontSize: number;
  /** 0, 90, 180 or 270 — the span's rotation. */
  angle: number;
}

/**
 * Place one text item.
 *
 * Returns null for an item with no height, which pdf.js emits for whitespace and
 * for degenerate runs; a zero-size span would be a selection target with nothing
 * to select.
 */
export function textItemPlacement(
  itemTransform: Matrix,
  viewportTransform: Matrix
): TextPlacement | null {
  const tx = multiplyTransform(viewportTransform, itemTransform);
  const fontSize = Math.hypot(tx[2], tx[3]);
  if (!Number.isFinite(fontSize) || fontSize <= 0) return null;

  const angle = normalizeAngle(tx);
  const radians = (angle * Math.PI) / 180;

  // pdf.js measures from the baseline, CSS positions the span's top-left, and
  // the ascent pushes the box up by the font size along the text's own normal.
  const left = tx[4] + fontSize * Math.sin(radians);
  const top = tx[5] - fontSize * Math.cos(radians);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;

  return {
    left: round(left),
    top: round(top),
    fontSize: round(fontSize),
    angle,
  };
}

/**
 * The text of a page, as one string.
 *
 * pdf.js hands back positioned *runs*, not lines or paragraphs: intra-line
 * spacing is already inside `str`, and `hasEOL` marks where the line ended. So
 * the runs are concatenated as they come rather than joined with a separator —
 * inserting one would put a space inside words that were split across runs,
 * which is common with kerning and with any font that lacks ligatures.
 *
 * This is what the AI drawer and the study panel are grounded on while a PDF is
 * open. Without it they would answer from the book's *description* while the
 * reader looked at page 40.
 */
export function pageText(items: Array<{ str?: string; hasEOL?: boolean }>): string {
  let out = '';
  for (const item of items) {
    if (!item || typeof item.str !== 'string') continue;
    out += item.str;
    if (item.hasEOL) out += '\n';
  }
  // Collapse the runs of blank lines that page furniture leaves behind.
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

/** Where a saved highlight starts and ends, as run index plus offset within it. */
export interface HighlightRunSpan {
  startRun: number;
  startOffset: number;
  endRun: number;
  endOffset: number;
}

/** Whitespace-collapsed, so a DOM selection and pdf.js's runs can be compared. */
function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Find a saved highlight inside a page's text runs.
 *
 * The excerpt was captured from a DOM selection while the runs came from pdf.js,
 * and the two do not agree on whitespace: a selection reports the break between
 * two lines as a newline, while the runs that produced them contain no
 * whitespace at all. So both sides are collapsed before comparing, and the
 * mapping back to (run, offset) is carried through the collapse — otherwise a
 * highlight would only ever be found on pages whose text happened to have the
 * same spacing as the selection that made it.
 *
 * `hasEOL` is what makes this work: a break between runs *within* a line is a
 * kerning or font split and must not become a space ("un" + "broken" is one
 * word), whereas a break a run was flagged as ending a line must. Joining on
 * every run boundary would break the first case; joining on none would break
 * the second.
 *
 * Returns run indices and offsets rather than a DOM Range so the part that is
 * easy to get wrong can be tested without a browser.
 */
export function locateHighlight(
  items: Array<{ str?: string; hasEOL?: boolean }>,
  needle: string
): HighlightRunSpan | null {
  const target = collapseWhitespace(needle);
  if (!target) return null;

  const origin: Array<{ run: number; offset: number }> = [];
  let text = '';
  let pendingSpace = false;

  for (let run = 0; run < items.length; run += 1) {
    const value = typeof items[run]?.str === 'string' ? items[run]!.str! : '';
    for (let offset = 0; offset < value.length; offset += 1) {
      const char = value[offset];
      if (/\s/.test(char)) {
        // Deferred: a collapsed space is only emitted once we know a real
        // character follows it, so trailing whitespace cannot extend a match.
        if (text) pendingSpace = true;
        continue;
      }
      if (pendingSpace) {
        // The emitted space is attributed to the character after it, which is
        // where a selection starting on that character would begin.
        text += ' ';
        origin.push({ run, offset });
        pendingSpace = false;
      }
      text += char;
      origin.push({ run, offset });
    }
    // The line break lives *between* the runs, so it belongs to neither.
    if (items[run]?.hasEOL && text) pendingSpace = true;
  }

  const at = text.indexOf(target);
  if (at < 0) return null;
  const first = origin[at];
  const last = origin[at + target.length - 1];
  if (!first || !last) return null;

  return {
    startRun: first.run,
    startOffset: first.offset,
    endRun: last.run,
    endOffset: last.offset,
  };
}

/** Sub-pixel precision is invisible and makes the emitted CSS hard to read. */
function round(value: number): number {
  // `+ 0` collapses -0 to 0: `Math.cos` of a quarter turn is a hair off zero
  // rather than zero, which would otherwise reach the DOM as `top: -0px`.
  return Math.round(value * 100) / 100 + 0;
}

/**
 * The scale to render a page canvas at.
 *
 * The device pixel ratio is folded in so the canvas is drawn at native
 * resolution rather than upscaled by the browser, which is the difference
 * between crisp text and text that looks slightly soft on every retina screen.
 */
export function canvasScale(zoom: number, devicePixelRatio: number): number {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  return safeZoom * dpr;
}
