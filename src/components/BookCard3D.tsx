import React from 'react';
import { Book } from '../types';
import { Star, BookOpen, Bookmark, Heart, MoreHorizontal } from 'lucide-react';

interface BookCard3DProps {
  book: Book;
  onSelect: (book: Book) => void;
  onToggleFavorite?: (bookId: string) => void;
  onToggleWishlist?: (bookId: string) => void;
  layout?: 'grid' | 'compact' | 'horizontal';
}

export const BookCard3D: React.FC<BookCard3DProps> = ({
  book,
  onSelect,
  onToggleFavorite,
  onToggleWishlist,
  layout = 'grid',
}) => {
  if (layout === 'horizontal') {
    return (
      <div 
        onClick={() => onSelect(book)}
        className="bg-[var(--white)] border border-[var(--border-light)] hover:border-[var(--ink)] rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all hover:shadow-warm-md group"
      >
        <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 shadow-warm-sm group-hover:scale-105 transition-transform">
          <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-semibold uppercase text-[var(--muted)] tracking-wider">{book.genres[0]}</span>
          <h4 className="font-serif-title text-lg font-bold text-[var(--ink)] truncate group-hover:text-[#A0522D] transition-colors">{book.title}</h4>
          <p className="text-xs text-[var(--muted)] mb-2 truncate">by {book.author}</p>
          
          {book.progress > 0 && (
            <div className="w-full bg-[var(--bg-beige)] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[var(--ink)] h-full transition-all" style={{ width: `${book.progress}%` }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect(book)}
      className="bg-[var(--white)] border border-[var(--border-light)] hover:border-[var(--ink)] rounded-3xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:shadow-warm-lg hover:-translate-y-1.5 group relative"
    >
      <div>
        {/* Book Cover Container with 3D shadow */}
        <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-book mb-4 bg-[var(--bg-beige)] group-hover:scale-[1.02] transition-transform">
          <img
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {/* Spine Highlight Shadow Overlay */}
          <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/30 via-black/10 to-transparent pointer-events-none" />

          {/* Status Badge */}
          {book.status === 'reading' && (
            <div className="absolute top-3 left-3 bg-[var(--ink)]/90 backdrop-blur-md text-[var(--bg-ivory)] text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-warm-sm">
              {book.progress}% Read
            </div>
          )}

          {/* Favorite heart button */}
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(book.id);
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-[var(--ink)] hover:scale-110 transition-transform shadow-warm-sm"
            >
              <Heart className={`w-4 h-4 ${book.favorite ? 'fill-red-500 text-red-500' : 'text-[var(--ink)]'}`} />
            </button>
          )}
        </div>

        {/* Book Meta */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span>{book.genres[0]}</span>
            <div className="flex items-center gap-1 text-[var(--ink)] font-semibold">
              <Star className="w-3.5 h-3.5 fill-[#B8860B] text-[#B8860B]" />
              <span>{book.rating}</span>
            </div>
          </div>

          <h3 className="font-serif-title text-xl font-bold text-[var(--ink)] line-clamp-1 group-hover:text-[#A0522D] transition-colors">
            {book.title}
          </h3>

          <p className="text-xs text-[var(--muted)] line-clamp-1">by {book.author}</p>
        </div>
      </div>

      {/* Progress or Action Bar */}
      <div className="mt-4 pt-3 border-t border-[var(--border-light)] flex items-center justify-between text-xs">
        <span className="text-[var(--muted)] text-[11px] font-medium">{book.pages} pages</span>
        <span className="font-semibold text-[var(--ink)] group-hover:underline">View Book</span>
      </div>
    </div>
  );
};
