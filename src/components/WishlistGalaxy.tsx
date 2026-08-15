import React, { useState } from 'react';
import { Book } from '../types';
import { Sparkles, Orbit, Star, BookOpen, Bookmark } from 'lucide-react';

interface WishlistGalaxyProps {
  wishlistBooks: Book[];
  onSelectBook: (book: Book) => void;
}

export const WishlistGalaxy: React.FC<WishlistGalaxyProps> = ({
  wishlistBooks,
  onSelectBook,
}) => {
  const [hoveredBook, setHoveredBook] = useState<Book | null>(null);

  return (
    <div className="w-full min-h-[80vh] bg-[#12141D] text-[var(--bg-ivory)] rounded-3xl p-6 md:p-10 relative overflow-hidden flex flex-col justify-between border border-[#2A2E3D]">
      
      {/* Background Starfield Particles */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#E0A96D]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#E0A96D] text-xs font-semibold mb-3">
          <Orbit className="w-3.5 h-3.5" />
          <span>Celestial Reading Map</span>
        </div>
        <h2 className="font-serif-title text-4xl md:text-5xl font-bold mb-2">Wishlist Galaxy</h2>
        <p className="text-sm text-[#A0A0A0]">
          Your saved books floating in an interactive gravitational orbit. Click any celestial volume to inspect its details or add it to your active shelf.
        </p>
      </div>

      {/* Constellation Canvas Orbit Area */}
      <div className="relative z-10 my-12 w-full h-[400px] flex items-center justify-center">
        
        {/* Orbital Rings */}
        <div className="absolute w-[280px] h-[280px] border border-white/10 rounded-full pointer-events-none animate-spin-slow" style={{ animationDuration: '60s' }} />
        <div className="absolute w-[440px] h-[440px] border border-white/5 rounded-full pointer-events-none animate-spin-slow" style={{ animationDuration: '90s' }} />

        {/* Center Library Sun Monolith */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#E0A96D] to-[#FFF2A3] flex items-center justify-center shadow-[0_0_50px_rgba(224,169,109,0.5)] z-10">
          <Sparkles className="w-8 h-8 text-[#12141D]" />
        </div>

        {/* Floating Book Orbit Nodes */}
        {wishlistBooks.map((book, index) => {
          const angle = (index / Math.max(1, wishlistBooks.length)) * 2 * Math.PI;
          const radius = 180 + (index % 2) * 50;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <div
              key={book.id}
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
              onMouseEnter={() => setHoveredBook(book)}
              onMouseLeave={() => setHoveredBook(null)}
              onClick={() => onSelectBook(book)}
              className="absolute z-20 cursor-pointer group transition-all duration-300 hover:scale-125"
            >
              <div className="w-14 h-20 rounded-lg overflow-hidden border-2 border-white/30 shadow-2xl group-hover:border-[#E0A96D] transition-colors">
                <img src={book.cover} alt={book.title} className="w-full h-full object-cover" />
              </div>

              {/* Star Glow */}
              <div className="w-2 h-2 rounded-full bg-[#E0A96D] absolute -bottom-2 left-1/2 -translate-x-1/2 shadow-[0_0_10px_#E0A96D]" />
            </div>
          );
        })}
      </div>

      {/* Hovered Book Info Inspector Panel */}
      <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-h-[80px] flex items-center justify-between">
        {hoveredBook ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <img src={hoveredBook.cover} alt={hoveredBook.title} className="w-10 h-14 rounded object-cover" />
              <div>
                <h4 className="font-serif-title text-xl font-bold text-white">{hoveredBook.title}</h4>
                <p className="text-xs text-[#A0A0A0]">by {hoveredBook.author} • {hoveredBook.price || 'In Library'}</p>
              </div>
            </div>
            <button
              onClick={() => onSelectBook(hoveredBook)}
              className="px-4 py-2 rounded-full bg-[#E0A96D] text-[#12141D] font-bold text-xs hover:bg-[#D49A5B] transition-all"
            >
              Open Book Detail
            </button>
          </div>
        ) : (
          <p className="text-xs text-[#A0A0A0] italic text-center w-full">
            Hover over any celestial volume in the galaxy to reveal its details...
          </p>
        )}
      </div>
    </div>
  );
};
