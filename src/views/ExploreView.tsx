import React, { useState } from 'react';
import { Book } from '../types';
import { BookCard3D } from '../components/BookCard3D';
import { BookCardSkeleton } from '../components/Skeleton';
import { useBookSearch } from '../hooks/useBookSearch';
import { BookApiService, GoogleBookResult } from '../services/api';
import { Search, Compass, BookOpen, Plus, Star } from 'lucide-react';

interface ExploreViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isLoading?: boolean;
}

// Renders a card for a live Google Books result
function GoogleBookCard({
  book,
  onImport,
  importing,
}: {
  book: GoogleBookResult;
  onImport: (id: string) => void;
  importing: boolean;
}) {
  return (
    <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-2xl overflow-hidden shadow-warm-sm hover:shadow-warm-md transition-shadow flex flex-col">
      <div className="relative h-52 bg-[#EFE8DD] flex items-center justify-center overflow-hidden">
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={book.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <BookOpen className="w-12 h-12 text-[#A0522D] opacity-40" />
        )}
      </div>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-serif text-sm font-bold text-[#1D1D1D] line-clamp-2 leading-snug">
          {book.title}
        </h3>
        <p className="text-xs text-[#777777]">{book.authors.join(', ') || 'Unknown Author'}</p>
        {book.averageRating != null && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-[#A0522D] fill-[#A0522D]" />
            <span className="text-xs text-[#555555]">{book.averageRating.toFixed(1)}</span>
          </div>
        )}
        {book.description && (
          <p className="text-xs text-[#777777] line-clamp-3 mt-1">{book.description}</p>
        )}
        <button
          onClick={() => onImport(book.googleBooksId)}
          disabled={importing}
          className="mt-auto pt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#1D1D1D] border border-[#1D1D1D] rounded-xl py-2 hover:bg-[#1D1D1D] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          {importing ? 'Adding…' : 'Add to Library'}
        </button>
      </div>
    </div>
  );
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
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const { query, setQuery, results: apiResults, totalItems, loading: searchLoading, error: searchError } = useBookSearch();

  // Sync the prop searchQuery with the hook's internal query state
  React.useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery, setQuery]);

  // When there is a live search query, show Google Books results.
  // When empty, fall back to local browsing of the mock/library books.
  const isSearching = searchQuery.trim().length > 0;

  const genres = ['All', 'Architecture', 'Philosophy', 'Scandinavian Design', 'Mystery', 'Psychology', 'Programming'];

  const filteredBooks = books
    .filter((b) => {
      const matchesSearch =
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre = selectedGenre === 'All' || b.genres.includes(selectedGenre);
      return matchesSearch && matchesGenre;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'newest') return b.publishedYear - a.publishedYear;
      return b.reviewCount - a.reviewCount;
    });

  const handleImport = async (googleBooksId: string) => {
    setImportingId(googleBooksId);
    setImportError(null);
    try {
      await BookApiService.importBook(googleBooksId);
    } catch (e: any) {
      setImportError(e.message ?? 'Failed to add book');
    } finally {
      setImportingId(null);
    }
  };

  const showLoading = isSearching ? searchLoading : isLoading;

  return (
    <div className="space-y-8 pb-12">

      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold mb-2">
            <Compass className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Discover &amp; Search</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[#1D1D1D]">Explore Books</h1>
          <p className="text-xs text-[#777777] mt-1">
            {isSearching
              ? `Found ${totalItems.toLocaleString()} results for "${searchQuery}"`
              : 'Browse your collection or search millions of books worldwide.'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search any book or author…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#1D1D1D] focus:outline-none focus:border-[#1D1D1D]"
          />
        </div>
      </div>

      {/* Genre Pills & Sort (only shown in browse mode) */}
      {!isSearching && (
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
      )}

      {/* Error banners */}
      {searchError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          Search error: {searchError}
        </div>
      )}
      {importError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {importError}
        </div>
      )}

      {/* Grid */}
      {showLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      ) : isSearching ? (
        /* Live Google Books results */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {apiResults.map((book) => (
            <div key={book.googleBooksId}>
              <GoogleBookCard
                book={book}
                onImport={handleImport}
                importing={importingId === book.googleBooksId}
              />
            </div>
          ))}
        </div>
      ) : (
        /* Browse mode — local books */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <BookCard3D key={book.id} book={book} onSelect={onSelectBook} />
          ))}
        </div>
      )}

      {/* Empty states */}
      {!showLoading && isSearching && apiResults.length === 0 && !searchLoading && (
        <div className="text-center py-16 bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl">
          <p className="font-serif-title text-xl text-[#1D1D1D]">No books found for "{searchQuery}".</p>
          <p className="text-xs text-[#777777] mt-1">Try a different query or search by author.</p>
        </div>
      )}
      {!showLoading && !isSearching && filteredBooks.length === 0 && (
        <div className="text-center py-16 bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl">
          <p className="font-serif-title text-xl text-[#1D1D1D]">No volumes match your filter criteria.</p>
          <p className="text-xs text-[#777777] mt-1">Try resetting search keywords or selecting 'All' genres.</p>
        </div>
      )}

    </div>
  );
};
