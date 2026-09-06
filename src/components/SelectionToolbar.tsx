import React from 'react';
import { StickyNote, X } from 'lucide-react';
import { HIGHLIGHT_COLORS, HighlightColor } from '../hooks/useNotes';
import { HIGHLIGHT_DOT_BG } from '../utils/highlightStyles';

interface SelectionToolbarProps {
  /** Viewport coords of the toolbar's top-left corner, clamped on-screen. */
  x: number;
  y: number;
  /** The passage the reader just selected, stored verbatim. */
  quote: string;
  onHighlight: (color: HighlightColor) => void;
  onNote: () => void;
  onClose: () => void;
}

/**
 * Floating toolbar shown above a text selection in the reading room.
 *
 * It receives the selected text and screen position rather than reading the
 * live Selection itself, because by the time a toolbar button is clicked the
 * browser has usually collapsed the selection. ReaderView captures the text and
 * its rect on mouse-up and hands them down.
 */
export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  x,
  y,
  quote,
  onHighlight,
  onNote,
  onClose,
}) => {
  if (!quote) return null;

  return (
    <div
      role="toolbar"
      aria-label="Annotate selection"
      className="fixed z-[60] flex items-center gap-1 rounded-full bg-[var(--ink)] px-2 py-1.5 shadow-2xl border border-white/10"
      style={{ left: x, top: y }}
    >
      {HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          title={`Highlight in ${color}`}
          aria-label={`Highlight in ${color}`}
          onClick={() => onHighlight(color)}
          className="w-5 h-5 rounded-full border border-white/30 hover:scale-110 transition-transform"
          style={{ backgroundColor: HIGHLIGHT_DOT_BG[color] }}
        />
      ))}

      <span className="w-px h-4 bg-white/20 mx-0.5" aria-hidden="true" />

      <button
        type="button"
        title="Add a note"
        aria-label="Add a note about this passage"
        onClick={onNote}
        className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
      >
        <StickyNote className="w-4 h-4" />
      </button>

      <button
        type="button"
        title="Dismiss"
        aria-label="Dismiss toolbar"
        onClick={onClose}
        className="p-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
