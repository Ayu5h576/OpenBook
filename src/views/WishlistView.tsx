import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWishlist } from '../hooks/useWishlist';
import { Bookmark, Orbit, BookOpen, Star, X } from 'lucide-react';
import { BookCardSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';

const priorityBadge = (priority: 'HIGH' | 'MEDIUM' | 'LOW') => {
  if (priority === 'HIGH') return { label: 'High', cls: 'bg-red-100 text-red-700' };
  if (priority === 'MEDIUM') return { label: 'Medium', cls: 'bg-yellow-100 text-yellow-700' };
  return { label: 'Low', cls: 'bg-green-100 text-green-700' };
};

export const WishlistView: React.FC = () => {
  const navigate = useNavigate();
  const { entries, loading, error, removeBook } = useWishlist();

  return (
    <div className="space-y-8 pb-12">

      {/* Header */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] text-xs font-semibold mb-2">
            <Bookmark className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Saved Volumes</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[var(--ink)]">My Reading Wishlist</h1>
          <p className="text-xs text-[var(--muted)] mt-1">{entries.length} Volumes Saved for Future Sessions</p>
        </div>
        <button
          onClick={() => navigate('/wishlist-galaxy')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] text-xs font-bold hover:bg-[#333333] transition-all shadow-warm-md"
        >
          <Orbit className="w-4 h-4 text-[#E0A96D]" />
          <span>View Wishlist Galaxy</span>
        </button>
      </div>

      {/* Error */}
      {error && <ErrorBanner message={error} className="mb-2" />}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <BookCardSkeleton key={i} />)}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          preset="wishlist"
          title="Your wishlist is empty"
          description="Explore books and bookmark volumes to save them here for future reading sessions."
          action={{ label: 'Explore Books', onClick: () => navigate('/explore') }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {entries.map((entry) => {
            const badge = priorityBadge(entry.priority);
            return (
              <div 
                key={entry.id} 
                onClick={() => navigate(`/book/${entry.book.id}`)}
                className="bg-[var(--white)] border border-[var(--border-light)] rounded-2xl overflow-hidden hover:shadow-warm-md transition-shadow group relative cursor-pointer"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); removeBook(entry.id); }}
                  className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="relative aspect-[2/3] overflow-hidden bg-[var(--bg-beige)]">
                  {entry.book.coverImage ? (
                    <img src={entry.book.coverImage} alt={entry.book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-10 h-10 text-[#A0522D]" />
                    </div>
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>{badge.label}</span>
                </div>
                <div className="p-3">
                  <p className="font-serif-title font-bold text-[var(--ink)] truncate text-sm">{entry.book.title}</p>
                  <p className="text-[11px] text-[var(--muted)] truncate">{entry.book.authors.join(', ')}</p>
                  {entry.book.averageRating && (
                    <span className="flex items-center gap-1 text-xs text-[var(--muted)] mt-1">
                      <Star className="w-3 h-3 fill-[#E0A96D] text-[#E0A96D]" />
                      {Number(entry.book.averageRating).toFixed(1)}
                    </span>
                  )}
                  {entry.notes && <p className="text-[10px] text-[#A0522D] mt-1 line-clamp-2 italic">{entry.notes}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
