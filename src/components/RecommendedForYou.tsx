import React, { useState, useEffect } from 'react';
import { Book } from '../types';
import { AIApiService, AIRecommendation } from '../services/api';
import { Sparkles, RefreshCw, BookOpen, Plus, Check, Star, Compass, Bookmark, Lightbulb, ArrowRight } from 'lucide-react';

interface RecommendationItem {
  id: string;
  title: string;
  author: string;
  genre: string;
  matchPercentage: number;
  basedOnBook: string;
  personalizedSummary: string;
  cover: string;
  rating: number;
  pages: number;
}

function toRecommendationItem(rec: AIRecommendation, index: number): RecommendationItem {
  return {
    id: rec.bookId || `${rec.title}-${index}`,
    title: rec.title,
    author: rec.authors.join(', ') || 'Unknown author',
    genre: rec.categories[0] || 'Personalized pick',
    matchPercentage: rec.matchScore,
    basedOnBook: rec.categories.slice(0, 2).join(', '),
    personalizedSummary: rec.reasoning,
    cover: rec.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    rating: 4.8,
    pages: 280,
  };
}

interface RecommendedForYouProps {
  userBooks: Book[];
  onSelectBook?: (book: Book) => void;
  onAddBookToWishlist?: (recommendation: Partial<Book>) => void;
}

