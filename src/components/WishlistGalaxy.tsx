import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookCover } from './BookCover';
import { LoadMore } from './LoadMore';
import { useWishlist } from '../hooks/useWishlist';
import type { WishlistEntry } from '../services/api';
import { Sparkles, Orbit, BookOpen, Loader2, Trash2, MoveRight } from 'lucide-react';
import { m } from '../motion';

/** One page of saved books. Past this the orbit gets too crowded to read. */
const GALAXY_PAGE = 24;

/**
 * Orbit radius per priority, in px. Priority is the one thing a wishlist row
 * carries that the shelf doesn't, so it earns the layout: what you want most
 * sits closest to the centre. Capped at 190 because the canvas is 400px tall and
 * the outer card clips.
 */
const ORBIT: Record<WishlistEntry['priority'], number> = {
  HIGH: 100,
  MEDIUM: 145,
  LOW: 190,
};

const PRIORITY_LABEL: Record<WishlistEntry['priority'], string> = {
  HIGH: 'Must read',
  MEDIUM: 'Someday',
  LOW: 'Curious',
};

/**
 * The wishlist as an orbit, on live data.
 *
 * Books are laid out ring-by-priority and each ring spreads its own members
 * evenly, so a wishlist that is all HIGH still fans out instead of stacking.
 */
