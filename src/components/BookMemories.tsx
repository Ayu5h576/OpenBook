import React from 'react';
import { Book } from '../types';
import { History, Star, Quote as QuoteIcon, Calendar, Heart } from 'lucide-react';

interface BookMemoriesProps {
  completedBooks: Book[];
}

export const BookMemories: React.FC<BookMemoriesProps> = ({ completedBooks }) => {
  return (
    <div className="w-full bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-10 shadow-warm-md">
      
      {/* Header */}
      <div className="max-w-2xl mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold mb-3">
          <History className="w-3.5 h-3.5 text-[#A0522D]" />
          <span>Finished Reading Keepsakes</span>
        </div>
        <h2 className="font-serif-title text-4xl font-bold text-[#1D1D1D] mb-2">Book Memories</h2>
        <p className="text-sm text-[#777777]">
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
              className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-6 flex flex-col justify-between shadow-warm-sm hover:shadow-warm-md transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EFE8DD] text-[#A0522D] px-2.5 py-1 rounded-full">
                    {mem.moodTag}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-[#777777]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{mem.finishedDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <img src={book.cover} alt={book.title} className="w-12 h-16 rounded object-cover shadow-warm-sm" />
                  <div>
                    <h4 className="font-serif-title text-xl font-bold text-[#1D1D1D] group-hover:text-[#A0522D] transition-colors">{book.title}</h4>
                    <p className="text-xs text-[#777777]">by {book.author}</p>
                  </div>
                </div>

                <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E0D8] mb-4">
                  <QuoteIcon className="w-4 h-4 text-[#A0522D] mb-1" />
                  <p className="font-serif-title italic text-sm text-[#1D1D1D] leading-snug">
                    "{mem.quote}"
                  </p>
                </div>

                <div className="text-xs text-[#777777]">
                  <span className="font-bold text-[#1D1D1D] block mb-0.5">Top Essence:</span>
                  <p className="line-clamp-2">{mem.topTakeaway}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E5E0D8] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-[#B8860B]">
                  {[...Array(mem.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <span className="text-[11px] text-[#777777]">Keepsake Saved</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
