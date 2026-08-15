import React from 'react';
import { Book } from '../types';
import { History, Star, Quote as QuoteIcon, Calendar, Heart } from 'lucide-react';

interface BookMemoriesProps {
  completedBooks: Book[];
}

export const BookMemories: React.FC<BookMemoriesProps> = ({ completedBooks }) => {
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
          Every finished volume leaves a lingering resonance. Here are your generated memory cards capturing top takeaways, finishing dates, and favorite quotes.
        </p>
      </div>

      {/* Memory Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {completedBooks.map((book) => {
          const mem = book.memoryCard;
          if (!mem) return null;

          return (
            <div
              key={book.id}
              className="bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl p-6 flex flex-col justify-between shadow-warm-sm hover:shadow-warm-md transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-beige)] text-[#A0522D] px-2.5 py-1 rounded-full">
                    {mem.moodTag}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{mem.finishedDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <img src={book.cover} alt={book.title} className="w-12 h-16 rounded object-cover shadow-warm-sm" />
                  <div>
                    <h4 className="font-serif-title text-xl font-bold text-[var(--ink)] group-hover:text-[#A0522D] transition-colors">{book.title}</h4>
                    <p className="text-xs text-[var(--muted)]">by {book.author}</p>
                  </div>
                </div>

                <div className="bg-[var(--white)] p-4 rounded-xl border border-[var(--border-light)] mb-4">
                  <QuoteIcon className="w-4 h-4 text-[#A0522D] mb-1" />
                  <p className="font-serif-title italic text-sm text-[var(--ink)] leading-snug">
                    "{mem.quote}"
                  </p>
                </div>

                <div className="text-xs text-[var(--muted)]">
                  <span className="font-bold text-[var(--ink)] block mb-0.5">Top Essence:</span>
                  <p className="line-clamp-2">{mem.topTakeaway}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-[#B8860B]">
                  {[...Array(mem.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <span className="text-[11px] text-[var(--muted)]">Keepsake Saved</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
