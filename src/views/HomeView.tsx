import React from 'react';
import { Book, ViewMode } from '../types';
import { BookCard3D } from '../components/BookCard3D';
import { HeroSkeleton, BookCardSkeleton } from '../components/Skeleton';
import { RecommendedForYou } from '../components/RecommendedForYou';
import { useAIHome } from '../hooks/useAI';
import { useAuth } from '../hooks/useAuth';
import { Sparkles, ArrowRight, BookOpen, Flame, Compass, Star, RefreshCw } from 'lucide-react';

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
  const { user } = useAuth();
  const aiHome = useAIHome();
  const continueReadingBook = books.find((b) => b.status === 'reading') || books[0];
  const recentlyOpened = books.filter((b) => b.progress > 0);
  const newReleases = books.filter((b) => b.publishedYear >= 2023);
  const insight = aiHome.insights.data?.insights;

  if (isLoading) {
    return (
      <div className="space-y-10 pb-12">
        <HeroSkeleton />
        <section className="space-y-4">
          <div className="w-48 h-6 bg-[var(--bg-beige)] rounded-md animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <BookCardSkeleton />
            <BookCardSkeleton />
            <BookCardSkeleton />
            <BookCardSkeleton />
          </div>
        </section>
        <section className="space-y-4">
          <div className="w-56 h-6 bg-[var(--bg-beige)] rounded-md animate-pulse" />
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
        <section className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md relative overflow-hidden flex flex-col md:flex-row items-center gap-8">
          
          <div className="w-40 sm:w-48 h-60 sm:h-72 rounded-2xl overflow-hidden shadow-book flex-shrink-0 bg-[var(--bg-beige)] relative group cursor-pointer" onClick={() => onSelectBook(continueReadingBook)}>
            <img src={continueReadingBook.cover} alt={continueReadingBook.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            <div className="absolute top-3 left-3 bg-[var(--ink)]/90 text-[var(--bg-ivory)] text-[10px] font-semibold px-2.5 py-1 rounded-full">
              {continueReadingBook.progress}% Read
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[#A0522D] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Resume Reading Session</span>
            </div>

            <div>
              <h2 className="font-serif-title text-3xl sm:text-4xl font-bold text-[var(--ink)] mb-1">
                {continueReadingBook.title}
              </h2>
              <p className="text-sm text-[var(--muted)]">by {continueReadingBook.author} • {continueReadingBook.publisher}</p>
            </div>

            <p className="text-xs text-[var(--muted)] line-clamp-2 max-w-xl font-normal leading-relaxed">
              {continueReadingBook.description}
            </p>

            {/* Reading Progress Bar */}
            <div className="max-w-md pt-2">
              <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
                <span>Page {continueReadingBook.pagesRead} of {continueReadingBook.pages}</span>
                <span>{continueReadingBook.progress}% Complete</span>
              </div>
              <div className="w-full bg-[var(--bg-beige)] h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[var(--ink)] h-full rounded-full transition-all duration-500"
                  style={{ width: `${continueReadingBook.progress}%` }}
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-4">
              <button
                onClick={() => onOpenReader(continueReadingBook)}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] font-bold text-xs hover:bg-[#333333] transition-all shadow-warm-md"
              >
                <BookOpen className="w-4 h-4" />
                <span>Continue Reading</span>
              </button>

              <button
                onClick={() => onSelectBook(continueReadingBook)}
                className="px-5 py-3 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] font-bold text-xs hover:bg-[#E5DCCF] transition-all"
              >
                Book Details
              </button>
            </div>
          </div>

        </section>
      )}

      {/* Live AI Reading Brief */}
      <section className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[#A0522D] text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Reading Companion</span>
            </div>
            <h3 className="font-serif-title text-3xl font-bold text-[var(--ink)]">
              {user?.username ? `Good to see you, ${user.username}` : 'Your Reading Brief'}
            </h3>
            <p className="text-xs text-[var(--muted)] mt-1">
              Personalized from your library, wishlist, reviews, reading sessions, and goals.
            </p>
          </div>
          <button
            onClick={aiHome.retry}
            disabled={aiHome.loading}
            className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-light)] text-xs font-bold text-[var(--ink)] hover:bg-[var(--bg-ivory)] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${aiHome.loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {aiHome.loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-36 bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : aiHome.error ? (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">{aiHome.error}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl p-5">
              <div className="flex items-center gap-2 text-[#A0522D] text-[10px] font-bold uppercase mb-2">
                <Compass className="w-4 h-4" />
                <span>Current Recommendation</span>
              </div>
              <h4 className="font-serif-title text-xl font-bold text-[var(--ink)]">{aiHome.recommendation?.title ?? 'Build your reading signal'}</h4>
              <p className="text-xs text-[var(--muted)] mt-2 line-clamp-4">
                {aiHome.recommendation?.reasoning ?? 'Add books, ratings, wishlist entries, and sessions to get a grounded recommendation.'}
              </p>
            </div>
            <div className="bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl p-5">
              <div className="flex items-center gap-2 text-[#B8860B] text-[10px] font-bold uppercase mb-2">
                <Star className="w-4 h-4" />
                <span>Insight of the Day</span>
              </div>
              <h4 className="font-serif-title text-xl font-bold text-[var(--ink)]">{insight?.readingTrend ?? 'stable'} trend</h4>
              <p className="text-xs text-[var(--muted)] mt-2 line-clamp-4">
                {insight?.moodPattern ?? 'OpenBook is waiting for more reading history before making a strong pattern call.'}
              </p>
            </div>
            <div className="bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl p-5">
              <div className="flex items-center gap-2 text-[#2D4030] text-[10px] font-bold uppercase mb-2">
                <Flame className="w-4 h-4" />
                <span>Personal Goal</span>
              </div>
              <h4 className="font-serif-title text-xl font-bold text-[var(--ink)]">
                {insight ? `${insight.totalBooksRead} books, ${insight.totalPagesRead} pages` : 'Start with one session'}
              </h4>
              <p className="text-xs text-[var(--muted)] mt-2 line-clamp-4">
                {insight?.nextLikelyBook?.reasoning ?? 'Daily motivation and smart tips become sharper as your sessions accumulate.'}
              </p>
            </div>
          </div>
        )}
      </section>

      <RecommendedForYou
        userBooks={books}
        onSelectBook={onSelectBook}
        onAddBookToWishlist={onAddBookToWishlist}
      />

      {/* Recently Opened Volumes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif-title text-2xl font-bold text-[var(--ink)]">Recently Opened</h3>
          <button onClick={() => onNavigate('library')} className="text-xs font-semibold text-[var(--ink)] hover:underline flex items-center gap-1">
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
          <h3 className="font-serif-title text-2xl font-bold text-[var(--ink)]">New Releases</h3>
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
