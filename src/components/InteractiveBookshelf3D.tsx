import React, { useState, useRef } from 'react';
import { Book } from '../types';
import { BookCover } from './BookCover';
import { ambientEngine } from '../utils/audioSynth';
import { Sparkles, MoveRight, BookOpen, Layers, Maximize2, Play, ArrowLeft, Volume2, Bookmark, Star } from 'lucide-react';

interface InteractiveBookshelf3DProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onOpenReader: (book: Book) => void;
}

export const InteractiveBookshelf3D: React.FC<InteractiveBookshelf3DProps> = ({
  books,
  onSelectBook,
  onOpenReader,
}) => {
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [animatingBookId, setAnimatingBookId] = useState<string | null>(null);
  const [isCameraZooming, setIsCameraZooming] = useState<boolean>(false);
  const [isOpenCinematic, setIsOpenCinematic] = useState<boolean>(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Group books onto multiple wooden shelves
  const shelf1 = books.filter((b) => b.status === 'reading' || b.favorite);
  const shelf2 = books.filter((b) => b.status === 'completed');
  const shelf3 = books.filter((b) => b.status === 'wishlist' || b.status === 'owned' || b.status === 'paused');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || isCameraZooming) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12; // -6deg to +6deg tilt
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12;
    setMousePos({ x, y });
  };

  const handleBookClick = (book: Book) => {
    ambientEngine.playPageTurnSound();
    setAnimatingBookId(book.id);
    setSelectedBookId(book.id);
    setIsCameraZooming(true);

    // Cinematic sequence: pull forward -> camera zoom -> open book modal
    setTimeout(() => {
      setIsOpenCinematic(true);
    }, 550);
  };

  const handleCloseCinematic = () => {
    setIsOpenCinematic(false);
    setTimeout(() => {
      setIsCameraZooming(false);
      setAnimatingBookId(null);
      setSelectedBookId(null);
    }, 400);
  };

  const renderShelf = (shelfTitle: string, shelfBooks: Book[], shelfId: string) => (
    <div key={shelfId} className="mb-14 relative">
      <div className="flex items-center justify-between mb-4 px-4">
        <h3 className="font-serif-title text-2xl font-bold text-[var(--ink)] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#A0522D]" />
          {shelfTitle}
        </h3>
        <span className="text-xs font-semibold text-[var(--muted)]">{shelfBooks.length} Volumes</span>
      </div>

      {/* Wooden Plank Shelf & Books */}
      <div className="relative group">
        
        {/* Horizontal Scrollable Book Array */}
        <div className="flex items-end gap-3 sm:gap-4 px-6 pt-16 pb-3 overflow-x-auto no-scrollbar transform-style-3d min-h-[230px]">
          {shelfBooks.map((book) => {
            const isSelected = selectedBookId === book.id;
            const isAnimating = animatingBookId === book.id;
            const isOtherBookActive = animatingBookId !== null && !isAnimating;

            return (
              <div
                key={book.id}
                onClick={() => handleBookClick(book)}
                style={{
                  width: `${Math.max(34, book.thickness || 38)}px`,
                  height: '185px',
                  backgroundColor: book.spineColor,
                  color: book.spineTextColor || '#FFFFFF',
                  transform: isAnimating
                    ? 'translate3d(0, -50px, 380px) rotateY(-72deg) rotateX(12deg) scale(1.75)'
                    : isOtherBookActive
                    ? 'translate3d(0, 0, -60px) scale(0.92)'
                    : 'translate3d(0, 0, 0px) rotateY(0deg)',
                  boxShadow: isAnimating
                    ? '-25px 35px 60px rgba(0, 0, 0, 0.45), 0 0 30px rgba(160, 82, 45, 0.3)'
                    : undefined,
                  filter: isOtherBookActive ? 'blur(2px) opacity(0.35)' : 'none',
                  transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                  zIndex: isAnimating ? 50 : 1,
                }}
                className={`relative flex-shrink-0 cursor-pointer rounded-t-sm hover:-translate-y-6 hover:rotate-y-12 transition-all transform-style-3d group/book select-none border-l border-white/25`}
                title={`${book.title} by ${book.author}`}
              >
                {/* 3D Spine Ridge Texture */}
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-black/20" />
                <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white/20" />

                {/* Vertical Book Title on Spine */}
                <div className="h-full flex items-center justify-center p-1 overflow-hidden">
                  <span
                    className="writing-mode-vertical font-serif-title text-xs font-bold tracking-wider text-center line-clamp-1 whitespace-nowrap uppercase opacity-90 group-hover/book:opacity-100"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    {book.title}
                  </span>
                </div>

                {/* Top Book Page Edge Texture */}
                <div className="absolute -top-[6px] left-0 right-0 h-[6px] bg-[var(--bg-beige)] border-b border-[#DCD3C5] rounded-t-xs" />

                {/* Hover Pull Indicator */}
                {!isCameraZooming && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[var(--ink)] text-[var(--bg-ivory)] text-[10px] px-2.5 py-1 rounded-full opacity-0 group-hover/book:opacity-100 transition-opacity whitespace-nowrap shadow-warm-md pointer-events-none flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-[#E0A96D]" />
                    <span>Pull Off Shelf</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Real Wooden Shelf Plank Graphic */}
        <div className="w-full h-6 bg-gradient-to-b from-[#8B5A2B] via-[#6B4226] to-[#4A2E1B] rounded-sm shadow-warm-lg relative border-t border-[#A06D3B] flex items-center justify-between px-4">
          <div className="h-full w-full absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-5 pointer-events-none" />
          <div className="text-[9px] uppercase tracking-widest text-[#D2B48C]/70 font-mono font-semibold z-10">
            Solid Oak Shelf Plank
          </div>
          <div className="w-12 h-1 bg-[#3A2213] rounded-full z-10 opacity-50" />
        </div>

        {/* Shelf Drop Shadow */}
        <div className="w-full h-4 bg-black/10 blur-md rounded-full -mt-1" />
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="w-full min-h-[80vh] bg-[var(--bg-ivory)] p-4 md:p-8 rounded-3xl border border-[var(--border-light)] relative overflow-hidden perspective-1000"
    >
      {/* 3D Camera Focus Indicator Banner when Zooming */}
      {isCameraZooming && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--ink)]/90 text-[var(--bg-ivory)] backdrop-blur-md px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 shadow-warm-lg animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-[#E0A96D]" />
          <span>3D Camera Zoom • Pulling volume from shelf...</span>
        </div>
      )}

      {/* Parallax & Camera Stage Container */}
      <div
        className="transition-transform duration-700 ease-out transform-style-3d"
        style={{
          transform: isCameraZooming
            ? 'scale(1.15) translate3d(0, 15px, 160px)'
            : `rotateX(${mousePos.y}deg) rotateY(${mousePos.x}deg)`,
        }}
      >
        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[#A0522D] text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Grand Library</span>
          </div>
          <h2 className="font-serif-title text-4xl md:text-5xl font-bold text-[var(--ink)] mb-3">
            The Wooden Bookshelf
          </h2>
          <p className="text-sm text-[var(--muted)] max-w-xl mx-auto">
            Move your cursor to experience interactive 3D parallax. Click any volume to trigger a smooth camera zoom and pull the book directly off the shelf.
          </p>
        </div>

        {/* Shelves */}
        <div className="max-w-6xl mx-auto space-y-4">
          {renderShelf('Currently Reading & Favorites', shelf1, 'shelf-1')}
          {renderShelf('Completed Volumes', shelf2, 'shelf-2')}
          {renderShelf('Saved & Wishlist Volumes', shelf3, 'shelf-3')}
        </div>
      </div>

      {/* Cinematic 3D Book Inspection Overlay Modal */}
      {selectedBookId && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-500">
          <div className={`bg-[var(--bg-ivory)] rounded-3xl p-8 max-w-2xl w-full border border-[var(--border-light)] shadow-2xl text-center transform transition-all duration-700 ${isOpenCinematic ? 'scale-100 opacity-100 translate-y-0' : 'scale-85 opacity-0 translate-y-12'}`}>
            {(() => {
              const book = books.find((b) => b.id === selectedBookId);
              if (!book) return null;
              return (
                <div className="flex flex-col items-center">
                  <div className="relative group/cover mb-6">
                    <div className="w-44 h-64 rounded-xl overflow-hidden shadow-2xl transform hover:rotate-3 hover:scale-105 transition-all duration-300 border-4 border-[var(--white)]">
                      <BookCover
                        title={book.title}
                        author={book.author}
                        coverUrl={book.cover}
                        isbn13={book.isbn}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute top-2 right-2 bg-[var(--ink)]/80 backdrop-blur-md text-[var(--bg-ivory)] text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span>{book.rating}</span>
                    </div>
                  </div>

                  <span className="text-xs uppercase font-bold text-[#A0522D] tracking-widest mb-1.5">{book.genres.join(' • ')}</span>
                  <h3 className="font-serif-title text-3xl md:text-4xl font-bold text-[var(--ink)] mb-1">{book.title}</h3>
                  <p className="text-sm font-medium text-[var(--muted)] mb-4">by {book.author}</p>
                  
                  <p className="text-xs text-[#555555] max-w-lg mb-6 line-clamp-3 leading-relaxed bg-[var(--bg-beige)]/50 p-3 rounded-2xl border border-[var(--border-light)]">
                    {book.description || "A captivating volume held in your private collection. Open in reader mode or view complete details and highlights."}
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => onOpenReader(book)}
                      className="flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--ink)] text-[var(--bg-ivory)] font-semibold text-sm hover:bg-[#333333] transition-all shadow-warm-md"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Enter Reader Mode</span>
                    </button>
                    <button
                      onClick={() => onSelectBook(book)}
                      className="flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--white)] border border-[var(--border-light)] text-[var(--ink)] font-semibold text-sm hover:bg-[var(--bg-beige)] transition-all shadow-warm-sm"
                    >
                      <span>Volume Details</span>
                      <MoveRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCloseCinematic}
                      className="px-5 py-3 rounded-full bg-[var(--bg-beige)] text-[var(--muted)] hover:text-[var(--ink)] font-semibold text-sm hover:bg-[#E5DCCF] transition-all"
                    >
                      Return to Shelf
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

