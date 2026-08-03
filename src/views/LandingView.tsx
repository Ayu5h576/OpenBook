import React from 'react';
import { Book, ViewMode } from '../types';
import { BookOpen, Sparkles, ArrowRight, Star, ShieldCheck, Heart, Coffee, Library, ChevronRight } from 'lucide-react';

interface LandingViewProps {
  onNavigate: (view: ViewMode) => void;
  featuredBook: Book;
  trendingBooks: Book[];
}

export const LandingView: React.FC<LandingViewProps> = ({
  onNavigate,
  featuredBook,
  trendingBooks,
}) => {
  return (
    <div className="w-full bg-[#F8F6F1] text-[#1D1D1D] min-h-screen">
      
      {/* Hero Section */}
      <section className="relative px-6 md:px-12 py-20 md:py-28 max-w-7xl mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EFE8DD] text-[#A0522D] text-xs font-semibold shadow-warm-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Scandinavian Digital Library Experience</span>
            </div>

            <h1 className="font-serif-title text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight text-[#1D1D1D]">
              A quiet sanctuary for your personal reading journey.
            </h1>

            <p className="text-base sm:text-lg text-[#777777] max-w-xl font-normal leading-relaxed">
              Step into an online library designed with soft Scandinavian minimalism, 3D interactive wooden bookshelves, cozy reading rooms, and AI literary assistance.
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onNavigate('home')}
                className="flex items-center gap-3 px-8 py-4 rounded-full bg-[#1D1D1D] text-[#F8F6F1] font-bold text-sm hover:bg-[#333333] transition-all shadow-warm-lg"
              >
                <span>Enter Library Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('bookshelf-3d')}
                className="flex items-center gap-2 px-8 py-4 rounded-full bg-[#FFFFFF] border border-[#E5E0D8] text-[#1D1D1D] font-bold text-sm hover:bg-[#EFE8DD] transition-all shadow-warm-sm"
              >
                <Library className="w-4 h-4" />
                <span>Explore 3D Shelf</span>
              </button>
            </div>

            {/* Quick Stats Banner */}
            <div className="pt-8 border-t border-[#E5E0D8] grid grid-cols-3 gap-6 max-w-lg">
              <div>
                <span className="font-serif-title text-3xl font-bold text-[#1D1D1D]">100K+</span>
                <p className="text-xs text-[#777777]">Curated Volumes</p>
              </div>
              <div>
                <span className="font-serif-title text-3xl font-bold text-[#1D1D1D]">4.9★</span>
                <p className="text-xs text-[#777777]">Reader Satisfaction</p>
              </div>
              <div>
                <span className="font-serif-title text-3xl font-bold text-[#1D1D1D]">0%</span>
                <p className="text-xs text-[#777777]">Distraction Noise</p>
              </div>
            </div>
          </div>

          {/* Featured Book Spotlight */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative group cursor-pointer" onClick={() => onNavigate('home')}>
              <div className="w-64 sm:w-72 h-96 sm:h-[440px] rounded-2xl overflow-hidden shadow-book border border-[#E5E0D8] bg-[#EFE8DD] transition-transform duration-500 group-hover:scale-105">
                <img
                  src={featuredBook.cover}
                  alt={featuredBook.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Spotlight Floating Tag */}
              <div className="absolute -bottom-6 -left-6 bg-[#FFFFFF] border border-[#E5E0D8] rounded-2xl p-4 shadow-warm-lg max-w-xs">
                <span className="text-[10px] uppercase font-bold text-[#A0522D] tracking-wider">Spotlight Volume</span>
                <h4 className="font-serif-title text-lg font-bold text-[#1D1D1D]">{featuredBook.title}</h4>
                <p className="text-xs text-[#777777]">by {featuredBook.author}</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Featured Categories Carousel */}
      <section className="bg-[#EFE8DD]/50 border-y border-[#E5E0D8] py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <span className="text-xs uppercase font-bold text-[#777777] tracking-wider">Curated Collections</span>
              <h2 className="font-serif-title text-3xl font-bold text-[#1D1D1D]">Explore Popular Literary Realms</h2>
            </div>
            <button onClick={() => onNavigate('explore')} className="text-xs font-bold text-[#1D1D1D] hover:underline flex items-center gap-1">
              <span>View All Categories</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Architecture & Design', 'Scandinavian Literature', 'Classic Philosophy', 'Dark Academia'].map((cat, idx) => (
              <div
                key={idx}
                onClick={() => onNavigate('explore')}
                className="bg-[#FFFFFF] border border-[#E5E0D8] hover:border-[#1D1D1D] rounded-2xl p-6 cursor-pointer transition-all hover:shadow-warm-md group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#EFE8DD] text-[#1D1D1D] flex items-center justify-center mb-4 group-hover:bg-[#1D1D1D] group-hover:text-[#F8F6F1] transition-colors">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-serif-title text-xl font-bold text-[#1D1D1D] mb-1">{cat}</h3>
                <p className="text-xs text-[#777777]">Curated works & essays</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Books Showcase */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs uppercase font-bold text-[#A0522D] tracking-wider">Editor's Selection</span>
          <h2 className="font-serif-title text-4xl font-bold text-[#1D1D1D] my-2">Trending in the Community</h2>
          <p className="text-sm text-[#777777]">Hand-curated volumes currently capturing the quiet attention of our reader network.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {trendingBooks.slice(0, 4).map((book) => (
            <div
              key={book.id}
              onClick={() => onNavigate('home')}
              className="bg-[#FFFFFF] border border-[#E5E0D8] hover:border-[#1D1D1D] rounded-3xl p-4 cursor-pointer transition-all hover:shadow-warm-lg group"
            >
              <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-book mb-4 bg-[#EFE8DD]">
                <img src={book.cover} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <span className="text-[10px] font-bold uppercase text-[#777777]">{book.genres[0]}</span>
              <h3 className="font-serif-title text-xl font-bold text-[#1D1D1D] line-clamp-1">{book.title}</h3>
              <p className="text-xs text-[#777777]">by {book.author}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1D1D1D] text-[#F8F6F1] py-12 px-6 md:px-12 border-t border-[#333333]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#A0A0A0]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#F8F6F1] text-[#1D1D1D] flex items-center justify-center font-bold">
              OB
            </div>
            <span className="font-serif-title text-lg font-bold text-white">OpenBook Digital Library</span>
          </div>
          <p>© 2026 OpenBook Library Platform. Designed with Scandinavian restraint.</p>
        </div>
      </footer>

    </div>
  );
};
