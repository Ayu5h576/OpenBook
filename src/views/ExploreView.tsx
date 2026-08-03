import React, { useState } from 'react';
import { Book, ViewMode } from '../types';
import { BookCard3D } from '../components/BookCard3D';
import { BookCardSkeleton } from '../components/Skeleton';
import { Search, Filter, Sparkles, Compass, Award, TrendingUp, Flame } from 'lucide-react';

interface ExploreViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isLoading?: boolean;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  books,
  onSelectBook,
  searchQuery,
  onSearchChange,
  isLoading = false,
}) => {
  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'rating' | 'popular' | 'newest'>('rating');

  const genres = ['All', 'Architecture', 'Philosophy', 'Scandinavian Design', 'Mystery', 'Psychology', 'Programming'];

  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'All' || b.genres.includes(selectedGenre);
    return matchesSearch && matchesGenre;
  }).sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'newest') return b.publishedYear - a.publishedYear;
    return b.reviewCount - a.reviewCount;
  });

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold mb-2">
            <Compass className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Discover & Filter</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[#1D1D1D]">Explore the Collection</h1>
          <p className="text-xs text-[#777777] mt-1">Browse curated literature across architecture, philosophy, and Scandinavian design.</p>
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by keyword..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#1D1D1D] focus:outline-none focus:border-[#1D1D1D]"
          />
        </div>
      </div>

      {/* Genre Pills & Sort Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {genres.map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGenre(g)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                selectedGenre === g
                  ? 'bg-[#1D1D1D] text-[#F8F6F1] shadow-warm-sm'
                  : 'bg-[#FFFFFF] border border-[#E5E0D8] text-[#1D1D1D] hover:bg-[#EFE8DD]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#777777] font-semibold">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-xl px-3 py-1.5 text-xs text-[#1D1D1D] focus:outline-none cursor-pointer"
          >
            <option value="rating">Top Rated (★)</option>
            <option value="newest">Newest Releases</option>
            <option value="popular">Most Popular</option>
          </select>
        </div>
      </div>

      {/* Book Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <BookCard3D key={book.id} book={book} onSelect={onSelectBook} />
          ))}
        </div>
      )}

      {!isLoading && filteredBooks.length === 0 && (
        <div className="text-center py-16 bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl">
          <p className="font-serif-title text-xl text-[#1D1D1D]">No volumes match your filter criteria.</p>
          <p className="text-xs text-[#777777] mt-1">Try resetting search keywords or selecting 'All' genres.</p>
        </div>
      )}

    </div>
  );
};
