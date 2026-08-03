import React, { useState } from 'react';
import { Book, ViewMode } from '../types';
import { BookDetailSkeleton } from '../components/Skeleton';
import { BookOpen, Heart, Bookmark, Share2, Download, Star, ArrowLeft, Play, Sparkles, MessageSquare, Highlighter, FileText } from 'lucide-react';

interface BookDetailViewProps {
  book: Book;
  onNavigate: (view: ViewMode) => void;
  onOpenReader: (book: Book) => void;
  onToggleFavorite: (id: string) => void;
  onToggleWishlist: (id: string) => void;
  relatedBooks: Book[];
  isLoading?: boolean;
}

export const BookDetailView: React.FC<BookDetailViewProps> = ({
  book,
  onNavigate,
  onOpenReader,
  onToggleFavorite,
  onToggleWishlist,
  relatedBooks,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'comments' | 'ai-insights'>('overview');
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-8 pb-12">
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#777777] hover:text-[#1D1D1D] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <BookDetailSkeleton />
      </div>
    );
  }

  const fetchAiAnalysis = async (type: string) => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Analyze the literary significance, core themes, and structural craftsmanship of "${book.title}" by ${book.author}.`,
          context: book.description,
          type
        }),
      });
      const data = await res.json();
      setAiAnalysis(data.response);
    } catch (err) {
      setAiAnalysis("Failed to load analysis");
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Back Button */}
      <button
        onClick={() => onNavigate('home')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#777777] hover:text-[#1D1D1D] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </button>

      {/* Main Bookstore Showcase Card */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-10 shadow-warm-lg grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        
        {/* Large 3D Cover */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="w-56 sm:w-64 h-80 sm:h-96 rounded-2xl overflow-hidden shadow-book border border-[#E5E0D8] bg-[#EFE8DD] relative group transform hover:rotate-y-3 transition-transform duration-500">
            <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/20 to-transparent" />
          </div>

          {/* Quick Actions Under Cover */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => onToggleFavorite(book.id)}
              className={`p-3 rounded-2xl border transition-all ${
                book.favorite ? 'bg-red-50 border-red-200 text-red-600' : 'border-[#E5E0D8] text-[#1D1D1D] hover:bg-[#F8F6F1]'
              }`}
              title="Favorite Volume"
            >
              <Heart className={`w-5 h-5 ${book.favorite ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={() => onToggleWishlist(book.id)}
              className={`p-3 rounded-2xl border transition-all ${
                book.status === 'wishlist' ? 'bg-[#1D1D1D] text-[#F8F6F1]' : 'border-[#E5E0D8] text-[#1D1D1D] hover:bg-[#F8F6F1]'
              }`}
              title="Save to Wishlist"
            >
              <Bookmark className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert("Book link copied to clipboard!");
              }}
              className="p-3 rounded-2xl border border-[#E5E0D8] text-[#1D1D1D] hover:bg-[#F8F6F1] transition-all"
              title="Share Volume"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Book Information Details */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
          
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {book.genres.map((g) => (
                <span key={g} className="text-[11px] font-bold uppercase tracking-wider bg-[#EFE8DD] text-[#A0522D] px-3 py-1 rounded-full">
                  {g}
                </span>
              ))}
            </div>

            <h1 className="font-serif-title text-4xl sm:text-5xl font-bold text-[#1D1D1D] mb-2">
              {book.title}
            </h1>

            <p className="text-base text-[#777777] font-medium">
              by <span className="text-[#1D1D1D] font-bold underline cursor-pointer" onClick={() => onNavigate('author')}>{book.author}</span>
            </p>

            {/* Rating Stars & Metadata Grid */}
            <div className="flex items-center gap-4 my-4 text-xs">
              <div className="flex items-center gap-1.5 text-[#B8860B] font-bold bg-[#FFF8E7] px-3 py-1 rounded-full">
                <Star className="w-4 h-4 fill-current" />
                <span>{book.rating}</span>
                <span className="text-[#777777] font-normal">({book.reviewCount} reviews)</span>
              </div>
              <span className="text-[#777777]">•</span>
              <span className="text-[#777777]">{book.pages} pages</span>
              <span className="text-[#777777]">•</span>
              <span className="text-[#777777]">{book.language}</span>
            </div>

            {/* Description */}
            <p className="text-sm text-[#777777] leading-relaxed font-normal my-4">
              {book.description}
            </p>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-[#E5E0D8]">
            <button
              onClick={() => onOpenReader(book)}
              className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#1D1D1D] text-[#F8F6F1] font-bold text-sm hover:bg-[#333333] transition-all shadow-warm-md"
            >
              <BookOpen className="w-4 h-4" />
              <span>Read Now</span>
            </button>

            <button
              onClick={() => setShowTrailerModal(true)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#EFE8DD] text-[#1D1D1D] font-bold text-sm hover:bg-[#E5DCCF] transition-all"
            >
              <Play className="w-4 h-4 fill-current text-[#A0522D]" />
              <span>Book Trailer</span>
            </button>

            <button
              onClick={() => fetchAiAnalysis('summary')}
              className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#FFFFFF] border border-[#E5E0D8] text-[#1D1D1D] font-bold text-sm hover:bg-[#EFE8DD] transition-all shadow-warm-sm"
            >
              <Sparkles className="w-4 h-4 text-[#B8860B]" />
              <span>AI Literary Summary</span>
            </button>
          </div>

          {/* Metadata Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#F8F6F1] rounded-2xl border border-[#E5E0D8] text-xs">
            <div>
              <span className="text-[#777777] block text-[10px] uppercase font-semibold">Publisher</span>
              <span className="font-bold text-[#1D1D1D]">{book.publisher}</span>
            </div>
            <div>
              <span className="text-[#777777] block text-[10px] uppercase font-semibold">Published</span>
              <span className="font-bold text-[#1D1D1D]">{book.publishedYear}</span>
            </div>
            <div>
              <span className="text-[#777777] block text-[10px] uppercase font-semibold">ISBN</span>
              <span className="font-bold text-[#1D1D1D] font-mono">{book.isbn}</span>
            </div>
            <div>
              <span className="text-[#777777] block text-[10px] uppercase font-semibold">Format</span>
              <span className="font-bold text-[#1D1D1D]">Digital E-Book</span>
            </div>
          </div>

        </div>
      </div>

      {/* AI Analysis Modal / Container */}
      {aiAnalysis && (
        <div className="bg-[#1D1D1D] text-[#F8F6F1] rounded-3xl p-6 md:p-8 shadow-warm-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[#333333] pb-3">
            <div className="flex items-center gap-2 text-[#E0A96D] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Gemini AI Editorial Synthesis</span>
            </div>
            <button onClick={() => setAiAnalysis(null)} className="text-xs text-[#A0A0A0] hover:text-white">Close</button>
          </div>
          <div className="text-xs sm:text-sm leading-relaxed text-[#E0E1DD] whitespace-pre-wrap font-sans">
            {aiAnalysis}
          </div>
        </div>
      )}

      {/* Trailer Modal */}
      {showTrailerModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1D1D1D] text-white rounded-3xl p-6 max-w-xl w-full border border-white/20 shadow-2xl text-center">
            <h3 className="font-serif-title text-2xl font-bold mb-2">Atmospheric Book Trailer</h3>
            <p className="text-xs text-[#A0A0A0] mb-6">Visual and acoustic mood showcase for {book.title}</p>
            <div className="aspect-video bg-black/60 rounded-2xl flex items-center justify-center border border-white/10 mb-6">
              <Play className="w-12 h-12 text-[#E0A96D] animate-pulse" />
            </div>
            <button
              onClick={() => setShowTrailerModal(false)}
              className="px-6 py-2.5 rounded-full bg-[#E0A96D] text-[#1D1D1D] font-bold text-xs"
            >
              Close Trailer
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
