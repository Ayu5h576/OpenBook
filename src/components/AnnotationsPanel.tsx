import React from 'react';
import { X, Trash2, Highlighter, StickyNote, BookMarked } from 'lucide-react';
import type { Note, Highlight } from '../hooks/useNotes';
import { HIGHLIGHT_DOT_BG } from '../utils/highlightStyles';

interface AnnotationsPanelProps {
  open: boolean;
  onClose: () => void;
  /** Entry resolution is still in flight — show nothing but a skeleton. */
  pending: boolean;
  /** The book is not in the reader's library yet, so there is nowhere to store. */
  hasEntry: boolean;
  onAddToLibrary: () => void;
  addingToLibrary: boolean;
  loading: boolean;
  notes: Note[];
  highlights: Highlight[];
  onDeleteNote: (id: string) => void;
  onDeleteHighlight: (id: string) => void;
}

function chapterLabel(chapter?: number): string {
  return chapter ? `Chapter ${chapter}` : '';
}

/**
 * Right-hand drawer listing the reader's notes and highlights for the book in
 * hand, newest first. Highlights carry their color chip so a row reads as the
 * passage it marks; notes are the reader's own words. Each row deletes in place.
 */
export const AnnotationsPanel: React.FC<AnnotationsPanelProps> = ({
  open,
  onClose,
  pending,
  hasEntry,
  onAddToLibrary,
  addingToLibrary,
  loading,
  notes,
  highlights,
  onDeleteNote,
  onDeleteHighlight,
}) => {
  if (!open) return null;

  const empty = !loading && notes.length === 0 && highlights.length === 0;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[var(--ink)] text-[var(--bg-ivory)] p-6 shadow-2xl border-l border-white/20 overflow-y-auto">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
        <div className="flex items-center gap-2 text-[#E0A96D] text-xs font-bold uppercase tracking-wider">
          <BookMarked className="w-4 h-4" />
          <span>Notes & Highlights</span>
        </div>
        <button onClick={onClose} aria-label="Close notes panel" className="text-xs text-[#A0A0A0] hover:text-white">
          Close
        </button>
      </div>

      {pending ? (
        <p className="text-xs text-[#A0A0A0]">Loading your annotations…</p>
      ) : !hasEntry ? (
        <div className="text-center py-10 space-y-4">
          <Highlighter className="w-8 h-8 mx-auto text-white/40" />
          <p className="text-xs text-[#A0A0A0] leading-relaxed">
            Add this book to your library to take notes and highlights in the reading room.
          </p>
          <button
            onClick={onAddToLibrary}
            disabled={addingToLibrary}
            className="px-4 py-2 rounded-full bg-[#E0A96D] text-[var(--ink)] text-xs font-bold hover:bg-[#D49A5B] transition-all disabled:opacity-50"
          >
            {addingToLibrary ? 'Adding…' : 'Add to library'}
          </button>
        </div>
      ) : loading ? (
        <p className="text-xs text-[#A0A0A0]">Loading your annotations…</p>
      ) : empty ? (
        <p className="text-xs text-[#A0A0A0] leading-relaxed">
          Select a passage to highlight it, or open this panel to review your notes. Select text in the
          chapter and a toolbar will appear above it.
        </p>
      ) : (
        <div className="space-y-5">
          {highlights.length > 0 && (
            <section>
              <h4 className="text-[10px] uppercase tracking-wider text-white/50 mb-2 flex items-center gap-1.5">
                <Highlighter className="w-3 h-3" /> Highlights
              </h4>
              <ul className="space-y-2">
                {highlights.map((h) => (
                  <li key={h.id} className="group flex items-start gap-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span
                      className="mt-1.5 w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: HIGHLIGHT_DOT_BG[h.color as keyof typeof HIGHLIGHT_DOT_BG] ?? '#F5C542' }}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed text-[#E0E1DD] line-clamp-3">{h.text}</p>
                      {chapterLabel(h.chapter) && (
                        <p className="text-[10px] text-white/40 mt-1">{chapterLabel(h.chapter)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteHighlight(h.id)}
                      aria-label="Delete highlight"
                      className="opacity-0 group-hover:opacity-100 text-white/50 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {notes.length > 0 && (
            <section>
              <h4 className="text-[10px] uppercase tracking-wider text-white/50 mb-2 flex items-center gap-1.5">
                <StickyNote className="w-3 h-3" /> Notes
              </h4>
              <ul className="space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className="group flex items-start gap-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed text-[#E0E1DD] whitespace-pre-wrap line-clamp-4">{n.text}</p>
                      {chapterLabel(n.chapter) && (
                        <p className="text-[10px] text-white/40 mt-1">{chapterLabel(n.chapter)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteNote(n.id)}
                      aria-label="Delete note"
                      className="opacity-0 group-hover:opacity-100 text-white/50 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
