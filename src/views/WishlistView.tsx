import React from 'react';
import { ViewMode } from '../types';
import { useWishlist } from '../hooks/useWishlist';
import { Bookmark, Orbit, BookOpen, Star, X } from 'lucide-react';
import { BookCardSkeleton } from '../components/Skeleton';

interface WishlistViewProps {
  onNavigate: (view: ViewMode) => void;
}

const priorityBadge = (priority: 'HIGH' | 'MEDIUM' | 'LOW') => {
  if (priority === 'HIGH') return { label: 'High', cls: 'bg-red-100 text-red-700' };
  if (priority === 'MEDIUM') return { label: 'Medium', cls: 'bg-yellow-100 text-yellow-700' };
  return { label: 'Low', cls: 'bg-green-100 text-green-700' };
};

export const WishlistView: React.FC<WishlistViewProps> = ({ onNavigate }) => {
  const { entries, loading, error, removeBook } = useWishlist();

  return (
    <div className="space-y-8 pb-12">

      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold mb-2">
            <Bookmark className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Saved Volumes</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[#1D1D1D]">My Reading Wishlist</h1>
          <p className="text-xs text-[#777777] mt-1">{entries.length} Volumes Saved for Future Sessions</p>
        </div>
        <button
          onClick={() => onNavigate('wishlist-galaxy')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D1D1D] text-[#F8F6F1] text-xs font-bold hover:bg-[#333333] transition-all shadow-warm-md"
        >
          <Orbit className="w-4 h-4 text-[#E0A96D]" />
          <span>View Wishlist Galaxy</span>
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 text-sm text-red-700">{error}</div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => <BookCardSkeleton key={i} />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl">
          <Bookmark className="w-12 h-12 text-[#E5E0D8] mx-auto mb-3" />
          <p className="font-serif-title text-xl text-[#1D1D1D]">Your wishlist is currently empty.</p>
          <p className="text-xs text-[#777777] mt-1">Explore books and bookmark volumes to save them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {entries.map((entry) => {
            const badge = priorityBadge(entry.priority);
            return (
              <div key={entry.id} className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-2xl overflow-hidden hover:shadow-warm-md transition-shadow group relative">
                <button
                  onClick={() => removeBook(entry.id)}
                  className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="relative aspect-[2/3] overflow-hidden bg-[#EFE8DD]">
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
                  <p className="font-serif-title font-bold text-[#1D1D1D] truncate text-sm">{entry.book.title}</p>
                  <p className="text-[11px] text-[#777777] truncate">{entry.book.authors.join(', ')}</p>
                  {entry.book.averageRating && (
                    <span className="flex items-center gap-1 text-xs text-[#777777] mt-1">
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
