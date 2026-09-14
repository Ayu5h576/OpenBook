import React, { useState } from 'react';
import { useQuotes, useQuoteCategories } from '../hooks/useQuotes';
import { useLibrary } from '../hooks/useLibrary';
import { LoadMore } from '../components/LoadMore';
import { timeAgo } from '../utils/timeAgo';
import { Quote as QuoteIcon, Heart, Trash2, Plus, Sparkles, Loader2, X } from 'lucide-react';
import { m, staggerListContainer, staggerListItem } from '../motion';

/**
 * The two chips that are not categories. Sentinels rather than plain strings so
 * a reader who files a quote under the literal category "All" doesn't collide
 * with the filter.
 */
const ALL = '\u0000all';
const STARRED = '\u0000starred';

/** How much of the shelf the composer's book picker offers. */
const COMPOSER_SHELF_PAGE = 100;

interface ComposerProps {
  onSave: (input: { text: string; bookId?: string; page?: number; category?: string }) => Promise<unknown>;
  onClose: () => void;
  saving: boolean;
  /** The categories already in use, offered as a datalist rather than a closed set. */
  knownCategories: string[];
}

/**
 * Rendered only while the composer is open, which is also when its `useLibrary`
 * call runs — the wall itself has no reason to fetch a page of the shelf until
 * the reader actually wants to attach a quote to a book.
 */
