import React, { useState } from 'react';
import { Quote } from '../types';
import { Quote as QuoteIcon, Heart, Share2, Plus, Sparkles } from 'lucide-react';

interface QuoteWallProps {
  quotes: Quote[];
}

export const QuoteWall: React.FC<QuoteWallProps> = ({ quotes }) => {
  const [quoteList, setQuoteList] = useState<Quote[]>(quotes);
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const categories = ['All', 'Architecture & Mind', 'Philosophy', 'Mystery', 'Craftsmanship'];

  const filteredQuotes = filterCategory === 'All'
    ? quoteList
    : quoteList.filter((q) => q.category === filterCategory);

  const toggleLike = (id: string) => {
    setQuoteList((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, isLiked: !q.isLiked, likes: q.isLiked ? q.likes - 1 : q.likes + 1 }
          : q
      )
    );
  };

  return (
    <div className="w-full bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-10 shadow-warm-md">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>Pinterest-Style Literary Board</span>
          </div>
          <h2 className="font-serif-title text-4xl font-bold text-[#1D1D1D] mb-1">Quote Wall</h2>
          <p className="text-sm text-[#777777]">
            A gallery of illuminated thoughts, marginalia, and resonant literary fragments.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterCategory === cat
                  ? 'bg-[#1D1D1D] text-[#F8F6F1]'
                  : 'bg-[#F8F6F1] border border-[#E5E0D8] text-[#1D1D1D] hover:bg-[#EFE8DD]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Masonry Style Grid */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {filteredQuotes.map((q) => (
          <div
            key={q.id}
            className="break-inside-avoid bg-[#F8F6F1] border border-[#E5E0D8] hover:border-[#1D1D1D] rounded-2xl p-6 shadow-warm-sm hover:shadow-warm-md transition-all flex flex-col justify-between group"
          >
            <div>
              <QuoteIcon className="w-6 h-6 text-[#A0522D] mb-3 opacity-80" />
              <p className="font-serif-title text-xl md:text-2xl font-bold text-[#1D1D1D] leading-snug mb-4">
                "{q.text}"
              </p>
            </div>

            <div className="pt-4 border-t border-[#E5E0D8] flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-[#1D1D1D] block">{q.author}</span>
                <span className="text-[11px] text-[#777777] italic">{q.bookTitle}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleLike(q.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    q.isLiked ? 'bg-red-50 text-red-600' : 'bg-white text-[#777777] hover:text-[#1D1D1D]'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${q.isLiked ? 'fill-current' : ''}`} />
                  <span>{q.likes}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
