import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderHeart, Plus, Trash2, X, Check } from 'lucide-react';
import { useCollections } from '../hooks/useCollections';
import { ApiCollection } from '../services/api';
import { CollectionCardSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

export const CollectionsView: React.FC = () => {
  const navigate = useNavigate();
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
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] text-xs font-semibold mb-2">
            <FolderHeart className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Theme Archives</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[var(--ink)]">Curated Collections</h1>
          <p className="text-xs text-[var(--muted)] mt-1">Group books by theme, mood, or reading order.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] text-xs font-bold hover:bg-[#333333] transition-all shadow-warm-md"
        >
          <Plus className="w-4 h-4" />
          <span>New Collection</span>
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 shadow-warm-md">
          <h3 className="font-serif-title text-xl font-bold text-[var(--ink)] mb-4">Create Collection</h3>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <input
              autoFocus
              required
              placeholder="Collection name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--ink)]"
            />
            <textarea
              rows={2}
              placeholder="Description (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full bg-[var(--bg-ivory)] border border-[var(--border-light)] rounded-2xl px-4 py-2.5 text-sm text-[var(--ink)] focus:outline-none focus:border-[var(--ink)] resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowCreate(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--border-light)] text-xs font-semibold text-[var(--muted)] hover:bg-[var(--bg-ivory)]">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button type="submit" disabled={creating}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] text-xs font-bold hover:bg-[#333333] disabled:opacity-50">
                <Check className="w-3.5 h-3.5" /> {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[...Array(4)].map((_, i) => <CollectionCardSkeleton key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && collections.length === 0 && (
        <EmptyState
          preset="collections"
          title="No collections yet"
          description="Create a collection to group your books by theme, genre, or mood."
        />
      )}

      {/* Collections grid */}
      {!loading && collections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {collections.map((col: ApiCollection) => (
            <div
              key={col.id}
              onClick={() => navigate(`/collections/${col.id}`)}
              className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 shadow-warm-sm hover:shadow-warm-md transition-all flex flex-col justify-between cursor-pointer hover:border-[#A0522D]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[var(--bg-beige)] text-[#A0522D]">
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
                <h3 className="font-serif-title text-2xl font-bold text-[var(--ink)] mb-1">{col.name}</h3>
                {col.description && (
                  <p className="text-xs text-[var(--muted)] mb-4 leading-relaxed">{col.description}</p>
                )}
                {col.books.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {col.books.slice(0, 6).map((cb) => (
                      <div key={cb.id}
                        className="w-14 h-20 rounded-lg overflow-hidden shadow-book shrink-0">
                        {cb.book.coverImage
                          ? <img src={cb.book.coverImage} alt={cb.book.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-[var(--border-light)] flex items-center justify-center text-[8px] text-[var(--muted)] p-1 text-center">{cb.book.title}</div>
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
