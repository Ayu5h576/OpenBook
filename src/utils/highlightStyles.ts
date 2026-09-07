/**
 * Visual constants for the five highlight colors.
 *
 * Kept as data (not inline classes) so the selection toolbar dots, the <mark>
 * replay in the reader, and the annotation rows in the panel all agree on what
 * "sage" looks like. Backgrounds are translucent so they read over both the
 * ivory/parchment themes and the dark ones — the paragraph text color is
 * inherited and never replaced.
 */
import type { HighlightColor } from '../hooks/useNotes';

/** Translucent fill for a rendered <mark> of that color. */
export const HIGHLIGHT_MARK_BG: Record<HighlightColor, string> = {
  amber: 'rgba(245, 197, 66, 0.38)',
  sage: 'rgba(110, 180, 140, 0.38)',
  rose: 'rgba(236, 110, 130, 0.32)',
  sky: 'rgba(80, 170, 220, 0.32)',
  lavender: 'rgba(160, 140, 230, 0.34)',
};

/** Solid fill for the small color dots (toolbar + list rows). */
export const HIGHLIGHT_DOT_BG: Record<HighlightColor, string> = {
  amber: '#F5C542',
  sage: '#6EB48C',
  rose: '#EC6E82',
  sky: '#50AADC',
  lavender: '#A08CE6',
};