export const WishlistGalaxy: React.FC = () => {
  const navigate = useNavigate();
  const { entries, total, loading, loadingMore, error, hasMore, loadMore, removeBook } = useWishlist(GALAXY_PAGE);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const hovered = hoveredId ? entries.find((e) => e.id === hoveredId) ?? null : null;

  // Index within a priority band, so each ring distributes its own angle rather
  // than every book sharing one 0..n sweep and bunching up on the inner ring.
  const bandIndex = new Map<string, { i: number; of: number }>();
  (['HIGH', 'MEDIUM', 'LOW'] as const).forEach((priority) => {
    const band = entries.filter((e) => e.priority === priority);
    band.forEach((entry, i) => bandIndex.set(entry.id, { i, of: band.length }));
  });

  return (
    <div className="w-full min-h-[80vh] bg-[#12141D] text-[var(--bg-ivory)] rounded-3xl p-6 md:p-10 relative overflow-hidden flex flex-col justify-between border border-[#2A2E3D]">

      {/* Background Starfield Particles */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#E0A96D]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#E0A96D] text-xs font-semibold mb-3">
            <Orbit className="w-3.5 h-3.5" />
            <span>Celestial Reading Map</span>
          </div>
          <h2 className="font-serif-title text-4xl md:text-5xl font-bold mb-2">Wishlist Galaxy</h2>
          <p className="text-sm text-[#A0A0A0]">
            Your saved books in orbit, closest first: the ones you marked must-read ride the inner
            ring. Hover a volume to inspect it, click through for details.
          </p>
        </div>

        {/* Priority legend — the rings mean something, so say what. */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {(['HIGH', 'MEDIUM', 'LOW'] as const).map((priority) => (
            <span
              key={priority}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-[#E0A96D]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E0A96D]" />
              {PRIORITY_LABEL[priority]}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className="relative z-10 mt-6 bg-red-500/10 border border-red-500/30 rounded-2xl px-6 py-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Constellation Canvas Orbit Area */}
      <div className="relative z-10 my-12 w-full h-[400px] flex items-center justify-center">

        {/* Orbital Rings — one per priority band, matching ORBIT above */}
        <div className="absolute w-[200px] h-[200px] border border-white/20 rounded-full pointer-events-none" />
        <div className="absolute w-[290px] h-[290px] border border-white/10 rounded-full pointer-events-none" />
        <div className="absolute w-[380px] h-[380px] border border-white/5 rounded-full pointer-events-none" />

        {/* Center Library Sun Monolith */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#E0A96D] to-[#FFF2A3] flex items-center justify-center shadow-[0_0_50px_rgba(224,169,109,0.5)] z-10">
          <Sparkles className="w-8 h-8 text-[#12141D]" />
        </div>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-30 bg-[#12141D]/60 backdrop-blur-sm rounded-2xl">
            <Loader2 className="w-7 h-7 animate-spin text-[#E0A96D]" />
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30 text-center px-6">
            <BookOpen className="w-12 h-12 text-white/20 mb-3" />
            <p className="font-serif-title text-2xl text-white">Nothing in orbit yet.</p>
            <p className="text-xs text-[#A0A0A0] mt-1 mb-5 max-w-sm">
              Save a book you want but don't own and it takes up a place in this sky.
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E0A96D] text-[#12141D] font-bold text-xs hover:bg-[#D49A5B] transition-all"
            >
              <span>Browse the catalog</span>
              <MoveRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Floating Book Orbit Nodes */}
        {entries.map((entry, index) => {
          const band = bandIndex.get(entry.id) ?? { i: index, of: entries.length };
          // Quarter-turn offset per ring so the three bands don't line up along
          // the same spokes.
          const offset = ORBIT[entry.priority] === ORBIT.HIGH ? 0 : Math.PI / 4;
          const angle = (band.i / Math.max(1, band.of)) * 2 * Math.PI + offset;
          const radius = ORBIT[entry.priority];
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const book = entry.book;

          return (
            // The positioning transform lives on this plain wrapper: Motion owns
            // the transform of the element it animates, so the float below would
            // otherwise overwrite the orbit placement.
            <div key={entry.id} className="absolute z-20" style={{ transform: `translate(${x}px, ${y}px)` }}>
              <m.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 5 + (index % 4), repeat: Infinity, ease: 'easeInOut' }}
                onMouseEnter={() => setHoveredId(entry.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => navigate(`/book/${book.id}`)}
                whileHover={{ scale: 1.25 }}
                className="cursor-pointer group"
                title={`${book.title}${book.authors?.[0] ? ` by ${book.authors[0]}` : ''}`}
              >
                <div className="w-14 h-20 rounded-lg overflow-hidden border-2 border-white/30 shadow-2xl group-hover:border-[#E0A96D] transition-colors">
                  <BookCover
                    title={book.title}
                    author={book.authors?.[0]}
                    coverUrl={book.coverImage}
                    isbn13={book.isbn13}
                    isbn10={book.isbn10}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Star Glow */}
                <div className="w-2 h-2 rounded-full bg-[#E0A96D] absolute -bottom-2 left-1/2 -translate-x-1/2 shadow-[0_0_10px_#E0A96D]" />
              </m.div>
            </div>
          );
        })}
      </div>

      {/* Hovered Book Info Inspector Panel */}
      <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-h-[80px] flex items-center justify-between">
        {hovered ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <BookCover
                title={hovered.book.title}
                author={hovered.book.authors?.[0]}
                coverUrl={hovered.book.coverImage}
                isbn13={hovered.book.isbn13}
                isbn10={hovered.book.isbn10}
                className="w-10 h-14 rounded object-cover shrink-0"
              />
              <div className="min-w-0">
                <h4 className="font-serif-title text-xl font-bold text-white truncate">{hovered.book.title}</h4>
                <p className="text-xs text-[#A0A0A0] truncate">
                  by {hovered.book.authors?.length ? hovered.book.authors.join(', ') : 'Unknown Author'}
                  {' • '}
                  {PRIORITY_LABEL[hovered.priority]}
                </p>
                {hovered.notes && <p className="text-[11px] text-[#A0A0A0] italic mt-0.5 truncate">{hovered.notes}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => navigate(`/book/${hovered.book.id}`)}
                className="px-4 py-2 rounded-full bg-[#E0A96D] text-[#12141D] font-bold text-xs hover:bg-[#D49A5B] transition-all"
              >
                Open Book Detail
              </button>
              <button
                onClick={() => {
                  setHoveredId(null);
                  removeBook(hovered.id);
                }}
                aria-label="Remove from wishlist"
                className="p-2 rounded-full bg-white/10 text-[#A0A0A0] hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#A0A0A0] italic text-center w-full">
            {entries.length > 0
              ? 'Hover over any celestial volume in the galaxy to reveal its details...'
              : 'The inspector lights up once there is something in orbit.'}
          </p>
        )}
      </div>

      {!loading && entries.length > 0 && (
        <div className="relative z-10">
          <LoadMore
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
            endLabel={`${total} ${total === 1 ? 'volume' : 'volumes'} in orbit`}
          />
        </div>
      )}
    </div>
  );
};
