import React from 'react';
import { Book } from '../types';
import { useAIHome } from '../hooks/useAI';
import { Dna, Brain, Clock, Compass } from 'lucide-react';

interface BookDNAProps {
  books: Book[];
}

export const BookDNA: React.FC<BookDNAProps> = ({ books }) => {
  const readBooks = books.filter((book) => book.status === 'completed' || book.progress > 0);
  const ai = useAIHome();
  const insights = ai.insights.data?.insights;
  const genreStrands = insights?.favoriteGenres?.slice(0, 5) ?? [];

  return (
    <div className="w-full bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-10 shadow-warm-md">
      <div className="max-w-2xl mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold mb-3">
          <Dna className="w-3.5 h-3.5 text-[#A0522D]" />
          <span>Personal Reading Genome</span>
        </div>
        <h2 className="font-serif-title text-4xl font-bold text-[#1D1D1D] mb-2">Your Book DNA</h2>
        <p className="text-sm text-[#777777]">
          Built from your authenticated library, wishlist, reviews, reading sessions, and goal history.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-6">
          <div className="w-10 h-10 rounded-xl bg-[#1D1D1D] text-[#F8F6F1] flex items-center justify-center mb-4">
            <Brain className="w-5 h-5" />
          </div>
          <span className="text-xs uppercase font-semibold text-[#777777] tracking-wider">Prose Signature</span>
          <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D] my-1">
            {genreStrands[0]?.genre ?? 'Learning Your Style'}
          </h3>
          <p className="text-xs text-[#777777] leading-relaxed">
            {insights?.moodPattern ?? 'Add ratings, notes, highlights, and sessions to help OpenBook infer your strongest reading patterns.'}
          </p>
        </div>

        <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-6">
          <div className="w-10 h-10 rounded-xl bg-[#A0522D] text-[#FFFFFF] flex items-center justify-center mb-4">
            <Compass className="w-5 h-5" />
          </div>
          <span className="text-xs uppercase font-semibold text-[#777777] tracking-wider">Taste Trajectory</span>
          <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D] my-1">
            {insights?.readingTrend ?? 'Stable'}
          </h3>
          <p className="text-xs text-[#777777] leading-relaxed">
            {insights?.nextLikelyBook?.reasoning ?? 'Recommendations will sharpen as your wishlist and completed books grow.'}
          </p>
        </div>

        <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-6">
          <div className="w-10 h-10 rounded-xl bg-[#2D4030] text-[#FFFFFF] flex items-center justify-center mb-4">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-xs uppercase font-semibold text-[#777777] tracking-wider">Reading Velocity</span>
          <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D] my-1">
            {insights?.readingSpeed ?? 0} Pages / Hour
          </h3>
          <p className="text-xs text-[#777777] leading-relaxed">
            Based on logged sessions across {readBooks.length} active or completed books.
          </p>
        </div>
      </div>

      <div className="bg-[#F8F6F1] rounded-2xl p-6 border border-[#E5E0D8]">
        <h4 className="font-serif-title text-xl font-bold text-[#1D1D1D] mb-4">Genre Affinity Strands</h4>
        <div className="space-y-4">
          {(genreStrands.length ? genreStrands : [{ genre: 'Add books to build strands', percentage: 0 }]).map((strand) => (
            <div key={strand.genre}>
              <div className="flex justify-between text-xs font-medium text-[#1D1D1D] mb-1">
                <span>{strand.genre}</span>
                <span>{strand.percentage}%</span>
              </div>
              <div className="w-full bg-[#EFE8DD] h-2.5 rounded-full overflow-hidden">
                <div className="bg-[#A0522D] h-full rounded-full" style={{ width: `${strand.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
