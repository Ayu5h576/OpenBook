import React from 'react';
import { Collection, Book, ViewMode } from '../types';
import { FolderHeart, Plus, ArrowRight } from 'lucide-react';

interface CollectionsViewProps {
  collections: Collection[];
  allBooks: Book[];
  onSelectBook: (book: Book) => void;
  onNavigate: (view: ViewMode) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  collections,
  allBooks,
  onSelectBook,
  onNavigate,
}) => {
  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold mb-2">
            <FolderHeart className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Theme Archives</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[#1D1D1D]">Curated Collections</h1>
          <p className="text-xs text-[#777777] mt-1">Grouped by thematic resonance, architectural design, and philosophical study.</p>
        </div>

        <button
          onClick={() => alert("New Collection creator modal!")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D1D1D] text-[#F8F6F1] text-xs font-bold hover:bg-[#333333] transition-all shadow-warm-md"
        >
          <Plus className="w-4 h-4" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {collections.map((col) => {
          const colBooks = allBooks.filter((b) => col.bookIds.includes(b.id));

          return (
            <div
              key={col.id}
              className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 shadow-warm-sm hover:shadow-warm-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: col.badgeColor }}
                  >
                    {col.theme}
                  </span>
                  <span className="text-xs text-[#777777] font-medium">{colBooks.length} Volumes</span>
                </div>

                <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D] mb-2">{col.name}</h3>
                <p className="text-xs text-[#777777] mb-6 leading-relaxed">{col.description}</p>

                {/* Overlapping Book Covers */}
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {colBooks.map((book) => (
                    <div
                      key={book.id}
                      onClick={() => onSelectBook(book)}
                      className="w-16 h-24 rounded-lg overflow-hidden shadow-book flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                    >
                      <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