export const RecommendedForYou: React.FC<RecommendedForYouProps> = ({
  userBooks,
  onSelectBook,
  onAddBookToWishlist,
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeFocus, setActiveFocus] = useState<string>('All Tastes');
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  const fetchRecommendations = async (focus?: string) => {
    setIsLoading(true);
    try {
      const response = await AIApiService.getReadingCompass({
        limit: 3,
        genres: focus && focus !== 'All Tastes' ? [focus] : undefined,
        useCache: false,
      });

      if (response.data) {
        setRecommendations(response.data.recommendations.map(toRecommendationItem));
        setAnalysisSummary(response.data.reasoning || '');
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations(activeFocus);
  }, [userBooks.length]);

  const handleFocusChange = (focus: string) => {
    setActiveFocus(focus);
    fetchRecommendations(focus);
  };

  const handleAddToWishlist = (rec: RecommendationItem) => {
    setAddedIds((prev) => ({ ...prev, [rec.id]: true }));
    if (onAddBookToWishlist) {
      onAddBookToWishlist({
        id: `rec-${Date.now()}-${rec.id}`,
        title: rec.title,
        author: rec.author,
        genres: [rec.genre],
        description: rec.personalizedSummary,
        cover: rec.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
        rating: rec.rating || 4.8,
        pages: rec.pages || 280,
        status: 'wishlist',
        favorite: false,
        pagesRead: 0,
        progress: 0,
        publishedYear: 2024,
        publisher: 'Recommended Publishing',
      });
    }
  };

  const focusChips = ['All Tastes', 'Fiction Focus', 'Philosophy & Essays', 'Design & Architecture', 'Fast Reads'];

  return (
    <section className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-md space-y-6 relative overflow-hidden">
      
      {/* Background Subtle Accent Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#EFE8DD]/40 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#A0522D] text-[11px] font-bold tracking-wide uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini AI Curation</span>
          </div>
          <h2 className="font-serif-title text-2xl md:text-3xl font-bold text-[#1D1D1D]">
            Recommended for You
          </h2>
          <p className="text-xs text-[#777777] mt-0.5">
            AI analysis of your reading patterns, favorite authors, and library genres
          </p>
        </div>

        {/* Refresh & Focus Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRecommendations(activeFocus)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#F8F6F1] border border-[#E5E0D8] text-xs font-semibold text-[#1D1D1D] hover:bg-[#EFE8DD] transition-all disabled:opacity-50"
            title="Re-analyze library with Gemini"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#A0522D]' : ''}`} />
            <span>{isLoading ? 'Analyzing...' : 'Refresh AI Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Preference Focus Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 z-10 relative">
        {focusChips.map((chip) => (
          <button
            key={chip}
            onClick={() => handleFocusChange(chip)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeFocus === chip
                ? 'bg-[#1D1D1D] text-[#F8F6F1] shadow-warm-sm'
                : 'bg-[#F8F6F1] text-[#777777] border border-[#E5E0D8] hover:text-[#1D1D1D] hover:bg-[#EFE8DD]'
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Gemini Literary Taste Analysis Banner */}
      {!isLoading && analysisSummary && (
        <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-4 flex items-start gap-3.5 text-xs text-[#1D1D1D] relative z-10">
          <div className="p-2 rounded-xl bg-[#EFE8DD] text-[#A0522D] flex-shrink-0 mt-0.5">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="font-bold text-[#A0522D] block mb-0.5">AI Library Digest</span>
            <p className="text-[#555555] leading-relaxed">{analysisSummary}</p>
          </div>
        </div>
      )}

      {/* Recommendations Grid / Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-5 space-y-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-20 h-28 bg-[#EFE8DD] rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-16 h-4 bg-[#EFE8DD] rounded-full" />
                  <div className="w-full h-5 bg-[#EFE8DD] rounded" />
                  <div className="w-24 h-4 bg-[#EFE8DD] rounded" />
                </div>
              </div>
              <div className="w-full h-12 bg-[#EFE8DD] rounded-xl" />
              <div className="w-full h-8 bg-[#EFE8DD] rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {recommendations.map((rec) => {
            const isAdded = addedIds[rec.id];

            return (
              <div
                key={rec.id}
                className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-5 hover:shadow-warm-lg hover:border-[#D0C8BC] transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Match Badge & Inspiration Source */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1D1D1D] text-[#F8F6F1] text-[10px] font-bold">
                      <Sparkles className="w-2.5 h-2.5 text-[#E0A96D]" />
                      <span>{rec.matchPercentage || 95}% Match</span>
                    </span>

                    {rec.basedOnBook && (
                      <span className="text-[10px] text-[#777777] font-medium truncate max-w-[140px]" title={`Inspired by ${rec.basedOnBook}`}>
                        Based on <span className="font-semibold text-[#1D1D1D]">{rec.basedOnBook}</span>
                      </span>
                    )}
                  </div>

                  {/* Book Info Block */}
                  <div className="flex gap-4 mb-4">
                    <div className="w-20 h-28 rounded-xl overflow-hidden shadow-book flex-shrink-0 bg-[#EFE8DD] relative group-hover:scale-105 transition-transform">
                      <img
                        src={rec.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'}
                        alt={rec.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A0522D] block">
                        {rec.genre}
                      </span>
                      <h4 className="font-serif-title font-bold text-base text-[#1D1D1D] line-clamp-2 leading-tight">
                        {rec.title}
                      </h4>
                      <p className="text-xs text-[#777777]">by {rec.author}</p>

                      <div className="flex items-center gap-1 pt-1 text-[11px] text-[#777777]">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="font-semibold text-[#1D1D1D]">{rec.rating || 4.8}</span>
                        <span>•</span>
                        <span>{rec.pages || 280} pages</span>
                      </div>
                    </div>
                  </div>

                  {/* Personalized Gemini Summary */}
                  <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-xl p-3 mb-4 text-xs text-[#555555] leading-relaxed relative">
                    <span className="font-bold text-[#1D1D1D] text-[10px] uppercase tracking-wider block mb-1">
                      Personalized AI Curator Note
                    </span>
                    <p className="italic line-clamp-3">"{rec.personalizedSummary}"</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#E5E0D8]">
                  <button
                    onClick={() => handleAddToWishlist(rec)}
                    disabled={isAdded}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-semibold transition-all ${
                      isAdded
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-[#1D1D1D] text-[#F8F6F1] hover:bg-[#333333] shadow-warm-sm'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Saved to Wishlist</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Add to Wishlist</span>
                      </>
                    )}
                  </button>

                  {onSelectBook && (
                    <button
                      onClick={() =>
                        onSelectBook({
                          id: rec.id,
                          title: rec.title,
                          author: rec.author,
                          genres: [rec.genre],
                          description: rec.personalizedSummary,
                          cover: rec.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
                          rating: rec.rating || 4.8,
                          pages: rec.pages || 280,
                          status: 'wishlist',
                          favorite: false,
                          pagesRead: 0,
                          progress: 0,
                          publishedYear: 2024,
                          publisher: 'Recommended',
                        })
                      }
                      className="p-2 rounded-full bg-[#EFE8DD] text-[#1D1D1D] hover:bg-[#E5DCCF] transition-all"
                      title="Inspect Volume Details"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
