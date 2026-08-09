import React, { useState } from 'react';
import { ViewMode } from '../types';
import { FolderHeart, Plus, Trash2, X, Check } from 'lucide-react';
import { useCollections } from '../hooks/useCollections';
import { ApiCollection } from '../services/api';

interface CollectionsViewProps {
  onNavigate: (view: ViewMode) => void;
  onSelectCollection?: (collectionId: string) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({ onNavigate, onSelectCollection }) => {
  const { collections, loading, createCollection, deleteCollection } = useCollections();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createCollection({ name: newName.trim(), description: newDesc.trim() || undefined });
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
    } catch {}
    setCreating(false);
  };

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
          <p className="text-xs text-[#777777] mt-1">Group books by theme, mood, or reading order.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1D1D1D] text-[#F8F6F1] text-xs font-bold hover:bg-[#333333] transition-all shadow-warm-md"
        >
          <Plus className="w-4 h-4" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 shadow-warm-md">
          <h3 className="font-serif-title text-xl font-bold text-[#1D1D1D] mb-4">Create Collection</h3>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <input
              autoFocus
              required
              placeholder="Collection name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl px-4 py-2.5 text-sm text-[#1D1D1D] focus:outline-none focus:border-[#1D1D1D]"
            />
            <textarea
              rows={2}
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl px-4 py-2.5 text-sm text-[#1D1D1D] focus:outline-none focus:border-[#1D1D1D] resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E5E0D8] text-xs font-semibold text-[#777777] hover:bg-[#F8F6F1]">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button type="submit" disabled={creating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1D1D1D] text-[#F8F6F1] text-xs font-bold hover:bg-[#333333] disabled:opacity-50">
                <Check className="w-3.5 h-3.5" /> {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 h-52 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && collections.length === 0 && (
        <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-12 text-center">
          <FolderHeart className="w-10 h-10 text-[#E5E0D8] mx-auto mb-3" />
          <p className="text-sm text-[#777777]">No collections yet. Create one to group your books by theme.</p>
        </div>
      )}

      {/* Collections grid */}
      {!loading && collections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {collections.map((col: ApiCollection) => (
            <div
              key={col.id}
              onClick={() => onSelectCollection?.(col.id)}
              className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 shadow-warm-sm hover:shadow-warm-md transition-all flex flex-col justify-between cursor-pointer hover:border-[#A0522D]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#EFE8DD] text-[#A0522D]">
                    {col.books.length} Volumes
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCollection(col.id);
                    }}
                    className="p-1.5 rounded-full text-[#C53030] hover:bg-[#FEE5E5] transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D] mb-1">{col.name}</h3>
                {col.description && (
                  <p className="text-xs text-[#777777] mb-4 leading-relaxed">{col.description}</p>
                )}
                {col.books.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {col.books.slice(0, 6).map((cb) => (
                      <div key={cb.id}
                        className="w-14 h-20 rounded-lg overflow-hidden shadow-book shrink-0">
                        {cb.book.coverImage
                          ? <img src={cb.book.coverImage} alt={cb.book.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-[#E5E0D8] flex items-center justify-center text-[8px] text-[#777777] p-1 text-center">{cb.book.title}</div>
                        }
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
