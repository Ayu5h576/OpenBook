import React from 'react';
import { Book, ViewMode } from '../types';
import { BookCard3D } from '../components/BookCard3D';
import { HeroSkeleton, BookCardSkeleton } from '../components/Skeleton';
import { RecommendedForYou } from '../components/RecommendedForYou';
import { Sparkles, ArrowRight, Play, BookOpen, Flame, Compass, Star } from 'lucide-react';

interface HomeViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onOpenReader: (book: Book) => void;
  onNavigate: (view: ViewMode) => void;
  onAddBookToWishlist?: (recommendation: Partial<Book>) => void;
  isLoading?: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({
  books,
  onSelectBook,
  onOpenReader,
  onNavigate,
  onAddBookToWishlist,
  isLoading = false,
}) => {
  const continueReadingBook = books.find((b) => b.status === 'reading') || books[0];
  const recentlyOpened = books.filter((b) => b.progress > 0);
  const newReleases = books.filter((b) => b.publishedYear >= 2023);

  if (isLoading) {
    return (
      <div className="space-y-10 pb-12">
        <HeroSkeleton />
        <section className="space-y-4">
          <div className="w-48 h-6 bg-[#EFE8DD] rounded-md animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <BookCardSkeleton />
            <BookCardSkeleton />
            <BookCardSkeleton />
            <BookCardSkeleton />
          </div>
        </section>
        <section className="space-y-4">
          <div className="w-56 h-6 bg-[#EFE8DD] rounded-md animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <BookCardSkeleton />
            <BookCardSkeleton />
            <BookCardSkeleton />
            <BookCardSkeleton />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      
      {/* Hero: Continue Reading Highlight (Apple Books Style) */}
      {continueReadingBook && (
        <section className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-md relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
          
          <div className="w-40 sm:w-48 h-60 sm:h-72 rounded-2xl overflow-hidden shadow-book flex-shrink-0 bg-[#EFE8DD] relative group cursor-pointer" onClick={() => onSelectBook(continueReadingBook)}>
            <img src={continueReadingBook.cover} alt={continueReadingBook.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            <div className="absolute top-3 left-3 bg-[#1D1D1D]/90 text-[#F8F6F1] text-[10px] font-semibold px-2.5 py-1 rounded-full">
              {continueReadingBook.progress}% Read
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#A0522D] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Resume Reading Session</span>
            </div>

            <div>
              <h2 className="font-serif-title text-3xl sm:text-4xl font-bold text-[#1D1D1D] mb-1">
                {continueReadingBook.title}
              </h2>
              <p className="text-sm text-[#777777]">by {continueReadingBook.author} • {continueReadingBook.publisher}</p>
            </div>

            <p className="text-xs text-[#777777] line-clamp-2 max-w-xl font-normal leading-relaxed">
              {continueReadingBook.description}
            </p>

            {/* Reading Progress Bar */}
            <div className="max-w-md pt-2">
              <div className="flex justify-between text-xs text-[#777777] mb-1">
                <span>Page {continueReadingBook.pagesRead} of {continueReadingBook.pages}</span>
                <span>{continueReadingBook.progress}% Complete</span>
              </div>
              <div className="w-full bg-[#EFE8DD] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#1D1D1D] h-full rounded-full transition-all duration-500"
                  style={{ width: `${continueReadingBook.progress}%` }}
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-4">
              <button
                onClick={() => onOpenReader(continueReadingBook)}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-[#1D1D1D] text-[#F8F6F1] font-bold text-xs hover:bg-[#333333] transition-all shadow-warm-md"
              >
                <BookOpen className="w-4 h-4" />
                <span>Continue Reading</span>
              </button>

              <button
                onClick={() => onSelectBook(continueReadingBook)}
                className="px-5 py-3 rounded-full bg-[#EFE8DD] text-[#1D1D1D] font-bold text-xs hover:bg-[#E5DCCF] transition-all"
              >
                Book Details
              </button>
            </div>
          </div>

        </section>
      )}

      {/* Gemini AI Powered "Recommended for You" Section */}
      <RecommendedForYou
        userBooks={books}
        onSelectBook={onSelectBook}
        onAddBookToWishlist={onAddBookToWishlist}
      />

      {/* Recently Opened Volumes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D]">Recently Opened</h3>
          <button onClick={() => onNavigate('library')} className="text-xs font-semibold text-[#1D1D1D] hover:underline flex items-center gap-1">
            <span>Library</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recentlyOpened.map((book) => (
            <BookCard3D key={book.id} book={book} onSelect={onSelectBook} />
          ))}
        </div>
      </section>

      {/* New Releases Banner */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D]">New Releases</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {newReleases.map((book) => (
            <BookCard3D key={book.id} book={book} onSelect={onSelectBook} layout="horizontal" />
          ))}
        </div>
      </section>

    </div>
  );
};
