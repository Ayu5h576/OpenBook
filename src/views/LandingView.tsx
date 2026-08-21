import React from 'react';
import { Book, ViewMode } from '../types';
import { BookCover } from '../components/BookCover';
import { BookOpen, Sparkles, ArrowRight, Star, ShieldCheck, Heart, Coffee, Library, ChevronRight } from 'lucide-react';

interface LandingViewProps {
  onNavigate: (view: ViewMode) => void;
  featuredBook?: Book;
  trendingBooks: Book[];
}

export const LandingView: React.FC<LandingViewProps> = ({
  onNavigate,
  featuredBook,
  trendingBooks,
}) => {
  // The featured spotlight dereferences featuredBook.* directly; guard against an
  // empty library (books[0] === undefined) so the landing page never crashes.
  if (!featuredBook) return null;

  return (
    <div className="w-full bg-[var(--bg-ivory)] text-[var(--ink)] min-h-screen">
      
      {/* Top Navigation */}
      <header className="absolute top-0 left-0 right-0 p-6 md:px-12 flex justify-between items-center z-10 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--ink)] text-[var(--bg-ivory)] flex items-center justify-center font-bold shadow-sm">
            OB
          </div>
          <span className="font-serif-title text-xl font-bold">OpenBook</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('auth')}
            className="text-sm font-bold hover:text-[#A0522D] transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => onNavigate('auth')}
            className="px-5 py-2 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] text-sm font-bold hover:bg-[#333333] transition-colors shadow-sm hidden sm:block"
          >
            Create Free Account
          </button>
        </div>
      </header>

      {/*
        ── GSAP ScrollTrigger set-piece goes HERE (later pass) ──────────────────
        This marketing page is the one place a scroll-driven cinematic earns its
        keep, and it's the deliberate seam in our "Motion now, GSAP later" split.
        Everything animated in the app today runs on Motion (see src/motion) —
        route transitions, staggered grids, the shelf→modal cover flight — because
        those are enter/exit and gesture states, which Motion expresses cleanly.

        A hero like this wants something Motion does *not* do well: a timeline
        SCRUBBED by scroll position. The intended set-piece pins this section and,
        as the user scrolls through it, drives a single timeline — the spotlight
        cover scaling/rotating toward the reader, the stats counting up, the
        headline lines rising in sequence — all locked to scroll progress, then
        released. GSAP's ScrollTrigger (pin + scrub + snap) is built for exactly
        that; Motion's `whileInView` only fires discrete in/out triggers and can't
        tie progress to the scrollbar.

        When wiring it: lazy-load gsap + ScrollTrigger in an effect so they never
        touch the app's main bundle (this landing route is already code-split),
        scope everything to a gsap.context() rooted at this section's ref and
        return ctx.revert() for cleanup, and gate the whole timeline behind our
        existing useReducedMotion() so the motion-sensitive path stays a plain
        static hero. Nothing below needs to change to accommodate it.
      */}

      {/* Hero Section */}
      <section className="relative px-6 md:px-12 pt-32 pb-20 md:pb-28 max-w-7xl mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-beige)] text-[#A0522D] text-xs font-semibold shadow-warm-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Scandinavian Digital Library Experience</span>
            </div>

            <h1 className="font-serif-title text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight text-[var(--ink)]">
              A quiet sanctuary for your personal reading journey.
            </h1>

            <p className="text-base sm:text-lg text-[var(--muted)] max-w-xl font-normal leading-relaxed">
              Step into an online library designed with soft Scandinavian minimalism, 3D interactive wooden bookshelves, cozy reading rooms, and AI literary assistance.
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onNavigate('auth')}
                className="flex items-center gap-3 px-8 py-4 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] font-bold text-sm hover:bg-[#333333] transition-all shadow-warm-lg"
              >
                <span>Enter Library Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('auth')}
                className="flex items-center gap-2 px-8 py-4 rounded-full bg-[var(--white)] border border-[var(--border-light)] text-[var(--ink)] font-bold text-sm hover:bg-[var(--bg-beige)] transition-all shadow-warm-sm"
              >
                <Library className="w-4 h-4" />
                <span>Explore 3D Shelf</span>
              </button>
            </div>

            {/* Quick Stats Banner */}
            <div className="pt-8 border-t border-[var(--border-light)] grid grid-cols-3 gap-6 max-w-lg">
              <div>
                <span className="font-serif-title text-3xl font-bold text-[var(--ink)]">100K+</span>
                <p className="text-xs text-[var(--muted)]">Curated Volumes</p>
              </div>
              <div>
                <span className="font-serif-title text-3xl font-bold text-[var(--ink)]">4.9★</span>
                <p className="text-xs text-[var(--muted)]">Reader Satisfaction</p>
              </div>
              <div>
                <span className="font-serif-title text-3xl font-bold text-[var(--ink)]">0%</span>
                <p className="text-xs text-[var(--muted)]">Distraction Noise</p>
              </div>
            </div>
          </div>

          {/* Featured Book Spotlight */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative group cursor-pointer" onClick={() => onNavigate('auth')}>
              <div className="w-64 sm:w-72 h-96 sm:h-[440px] rounded-2xl overflow-hidden shadow-book border border-[var(--border-light)] bg-[var(--bg-beige)] transition-transform duration-500 group-hover:scale-105">
                <BookCover
                  title={featuredBook.title}
                  author={featuredBook.author}
                  coverUrl={featuredBook.cover}
                  isbn13={featuredBook.isbn}
                  size="large"
                  eager
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Spotlight Floating Tag */}
              <div className="absolute -bottom-6 -left-6 bg-[var(--white)] border border-[var(--border-light)] rounded-2xl p-4 shadow-warm-lg max-w-xs">
                <span className="text-[10px] uppercase font-bold text-[#A0522D] tracking-wider">Spotlight Volume</span>
                <h4 className="font-serif-title text-lg font-bold text-[var(--ink)]">{featuredBook.title}</h4>
                <p className="text-xs text-[var(--muted)]">by {featuredBook.author}</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Featured Categories Carousel */}
      <section className="bg-[var(--bg-beige)]/50 border-y border-[var(--border-light)] py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <span className="text-xs uppercase font-bold text-[var(--muted)] tracking-wider">Curated Collections</span>
              <h2 className="font-serif-title text-3xl font-bold text-[var(--ink)]">Explore Popular Literary Realms</h2>
            </div>
            <button onClick={() => onNavigate('auth')} className="text-xs font-bold text-[var(--ink)] hover:underline flex items-center gap-1">
              <span>View All Categories</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Architecture & Design', 'Scandinavian Literature', 'Classic Philosophy', 'Dark Academia'].map((cat, idx) => (
              <div
                key={idx}
                onClick={() => onNavigate('auth')}
                className="bg-[var(--white)] border border-[var(--border-light)] hover:border-[var(--ink)] rounded-2xl p-6 cursor-pointer transition-all hover:shadow-warm-md group"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-beige)] text-[var(--ink)] flex items-center justify-center mb-4 group-hover:bg-[var(--ink)] group-hover:text-[var(--bg-ivory)] transition-colors">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-serif-title text-xl font-bold text-[var(--ink)] mb-1">{cat}</h3>
                <p className="text-xs text-[var(--muted)]">Curated works & essays</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Books Showcase */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs uppercase font-bold text-[#A0522D] tracking-wider">Editor's Selection</span>
          <h2 className="font-serif-title text-4xl font-bold text-[var(--ink)] my-2">Trending in the Community</h2>
          <p className="text-sm text-[var(--muted)]">Hand-curated volumes currently capturing the quiet attention of our reader network.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {trendingBooks.slice(0, 4).map((book) => (
            <div
              key={book.id}
              onClick={() => onNavigate('auth')}
              className="bg-[var(--white)] border border-[var(--border-light)] hover:border-[var(--ink)] rounded-3xl p-4 cursor-pointer transition-all hover:shadow-warm-lg group"
            >
              <div className="aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-book mb-4 bg-[var(--bg-beige)]">
                <BookCover
                  title={book.title}
                  author={book.author}
                  coverUrl={book.cover}
                  isbn13={book.isbn}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <span className="text-[10px] font-bold uppercase text-[var(--muted)]">{book.genres[0]}</span>
              <h3 className="font-serif-title text-xl font-bold text-[var(--ink)] line-clamp-1">{book.title}</h3>
              <p className="text-xs text-[var(--muted)]">by {book.author}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[var(--ink)] text-[var(--bg-ivory)] py-12 px-6 md:px-12 border-t border-[#333333]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#A0A0A0]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--bg-ivory)] text-[var(--ink)] flex items-center justify-center font-bold">
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
