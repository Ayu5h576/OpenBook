import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookCardSkeleton } from '../components/Skeleton';
import { useLibrary } from '../hooks/useLibrary';
import { LibraryStatus } from '../services/api';
import { BookCover } from '../components/BookCover';
import { Library, LayoutGrid, List, BookOpen, Star } from 'lucide-react';

const STATUS_TABS: { id: LibraryStatus | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All Volumes' },
  { id: 'READING', label: 'Currently Reading' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'PAUSED', label: 'Paused' },
  { id: 'OWNED', label: 'Owned' },
];

const statusBadge = (status: LibraryStatus) => {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  if (status === 'READING') return { label, cls: 'bg-green-100 text-green-700' };
  if (status === 'COMPLETED') return { label, cls: 'bg-blue-100 text-blue-700' };
  if (status === 'PAUSED') return { label, cls: 'bg-yellow-100 text-yellow-700' };
  return { label, cls: 'bg-[var(--bg-beige)] text-[var(--ink)]' };
};

export const LibraryView: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LibraryStatus | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filter = activeTab === 'ALL' ? undefined : activeTab;
  const { entries, loading, error, removeEntry } = useLibrary(filter);

  const progressPct = (currentPage: number, pageCount?: number | null) => {
    if (!pageCount || pageCount === 0) return 0;
    return Math.min(100, Math.round((currentPage / pageCount) * 100));
  };

  return (
    <div className="space-y-8 pb-12">

      {/* Header */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] text-xs font-semibold mb-2">
            <Library className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Personal Sanctuary Shelf</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[var(--ink)]">My Personal Library</h1>
          <p className="text-xs text-[var(--muted)] mt-1">{entries.length} Total Volumes Curated</p>
        </div>
        <div className="flex items-center bg-[var(--bg-ivory)] p-1 rounded-2xl border border-[var(--border-light)]">
          {(['grid', 'list'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                viewMode === m ? 'bg-[var(--ink)] text-[var(--bg-ivory)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              {m === 'grid' ? <LayoutGrid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
              <span className="capitalize">{m}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border-light)] pb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-[var(--ink)] text-[var(--bg-ivory)]'
                : 'bg-[var(--white)] border border-[var(--border-light)] text-[var(--ink)] hover:bg-[var(--bg-beige)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 text-sm text-red-700">{error}</div>
      )}

      {/* Content */}
      {loading ? (
        <div className={viewMode === 'list' ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'}>
          {Array.from({ length: 8 }).map((_, i) => (
            <BookCardSkeleton key={i} layout={viewMode === 'list' ? 'horizontal' : 'grid'} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 bg-[var(--white)] border border-[var(--border-light)] rounded-3xl">
          <BookOpen className="w-12 h-12 text-[var(--border-light)] mx-auto mb-3" />
          <p className="font-serif-title text-xl text-[var(--ink)]">No books here yet.</p>
          <p className="text-xs text-[var(--muted)] mt-1">
            <button onClick={() => navigate('/explore')} className="text-[#A0522D] hover:underline">Search and add books</button> to your library.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-3">
          {entries.map((entry) => {
            const pct = progressPct(entry.currentPage, entry.book.pageCount);
            const badge = statusBadge(entry.status);
            return (
              <div 
                key={entry.id} 
                onClick={() => navigate(`/book/${entry.book.id}`)}
                className="bg-[var(--white)] border border-[var(--border-light)] rounded-2xl p-4 flex items-center gap-4 hover:shadow-warm-md transition-shadow cursor-pointer"
              >
                <BookCover
                  title={entry.book.title}
                  author={entry.book.authors?.[0]}
                  coverUrl={entry.book.coverImage}
                  isbn13={entry.book.isbn13}
                  isbn10={entry.book.isbn10}
                  className="w-12 h-16 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-serif-title font-bold text-[var(--ink)] truncate">{entry.book.title}</p>
                  <p className="text-xs text-[var(--muted)] truncate">{entry.book.authors.join(', ')}</p>
                  {entry.status === 'READING' && (
                    <div className="mt-2 w-48 bg-[var(--bg-beige)] rounded-full h-1.5">
                      <div className="bg-[#A0522D] h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                {entry.book.averageRating && (
                  <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                    <Star className="w-3.5 h-3.5 fill-[#E0A96D] text-[#E0A96D]" />
                    {Number(entry.book.averageRating).toFixed(1)}
                  </span>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); removeEntry(entry.id); }} 
                  className="text-xs text-red-400 hover:text-red-600 transition-colors ml-2"
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {entries.map((entry) => {
            const pct = progressPct(entry.currentPage, entry.book.pageCount);
            const badge = statusBadge(entry.status);
            return (
              <div 
                key={entry.id} 
                onClick={() => navigate(`/book/${entry.book.id}`)}
                className="bg-[var(--white)] border border-[var(--border-light)] rounded-2xl overflow-hidden hover:shadow-warm-md transition-shadow group cursor-pointer"
              >
                <div className="relative aspect-[2/3] overflow-hidden bg-[var(--bg-beige)]">
                  <BookCover
                    title={entry.book.title}
                    author={entry.book.authors?.[0]}
                    coverUrl={entry.book.coverImage}
                    isbn13={entry.book.isbn13}
                    isbn10={entry.book.isbn10}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.cls}`}>{badge.label}</span>
                </div>
                <div className="p-3">
                  <p className="font-serif-title font-bold text-[var(--ink)] truncate text-sm">{entry.book.title}</p>
                  <p className="text-[11px] text-[var(--muted)] truncate">{entry.book.authors.join(', ')}</p>
                  {entry.status === 'READING' && (
                    <div className="mt-2 bg-[var(--bg-beige)] rounded-full h-1">
                      <div className="bg-[#A0522D] h-1 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeEntry(entry.id); }} 
                    className="mt-2 text-[10px] text-red-400 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

