import React from 'react';
import { Book, ViewMode } from '../types';
import { BookCard3D } from '../components/BookCard3D';
import { Bookmark, Orbit, ArrowRight } from 'lucide-react';

interface WishlistViewProps {
  wishlistBooks: Book[];
  onSelectBook: (book: Book) => void;
  onNavigate: (view: ViewMode) => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  wishlistBooks,
  onSelectBook,
  onNavigate,
}) => {
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
          <p className="text-xs text-[#777777] mt-1">{wishlistBooks.length} Volumes Saved for Future Sessions</p>
        </div>

        {/* Link to Wishlist Galaxy */}
        <button
          onClick={() => onNavigate('wishlist-galaxy')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D1D1D] text-[#F8F6F1] text-xs font-bold hover:bg-[#333333] transition-all shadow-warm-md"
        >
          <Orbit className="w-4 h-4 text-[#E0A96D]" />
          <span>View Wishlist Galaxy</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {wishlistBooks.map((book) => (
          <BookCard3D key={book.id} book={book} onSelect={onSelectBook} />
        ))}
      </div>

      {wishlistBooks.length === 0 && (
        <div className="text-center py-16 bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl">
          <p className="font-serif-title text-xl text-[#1D1D1D]">Your wishlist is currently empty.</p>
          <p className="text-xs text-[#777777] mt-1">Explore books and bookmark volumes to save them here.</p>
        </div>
      )}

    </div>
  );
};
