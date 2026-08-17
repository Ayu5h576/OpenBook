import React, { useState, useEffect } from 'react';
import { Book, ReadingRoomSettings } from '../types';
import { ambientEngine } from '../utils/audioSynth';
import { useLibrary } from '../hooks/useLibrary';
import { formatDuration, useReadingSession } from '../hooks/useReadingSession';
import { ProgressTracker } from './ProgressTracker';
import type { LibraryEntry } from '../services/api';
import { Coffee, Flame, CloudRain, Lamp, BookOpen, Clock } from 'lucide-react';

interface ReadingRoomProps {
  books: Book[];
  onOpenReader: (book: Book) => void;
}

/**
 * Convert a LibraryEntry to the Book shape needed by onOpenReader.
 */
function entryToBook(entry: LibraryEntry): Book {
  const b = entry.book;
  return {
    id: b.id,
    title: b.title,
    author: b.authors?.[0] || 'Unknown Author',
    authorId: `auth-${b.id}`,
    cover: b.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80',
    spineColor: '#1D1D1D',
    thickness: Math.max(20, Math.min(60, (b.pageCount || 300) / 10)),
    pages: b.pageCount || 300,
    pagesRead: entry.currentPage,
    publisher: b.publisher || 'Independent',
    publishedYear: b.publishedDate ? parseInt(b.publishedDate.substring(0, 4)) : 2024,
    language: b.language || 'English',
    isbn: b.isbn13 || b.isbn10 || `978-${b.id.substring(0, 9)}`,
    rating: b.averageRating || 4.0,
    reviewCount: b.ratingsCount || 0,
    genres: b.categories || ['Fiction'],
    description: b.description || '',
    status: entry.status.toLowerCase() as any,
    favorite: entry.isFavorite,
    progress: b.pageCount ? Math.round((entry.currentPage / b.pageCount) * 100) : 0,
    lastOpened: entry.lastReadAt || entry.updatedAt,
    chapters: [{ id: 1, title: 'Chapter 1', content: '' }],
    notes: [],
    highlights: [],
    comments: [],
  };
}

