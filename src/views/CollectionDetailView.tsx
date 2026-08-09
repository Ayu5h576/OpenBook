import React, { useState, useEffect } from 'react';
import { BookOpen, ArrowLeft, Edit2, Save, X, Plus, Trash2, Search } from 'lucide-react';
import { useCollections } from '../hooks/useCollections';
import { ApiCollection } from '../services/api';

interface CollectionDetailViewProps {
  collectionId: string;
  onNavigate: (view: string) => void;
  onBack: () => void;
}

export const CollectionDetailView: React.FC<CollectionDetailViewProps> = ({
  collectionId,
  onNavigate,
  onBack,
}) => {
  const { collections, updateCollection, removeBook, loading } = useCollections();
  const [collection, setCollection] = useState<ApiCollection | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [removingBookId, setRemovingBookId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Find collection from list
  useEffect(() => {
    const found = collections.find((c) => c.id === collectionId);
    if (found) {
      setCollection(found);
      setEditName(found.name);
      setEditDesc(found.description || '');
    }
  }, [collections, collectionId]);

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaveError(null);
    try {
      await updateCollection(collectionId, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      });
      setIsEditing(false);
    } catch (err: any) {
      setSaveError(err.message ?? 'Failed to save collection');
    }
  };

  const handleRemoveBook = async (bookId: string) => {
    setRemovingBookId(bookId);
    try {
      await removeBook(collectionId, bookId);
    } catch (err) {
      console.error('Failed to remove book:', err);
    } finally {
      setRemovingBookId(null);
    }
  };

  if (loading || !collection) {
    return (
      <div className="space-y-8 pb-12">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#777777] hover:text-[#1D1D1D] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Collections</span>
        </button>
        <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-8 h-64 animate-pulse" />
      </div>
    );
  }

  const filteredBooks = (collection.books || []).filter((cb) =>
    cb.book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cb.book.authors?.some((a: string) => a.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#777777] hover:text-[#1D1D1D] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Collections</span>
      </button>

      {/* Header Card */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-md">
        {isEditing ? (
          <div className="space-y-4">
            {saveError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {saveError}
              </div>
            )}
            <input
              autoFocus
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Collection name"
              className="w-full bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl px-4 py-3 text-2xl font-bold text-[#1D1D1D] focus:outline-none focus:border-[#1D1D1D]"
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Collection description (optional)"
              rows={2}
              className="w-full bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl px-4 py-3 text-sm text-[#1D1D1D] focus:outline-none focus:border-[#1D1D1D] resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditName(collection.name);
                  setEditDesc(collection.description || '');
                  setSaveError(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5E0D8] text-xs font-semibold text-[#777777] hover:bg-[#F8F6F1]"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!editName.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1D1D1D] text-[#F8F6F1] text-xs font-bold hover:bg-[#333333] disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="font-serif-title text-4xl font-bold text-[#1D1D1D] mb-2">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="text-sm text-[#777777] leading-relaxed mb-4">{collection.description}</p>
              )}
              <p className="text-xs text-[#777777] font-semibold">
                {collection.books?.length ?? 0} {collection.books?.length === 1 ? 'book' : 'books'} in this collection
              </p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-bold hover:bg-[#E5DCCF] transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#777777] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search books in this collection…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#1D1D1D] focus:outline-none focus:border-[#1D1D1D]"
        />
      </div>

      {/* Books Grid */}
      {(collection.books?.length ?? 0) === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-12 text-center">
          <BookOpen className="w-10 h-10 text-[#E5E0D8] mx-auto mb-3" />
          <p className="text-sm text-[#777777]">No books in this collection yet.</p>
          <p className="text-xs text-[#A0A0A0] mt-1">Add books from the Explore section or book detail pages.</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-12 text-center">
          <p className="text-sm text-[#777777]">No books match "{searchQuery}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((cb) => (
            <div
              key={cb.id}
              className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-2xl p-4 shadow-warm-sm hover:shadow-warm-md transition-shadow flex flex-col"
            >
              <div className="flex gap-4 mb-4">
                {cb.book.coverImage ? (
                  <img
                    src={cb.book.coverImage}
                    alt={cb.book.title}
                    className="w-16 h-24 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-16 h-24 bg-[#EFE8DD] rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-[#A0522D] opacity-40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-sm font-bold text-[#1D1D1D] line-clamp-2">
                    {cb.book.title}
                  </h3>
                  <p className="text-xs text-[#777777] line-clamp-1">
                    {cb.book.authors?.join(', ') || 'Unknown Author'}
                  </p>
                  {cb.book.publisher && (
                    <p className="text-[10px] text-[#A0A0A0] mt-1">{cb.book.publisher}</p>
                  )}
                </div>
              </div>

              {cb.book.description && (
                <p className="text-xs text-[#777777] line-clamp-2 mb-4">{cb.book.description}</p>
              )}

              <button
                onClick={() => handleRemoveBook(cb.bookId)}
                disabled={removingBookId === cb.bookId}
                className="mt-auto flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg border border-[#E5E0D8] text-xs font-semibold text-[#C53030] hover:bg-[#FEE5E5] transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {removingBookId === cb.bookId ? 'Removing...' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
