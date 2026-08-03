import React, { useState } from 'react';
import { Book, ViewMode } from '../types';
import { BookCard3D } from '../components/BookCard3D';
import { InteractiveBookshelf3D } from '../components/InteractiveBookshelf3D';
import { BookCardSkeleton } from '../components/Skeleton';
import { Library, LayoutGrid, List, BookOpen, Layers } from 'lucide-react';

interface LibraryViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onOpenReader: (book: Book) => void;
  onNavigate: (view: ViewMode) => void;
  isLoading?: boolean;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  onSelectBook,
  onOpenReader,
  onNavigate,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'reading' | 'completed' | 'paused' | 'wishlist'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | '3d'>('grid');

  const filteredBooks = books.filter((b) => {
    if (activeTab === 'all') return true;
    return b.status === activeTab;
  });

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold mb-2">
            <Library className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Personal Sanctuary Shelf</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[#1D1D1D]">My Personal Library</h1>
          <p className="text-xs text-[#777777] mt-1">{books.length} Total Volumes Curated</p>
        </div>

        {/* View Mode Switchers */}
        <div className="flex items-center bg-[#F8F6F1] p-1 rounded-2xl border border-[#E5E0D8]">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === 'grid' ? 'bg-[#1D1D1D] text-[#F8F6F1]' : 'text-[#777777] hover:text-[#1D1D1D]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>

          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === 'list' ? 'bg-[#1D1D1D] text-[#F8F6F1]' : 'text-[#777777] hover:text-[#1D1D1D]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>List</span>
          </button>

          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              viewMode === '3d' ? 'bg-[#1D1D1D] text-[#F8F6F1]' : 'text-[#777777] hover:text-[#1D1D1D]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3D Shelf</span>
          </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#E5E0D8] pb-4">
        {[
          { id: 'all', label: 'All Volumes' },
          { id: 'reading', label: 'Currently Reading' },
          { id: 'completed', label: 'Completed' },
          { id: 'paused', label: 'Paused' },
          { id: 'wishlist', label: 'Saved Wishlist' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-[#1D1D1D] text-[#F8F6F1]'
                : 'bg-[#FFFFFF] border border-[#E5E0D8] text-[#1D1D1D] hover:bg-[#EFE8DD]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Render selected view */}
      {isLoading ? (
        <div className={viewMode === 'list' ? "space-y-4" : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <BookCardSkeleton key={i} layout={viewMode === 'list' ? 'horizontal' : 'grid'} />
          ))}
        </div>
      ) : viewMode === '3d' ? (
        <InteractiveBookshelf3D books={filteredBooks} onSelectBook={onSelectBook} onOpenReader={onOpenReader} />
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {filteredBooks.map((book) => (
            <BookCard3D key={book.id} book={book} onSelect={onSelectBook} layout="horizontal" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <BookCard3D key={book.id} book={book} onSelect={onSelectBook} />
          ))}
        </div>
      )}

    </div>
  );
};