export const ReadingRoom: React.FC<ReadingRoomProps> = ({ books: _legacyBooks, onOpenReader }) => {
  const { entries, loading } = useLibrary();

  // Filter to currently-reading books, then all others
  const readingEntries = entries.filter((e) => e.status === 'READING');
  const allEntries = readingEntries.length > 0 ? readingEntries : entries;

  const [settings, setSettings] = useState<ReadingRoomSettings>({
    ambientSound: 'rain',
    lightingTheme: 'warm-amber',
    backgroundStyle: 'wood-paneled',
    rainIntensity: 65,
    lampBrightness: 85,
  });

  const [isLampOn, setIsLampOn] = useState<boolean>(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeEntry = allEntries[activeIndex] ?? null;

  // A real, persisted reading session — the timer keeps counting across
  // navigation and reloads, and finishing it logs pages + time for analytics.
  const { isActive: sessionActive, elapsedSecs: sessionSecs } = useReadingSession(activeEntry?.id);

  useEffect(() => {
    ambientEngine.setSound(settings.ambientSound, 0.5);
    return () => {
      ambientEngine.stopAll();
    };
  }, [settings.ambientSound]);

  const handleSoundChange = (sound: ReadingRoomSettings['ambientSound']) => {
    setSettings((prev) => ({ ...prev, ambientSound: sound }));
  };

  // Lighting classes based on theme
  const getLightingClass = () => {
    if (!isLampOn) return 'bg-[#0F0D0C] text-[#E0E1DD]';
    switch (settings.lightingTheme) {
      case 'warm-amber':
        return 'bg-[#211915] text-[var(--bg-ivory)]';
      case 'soft-candle':
        return 'bg-[#1C1410] text-[#F4EBE1]';
      case 'twilight':
        return 'bg-[#121620] text-[#E5E9F0]';
      case 'daylight':
      default:
        return 'bg-[#28231D] text-[var(--bg-ivory)]';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`w-full min-h-[85vh] rounded-3xl p-6 md:p-10 transition-colors duration-700 relative overflow-hidden flex flex-col items-center justify-center text-center ${getLightingClass()}`}>
        <div className="w-14 h-14 rounded-2xl bg-[#A0522D] text-white flex items-center justify-center animate-pulse">
          <Coffee className="w-7 h-7" />
        </div>
        <p className="text-sm text-white/70 mt-4">Preparing your Reading Haven...</p>
      </div>
    );
  }

  // No book to showcase — empty state
  if (!activeEntry) {
    return (
      <div className={`w-full min-h-[85vh] rounded-3xl p-6 md:p-10 transition-colors duration-700 relative overflow-hidden flex flex-col items-center justify-center text-center ${getLightingClass()}`}>
        {isLampOn && (
          <div className="absolute -top-20 right-1/4 w-[500px] h-[600px] bg-gradient-to-b from-[#FFF2A3]/25 via-[#FFF2A3]/10 to-transparent blur-2xl rounded-full pointer-events-none transform -rotate-12" />
        )}
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#A0522D] text-white flex items-center justify-center">
            <Coffee className="w-7 h-7" />
          </div>
          <h2 className="font-serif-title text-3xl md:text-4xl font-bold text-white">Your Reading Haven awaits</h2>
          <p className="text-sm text-white/70 max-w-md">
            Add a book to your library and start reading to settle into the reading room with ambient sound and cozy lighting.
          </p>
        </div>
      </div>
    );
  }

  const book = activeEntry.book;

  return (
    <div className={`w-full min-h-[85vh] rounded-3xl p-6 md:p-10 transition-colors duration-700 relative overflow-hidden flex flex-col justify-between ${getLightingClass()}`}>
      
      {/* Background Atmosphere Layers */}
      {settings.ambientSound === 'rain' && (
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_24px] animate-pulse" />
      )}

      {(settings.ambientSound === 'fireplace' || settings.lightingTheme === 'soft-candle') && (
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-[#FF6B35]/15 rounded-full blur-3xl animate-pulse pointer-events-none" />
      )}

      {isLampOn && (
        <div className="absolute -top-20 right-1/4 w-[500px] h-[600px] bg-gradient-to-b from-[#FFF2A3]/25 via-[#FFF2A3]/10 to-transparent blur-2xl rounded-full pointer-events-none transform -rotate-12" />
      )}

      {/* Header Controls Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#A0522D] text-[var(--white)] flex items-center justify-center">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif-title text-xl font-bold tracking-tight text-white">Reading Haven</h3>
            <p className="text-[11px] text-white/70">Your Library • {allEntries.length} book{allEntries.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Ambient Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Ambient Sound Toggles */}
          <div className="flex items-center bg-black/40 p-1 rounded-full border border-white/10">
            <button
              onClick={() => handleSoundChange('rain')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                settings.ambientSound === 'rain' ? 'bg-[#A0522D] text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5" />
              <span>Rain</span>
            </button>

            <button
              onClick={() => handleSoundChange('fireplace')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                settings.ambientSound === 'fireplace' ? 'bg-[#A0522D] text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Fireplace</span>
            </button>

            <button
              onClick={() => handleSoundChange('none')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                settings.ambientSound === 'none' ? 'bg-white/20 text-white' : 'text-white/70 hover:text-white'
              }`}
            >
              Mute
            </button>
          </div>

          {/* Lamp Toggle Switch */}
          <button
            onClick={() => setIsLampOn(!isLampOn)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              isLampOn
                ? 'bg-[#FFF2A3] text-[var(--ink)] border-[#FFF2A3]'
                : 'bg-black/50 text-white/60 border-white/10 hover:text-white'
            }`}
          >
            <Lamp className="w-3.5 h-3.5" />
            <span>{isLampOn ? 'Lamp On' : 'Lamp Off'}</span>
          </button>

          {/* Live session indicator — the session itself is driven by the
              tracker below so the reader sets start/end pages deliberately. */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              sessionActive
                ? 'bg-green-500/80 text-white border-green-500/50'
                : 'bg-black/50 text-white/60 border-white/10'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{sessionActive ? formatDuration(sessionSecs) : 'No active session'}</span>
          </div>
        </div>
      </div>

      {/* Main Reading Desk & Book Showcase */}
      <div className="relative z-10 max-w-4xl mx-auto my-auto py-12 flex flex-col md:flex-row items-center gap-8 md:gap-12">
        
        {/* Book Cover Display */}
        <div className="relative group perspective-1000">
          <div className="w-52 h-80 rounded-xl overflow-hidden shadow-2xl border border-white/20 transform group-hover:rotate-y-6 transition-transform duration-500">
            <img
              src={book.coverImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'}
              alt={book.title}
              className="w-full h-full object-cover"
            />
          </div>
          {/* Desk shadow reflection */}
          <div className="w-52 h-4 bg-black/40 blur-lg rounded-full -mt-2 mx-auto" />
        </div>

        {/* Reading Room Desk Information */}
        <div className="flex-1 text-center md:text-left space-y-4">
          <span className="inline-block text-xs uppercase tracking-widest text-[#E0A96D] font-semibold bg-black/30 px-3 py-1 rounded-full border border-white/10">
            {activeEntry.status === 'READING' ? 'Currently Reading' : activeEntry.status}
          </span>
          <h2 className="font-serif-title text-4xl md:text-5xl font-bold text-white leading-tight">
            {book.title}
          </h2>
          <p className="text-sm text-white/80 font-medium">by {book.authors?.join(', ') || 'Unknown'}</p>
          
          {book.description && (
            <p className="text-sm text-white/60 italic max-w-lg font-reader leading-relaxed">
              "{book.description.slice(0, 140)}..."
            </p>
          )}

          {/* Reading Progress — manual page or timed session */}
          <ProgressTracker entry={activeEntry} variant="dark" className="max-w-md" />

          <div className="pt-4 flex flex-wrap items-center justify-center md:justify-start gap-4">
            <button
              onClick={() => onOpenReader(entryToBook(activeEntry))}
              className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#E0A96D] text-[var(--ink)] font-bold text-sm hover:bg-[#D49A5B] transition-all shadow-warm-lg"
            >
              <BookOpen className="w-4 h-4" />
              <span>{activeEntry.currentPage > 0 ? 'Continue Reading' : 'Begin Reading'}</span>
            </button>

            {/* Switch Book Select */}
            {allEntries.length > 1 && (
              <select
                value={activeIndex}
                onChange={(e) => setActiveIndex(parseInt(e.target.value))}
                className="bg-black/40 border border-white/20 text-white text-xs rounded-full px-4 py-3 focus:outline-none cursor-pointer"
              >
                {allEntries.map((ent, i) => (
                  <option key={ent.id} value={i} className="bg-[#211915] text-white">
                    {ent.book.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Footer Ambient Info */}
      <div className="relative z-10 flex items-center justify-between text-xs text-white/50 border-t border-white/10 pt-4">
        <span>Active: {settings.ambientSound.toUpperCase()} AUDIO • {settings.lightingTheme.replace('-', ' ').toUpperCase()} LIGHT</span>
        <span className="hidden sm:inline">
          {sessionActive && <span className="text-green-400/80 mr-2">● Recording session</span>}
          OpenBook Haven Mode
        </span>
      </div>
    </div>
  );
};
