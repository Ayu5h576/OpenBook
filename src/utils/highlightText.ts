/**
 * Highlight replay onto rendered prose.
 *
 * A saved highlight stores the selected text verbatim (plus an optional chapter
 * index). When the reading room re-renders a chapter it has to re-find those
 * passages in the text actually on screen. These helpers keep that logic pure
 * and DOM-free so it is unit-testable: matching is a plain string search, and a
 * paragraph is split into marked/unmarked segments a component can render.
 *
 * The contract is deliberately forgiving: if stored text no longer appears in
 * the prose — the blurb changed, the selection spanned two paragraphs, the
 * reader trimmed it — the highlight is skipped, never thrown.
 */

export interface StoredHighlight {
  id: string;
  text: string;
}

/** A piece of a paragraph. `id` present means it should render as that highlight. */
export interface ParagraphSegment {
  text: string;
  id?: string;
}

/**
 * Every stored highlight whose text appears verbatim in `paragraph`, in the
 * order they are given. Trims whitespace and drops empties, so a selection that
 * was saved with trailing space still matches. A highlight is reported at most
 * once even if its text appears several times.
 */
export function matchesInParagraph(paragraph: string, highlights: StoredHighlight[]): StoredHighlight[] {
  const found: StoredHighlight[] = [];
  const seen = new Set<string>();
  for (const h of highlights) {
    const text = h.text.trim();
    if (!text || seen.has(h.id)) continue;
    if (paragraph.includes(text)) {
      seen.add(h.id);
      found.push({ id: h.id, text });
    }
  }
  return found;
}

/**
 * Splits `paragraph` into segments, marking the passages saved as highlights.
 *
 * Only the *first* occurrence of each highlight is marked (a verbatim re-match
 * cannot tell which of several identical sentences was picked, and marking them
 * all would imply the reader highlighted the whole book). Overlapping matches
 * keep the earliest-placed highlight and skip the rest, so a `<mark>` is never
 * nested inside another.
 */
export function segmentParagraph(paragraph: string, highlights: StoredHighlight[]): ParagraphSegment[] {
  const placed: { id: string; text: string; start: number; end: number }[] = [];

  for (const h of matchesInParagraph(paragraph, highlights)) {
    const start = paragraph.indexOf(h.text);
    const end = start + h.text.length;
    const overlapsPlaced = placed.some((r) => start < r.end && end > r.start);
    if (!overlapsPlaced) placed.push({ id: h.id, text: h.text, start, end });
  }

  placed.sort((a, b) => a.start - b.start);

  const segments: ParagraphSegment[] = [];
  let cursor = 0;
  for (const r of placed) {
    if (r.start > cursor) segments.push({ text: paragraph.slice(cursor, r.start) });
    segments.push({ text: r.text, id: r.id });
    cursor = r.end;
  }
  if (cursor < paragraph.length) segments.push({ text: paragraph.slice(cursor) });
  return segments;
}