const QuoteComposer: React.FC<ComposerProps> = ({ onSave, onClose, saving, knownCategories }) => {
  const { entries } = useLibrary(undefined, COMPOSER_SHELF_PAGE);
  const [text, setText] = useState('');
  const [bookId, setBookId] = useState('');
  const [page, setPage] = useState('');
  const [category, setCategory] = useState('');
  const [failed, setFailed] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;

    // `createQuoteSchema` wants a positive integer or nothing at all, so an empty
    // or junk field must not become `page: NaN`.
    const pageNum = parseInt(page, 10);

    try {
      setFailed(null);
      await onSave({
        text: body,
        bookId: bookId || undefined,
        page: Number.isFinite(pageNum) && pageNum > 0 ? pageNum : undefined,
        category: category.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setFailed(err instanceof Error ? err.message : 'Could not save that quote.');
    }
  };

  return (
    <form
      onSubmit={submit}
      className="bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl p-5 mb-8 shadow-warm-sm"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[var(--ink)]">Copy out a passage</span>
        <button
          type="button"
          onClick={onClose}
          className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          aria-label="Close composer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={2000}
        autoFocus
        placeholder="“It is a truth universally acknowledged…”"
        className="w-full bg-[var(--white)] border border-[var(--border-light)] rounded-xl px-4 py-3 font-serif-title text-lg text-[var(--ink)] placeholder:text-[var(--muted)] placeholder:font-sans placeholder:text-sm focus:outline-none focus:border-[var(--ink)] resize-none"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        <select
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
          className="bg-[var(--white)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--ink)]"
        >
          <option value="">No book — just a thought</option>
          {entries.map((entry) => (
            <option key={entry.id} value={entry.book.id}>
              {entry.book.title}
            </option>
          ))}
        </select>

        <input
          list="quote-wall-categories"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          maxLength={100}
          placeholder="Category (optional)"
          className="bg-[var(--white)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--ink)]"
        />
        <datalist id="quote-wall-categories">
          {knownCategories.map((cat) => (
            <option key={cat} value={cat} />
          ))}
        </datalist>

        <input
          type="number"
          min={1}
          value={page}
          onChange={(e) => setPage(e.target.value)}
          placeholder="Page (optional)"
          className="bg-[var(--white)] border border-[var(--border-light)] rounded-xl px-3 py-2 text-xs text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--ink)]"
        />
      </div>

      {failed && <p className="mt-3 text-xs text-red-600">{failed}</p>}

      <div className="flex justify-end mt-4">
        <button
          type="submit"
          disabled={saving || !text.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Pin to wall
        </button>
      </div>
    </form>
  );
};

/**
 * The reader's commonplace book, on live data.
 *
 * The chips come from the categories the reader has actually used, so one exists
 * for exactly as long as a quote uses it. Filtering happens server-side and the
 * wall is cursor-paginated, so a chip never filters a partial page in the
 * browser and quietly under-reports.
 */
export const QuoteWall: React.FC = () => {
  const [filter, setFilter] = useState<string>(ALL);
  const [composing, setComposing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { categories } = useQuoteCategories();
  const {
    quotes,
    total,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    addQuote,
    setFavorite,
    removeQuote,
    saving,
  } = useQuotes({
    category: filter === ALL || filter === STARRED ? undefined : filter,
    favorite: filter === STARRED ? true : undefined,
  });

  const chips = [
    { id: ALL, label: 'All' },
    { id: STARRED, label: 'Starred' },
    ...categories.map((c) => ({ id: c.category, label: `${c.category} · ${c.count}` })),
  ];

  return (
    <div className="w-full bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-10 shadow-warm-md">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>Pinterest-Style Literary Board</span>
          </div>
          <h2 className="font-serif-title text-4xl font-bold text-[var(--ink)] mb-1">Quote Wall</h2>
          <p className="text-sm text-[var(--muted)]">
            A gallery of illuminated thoughts, marginalia, and resonant literary fragments.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setFilter(chip.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === chip.id
                  ? 'bg-[var(--ink)] text-[var(--bg-ivory)]'
                  : 'bg-[var(--bg-ivory)] border border-[var(--border-light)] text-[var(--ink)] hover:bg-[var(--bg-beige)]'
              }`}
            >
              {chip.label}
            </button>
          ))}
          <button
            onClick={() => setComposing((open) => !open)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#A0522D] text-white text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            New quote
          </button>
        </div>
      </div>

      {composing && (
        <QuoteComposer
          onSave={addQuote}
          onClose={() => setComposing(false)}
          saving={saving}
          knownCategories={categories.map((c) => c.category)}
        />
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 text-sm text-red-700 mb-8">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
        </div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-16 bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl">
          <QuoteIcon className="w-12 h-12 text-[var(--border-light)] mx-auto mb-3" />
          <p className="font-serif-title text-xl text-[var(--ink)]">
            {filter === ALL ? 'Nothing on the wall yet.' : 'No quotes under this filter.'}
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">
            {filter === ALL
              ? 'Copy out a line that stayed with you and it will hang here.'
              : 'Try another chip, or pin something new.'}
          </p>
        </div>
      ) : (
        <>
          {/* Masonry Style Grid */}
          <m.div
            className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6"
            variants={staggerListContainer}
            initial="initial"
            animate="animate"
          >
            {quotes.map((q) => {
              const attribution = q.book?.authors?.[0] ?? 'Unattributed';
              const detail =
                [q.book?.title, q.page ? `p. ${q.page}` : null].filter(Boolean).join(' · ') ||
                timeAgo(q.createdAt, { granularity: 'justNow' });

              return (
                <m.div
                  key={q.id}
                  variants={staggerListItem}
                  className="break-inside-avoid bg-[var(--bg-ivory)] border border-[var(--border-light)] hover:border-[var(--ink)] rounded-2xl p-6 shadow-warm-sm hover:shadow-warm-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <QuoteIcon className="w-6 h-6 text-[var(--accent)] mb-3 opacity-80" />
                    <p className="font-serif-title text-xl md:text-2xl font-bold text-[var(--ink)] leading-snug mb-4">
                      "{q.text}"
                    </p>
                    {q.category && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-beige)] text-[var(--accent)] px-2.5 py-1 rounded-full">
                        {q.category}
                      </span>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[var(--border-light)] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-[var(--ink)] block">{attribution}</span>
                      <span className="text-[11px] text-[var(--muted)] italic">{detail}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {confirmDelete === q.id ? (
                        <>
                          <button
                            onClick={() => {
                              setConfirmDelete(null);
                              removeQuote(q.id);
                            }}
                            className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-semibold"
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2.5 py-1 rounded-full bg-[var(--white)] text-[var(--muted)] text-xs font-semibold hover:text-[var(--ink)]"
                          >
                            Keep
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            // The next state, not a toggle — two quick taps settle on
                            // what was asked for last instead of racing.
                            onClick={() => setFavorite(q.id, !q.isFavorite)}
                            aria-label={q.isFavorite ? 'Unstar this quote' : 'Star this quote'}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                              q.isFavorite ? 'bg-red-50 text-red-600' : 'bg-[var(--white)] text-[var(--muted)] hover:text-[var(--ink)]'
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${q.isFavorite ? 'fill-current' : ''}`} />
                            <span>{q.isFavorite ? 'Starred' : 'Star'}</span>
                          </button>
                          <button
                            onClick={() => setConfirmDelete(q.id)}
                            aria-label="Remove this quote"
                            className="p-1.5 rounded-full bg-[var(--white)] text-[var(--muted)] opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-red-600 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </m.div>
              );
            })}
          </m.div>

          <LoadMore
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
            endLabel={`${total} ${total === 1 ? 'quote' : 'quotes'} on the wall`}
          />
        </>
      )}
    </div>
  );
};
