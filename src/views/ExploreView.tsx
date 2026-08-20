import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Book } from '../types';
import { BookCard3D } from '../components/BookCard3D';
import { BookCover } from '../components/BookCover';
import { BookCardSkeleton } from '../components/Skeleton';
import { useBookSearch } from '../hooks/useBookSearch';
import { BookApiService, GoogleBookResult } from '../services/api';
import { googleBookToApp } from '../utils/bookMapper';
import { Search, Compass, BookOpen, Plus, Star } from 'lucide-react';

import { useLibrary } from '../hooks/useLibrary';

// Renders a card for a live Google Books result
function GoogleBookCard({
  book,
  onImport,
  onSelect,
  importing,
}: {
  book: GoogleBookResult;
  onImport: (id: string) => void;
  onSelect: (id: string) => void;
  importing: boolean;
}) {
  return (
    <div 
      onClick={() => onSelect(book.googleBooksId)}
      className="bg-[var(--white)] border border-[var(--border-light)] rounded-2xl overflow-hidden shadow-warm-sm hover:shadow-warm-md transition-shadow flex flex-col cursor-pointer"
    >
      <div className="relative h-52 bg-[var(--bg-beige)] flex items-center justify-center overflow-hidden">
        <BookCover
          title={book.title}
          author={book.authors?.[0]}
          coverUrl={book.coverImage}
          isbn13={book.isbn13}
          isbn10={book.isbn10}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-serif text-sm font-bold text-[var(--ink)] line-clamp-2 leading-snug">
          {book.title}
        </h3>
        <p className="text-xs text-[var(--muted)]">{book.authors.join(', ') || 'Unknown Author'}</p>
        {book.averageRating != null && (
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-[#A0522D] fill-[#A0522D]" />
            <span className="text-xs text-[#555555]">{book.averageRating.toFixed(1)}</span>
          </div>
        )}
        {book.description && (
          <p className="text-xs text-[var(--muted)] line-clamp-2 mt-1">{book.description.replace(/<[^>]*>?/gm, '')}</p>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onImport(book.googleBooksId); }}
          disabled={importing}
          className="mt-auto pt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-[var(--ink)] border border-[var(--ink)] rounded-xl py-2 hover:bg-[var(--ink)] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          {importing ? 'Adding…' : 'Add to Library'}
        </button>
      </div>
    </div>
  );
}

export const ExploreView: React.FC = () => {
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery } = useOutletContext<{ searchQuery: string, setSearchQuery: (q: string) => void }>();

  const [selectedGenre, setSelectedGenre] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'rating' | 'popular' | 'newest'>('rating');
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const { query, setQuery, results: apiResults, totalItems, loading: searchLoading, error: searchError } = useBookSearch();
  const { addBook } = useLibrary();

  // Fetch initial featured books when not searching
  const { data: featuredBooks = [], isLoading: featuredLoading } = useQuery({
    queryKey: ['featuredBooks'],
    queryFn: async () => {
      const res = await BookApiService.search('fiction', 'category', 0, 12);
      return res.data?.items?.map(googleBookToApp) || [];
    },
    staleTime: 1000 * 60 * 60,
  });

  // Sync the prop searchQuery with the hook's internal query state
  React.useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery, setQuery]);

  // When there is a live search query, show Google Books results.
  // When empty, fall back to local browsing of the mock/library books.
  const isSearching = searchQuery.trim().length > 0;

  const genres = ['All', 'Architecture', 'Philosophy', 'Scandinavian Design', 'Mystery', 'Psychology', 'Programming'];

  const filteredBooks = featuredBooks
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
      const res = await BookApiService.importBook(googleBooksId);
      const localBookId = res.data?.book?.id;
      if (localBookId) {
        await addBook(localBookId, 'OWNED');
      }
    } catch (e: any) {
      setImportError(e.message ?? 'Failed to add book');
    } finally {
      setImportingId(null);
    }
  };

  const handleSelectBook = (book: Book) => {
    navigate(`/book/${book.id}`);
  };

  const handleSelectGoogleBook = (id: string) => {
    navigate(`/book/${id}`);
  };

  const showLoading = isSearching ? searchLoading : featuredLoading;

  return (
    <div className="space-y-8 pb-12">

      {/* Header */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] text-xs font-semibold mb-2">
            <Compass className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Discover &amp; Search</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[var(--ink)]">Explore Books</h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            {isSearching
              ? `Found ${totalItems.toLocaleString()} results for "${searchQuery}"`
              : 'Browse your collection or search millions of books worldwide.'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-80 relative">
          <Search className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search any book or author…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--ink)]"
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
                    ? 'bg-[var(--ink)] text-[var(--bg-ivory)] shadow-warm-sm'
                    : 'bg-[var(--white)] border border-[var(--border-light)] text-[var(--ink)] hover:bg-[var(--bg-beige)]'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--muted)] font-semibold">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[var(--white)] border border-[var(--border-light)] rounded-xl px-3 py-1.5 text-xs text-[var(--ink)] focus:outline-none cursor-pointer"
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
                onSelect={handleSelectGoogleBook}
                importing={importingId === book.googleBooksId}
              />
            </div>
          ))}
        </div>
      ) : (
        /* Browse mode — local books */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <BookCard3D key={book.id} book={book} onSelect={handleSelectBook} />
          ))}
        </div>
      )}

      {/* Empty states */}
      {!showLoading && isSearching && apiResults.length === 0 && !searchLoading && (
        <div className="text-center py-16 bg-[var(--white)] border border-[var(--border-light)] rounded-3xl">
          <p className="font-serif-title text-xl text-[var(--ink)]">No books found for "{searchQuery}".</p>
          <p className="text-xs text-[var(--muted)] mt-1">Try a different query or search by author.</p>
        </div>
      )}
      {!showLoading && !isSearching && filteredBooks.length === 0 && (
        <div className="text-center py-16 bg-[var(--white)] border border-[var(--border-light)] rounded-3xl">
          <p className="font-serif-title text-xl text-[var(--ink)]">No volumes match your filter criteria.</p>
          <p className="text-xs text-[var(--muted)] mt-1">Try resetting search keywords or selecting 'All' genres.</p>
        </div>
      )}

    </div>
  );
};
