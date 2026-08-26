import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookCover } from './BookCover';
import { LoadMore } from './LoadMore';
import { useMemories } from '../hooks/useMemories';
import { History, Star, Quote as QuoteIcon, Calendar, Loader2, BookOpen } from 'lucide-react';
import { m, staggerListContainer, staggerListItem, SPRING_GENTLE } from '../motion';

/** The finishing date, which arrives as an ISO string rather than a label. */
const finishedLabel = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Keepsakes for finished books, assembled server-side from rows the reader
 * actually wrote — a review, a starred quote, a highlight, a note.
 *
 * Every field past the cover is nullable on purpose: a book finished without
 * annotating anything gets a card with a title and a date, and the parts that
 * are missing are simply absent. Nothing here invents a takeaway to fill space.
 */
export const BookMemories: React.FC = () => {
  const navigate = useNavigate();
  const { memories, total, loading, loadingMore, error, hasMore, loadMore } = useMemories();

  return (
    <div className="w-full bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-10 shadow-warm-md">

      {/* Header */}
      <div className="max-w-2xl mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] text-xs font-semibold mb-3">
          <History className="w-3.5 h-3.5 text-[#A0522D]" />
          <span>Finished Reading Keepsakes</span>
        </div>
        <h2 className="font-serif-title text-4xl font-bold text-[var(--ink)] mb-2">Book Memories</h2>
        <p className="text-sm text-[var(--muted)]">
          Every finished volume leaves a lingering resonance. Here are your memory cards, drawn from the
          ratings, quotes and notes you left behind.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 text-sm text-red-700 mb-8">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#A0522D]" />
        </div>
      ) : memories.length === 0 ? (
        <div className="text-center py-16 bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl">
          <BookOpen className="w-12 h-12 text-[var(--border-light)] mx-auto mb-3" />
          <p className="font-serif-title text-xl text-[var(--ink)]">No keepsakes yet.</p>
          <p className="text-xs text-[var(--muted)] mt-1">
            Mark a book <span className="font-semibold">Completed</span> in your{' '}
            <button onClick={() => navigate('/library')} className="text-[#A0522D] hover:underline">
              library
            </button>{' '}
            and its card appears here.
          </p>
        </div>
      ) : (
        <>
          {/* Memory Cards Grid */}
          <m.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={staggerListContainer}
            initial="initial"
            animate="animate"
          >
            {memories.map((mem) => {
              const book = mem.book;
              // Decimal(3,1), so 4.5 is a legitimate rating — round to whole stars
              // and drop the row entirely when the book was never rated.
              const stars = mem.rating === null ? 0 : Math.max(0, Math.min(5, Math.round(mem.rating)));

              return (
                <m.div
                  key={mem.entryId}
                  variants={staggerListItem}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.985 }}
                  transition={SPRING_GENTLE}
                  onClick={() => navigate(`/book/${book.id}`)}
                  className="bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl p-6 flex flex-col justify-between shadow-warm-sm hover:shadow-warm-md transition-all group cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4 gap-2">
                      {mem.moodTag ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-beige)] text-[#A0522D] px-2.5 py-1 rounded-full truncate">
                          {mem.moodTag}
                        </span>
                      ) : (
                        <span />
                      )}
                      <div className="flex items-center gap-1 text-xs text-[var(--muted)] shrink-0">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{finishedLabel(mem.finishedDate)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <BookCover
                        title={book.title}
                        author={book.authors?.[0]}
                        coverUrl={book.coverImage}
                        isbn13={book.isbn13}
                        isbn10={book.isbn10}
                        className="w-12 h-16 rounded object-cover shadow-warm-sm"
                      />
                      <div className="min-w-0">
                        <h4 className="font-serif-title text-xl font-bold text-[var(--ink)] group-hover:text-[#A0522D] transition-colors truncate">
                          {book.title}
                        </h4>
                        <p className="text-xs text-[var(--muted)] truncate">
                          by {book.authors?.length ? book.authors.join(', ') : 'Unknown Author'}
                        </p>
                      </div>
                    </div>

                    {mem.quote && (
                      <div className="bg-[var(--white)] p-4 rounded-xl border border-[var(--border-light)] mb-4">
                        <QuoteIcon className="w-4 h-4 text-[#A0522D] mb-1" />
                        <p className="font-serif-title italic text-sm text-[var(--ink)] leading-snug line-clamp-4">
                          "{mem.quote}"
                        </p>
                      </div>
                    )}

                    {mem.topTakeaway && (
                      <div className="text-xs text-[var(--muted)]">
                        <span className="font-bold text-[var(--ink)] block mb-0.5">Top Essence:</span>
                        <p className="line-clamp-2">{mem.topTakeaway}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-xs">
                    {stars > 0 ? (
                      <div className="flex items-center gap-1 text-[#B8860B]">
                        {Array.from({ length: stars }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[var(--muted)] italic">Not rated</span>
                    )}
                    <span className="text-[11px] text-[var(--muted)]">
                      {mem.isFavorite ? 'Favourite' : 'Keepsake Saved'}
                    </span>
                  </div>
                </m.div>
              );
            })}
          </m.div>

          <LoadMore
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
            endLabel={`${total} ${total === 1 ? 'book' : 'books'} finished`}
          />
        </>
      )}
    </div>
  );
};
