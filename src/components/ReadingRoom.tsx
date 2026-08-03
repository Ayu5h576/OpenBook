import React, { useState, useEffect } from 'react';
import { Book, ReadingRoomSettings } from '../types';
import { ambientEngine } from '../utils/audioSynth';
import { Coffee, Volume2, VolumeX, Flame, CloudRain, Sun, Lamp, BookOpen, Settings, Sliders } from 'lucide-react';

interface ReadingRoomProps {
  books: Book[];
  onOpenReader: (book: Book) => void;
}

export const ReadingRoom: React.FC<ReadingRoomProps> = ({ books, onOpenReader }) => {
  const [settings, setSettings] = useState<ReadingRoomSettings>({
    ambientSound: 'rain',
    lightingTheme: 'warm-amber',
    backgroundStyle: 'wood-paneled',
    rainIntensity: 65,
    lampBrightness: 85,
  });

  const [isLampOn, setIsLampOn] = useState<boolean>(true);
  const [activeBook, setActiveBook] = useState<Book>(books[0] || books[1]);

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
        return 'bg-[#211915] text-[#F8F6F1]';
      case 'soft-candle':
        return 'bg-[#1C1410] text-[#F4EBE1]';
      case 'twilight':
        return 'bg-[#121620] text-[#E5E9F0]';
      case 'daylight':
      default:
        return 'bg-[#28231D] text-[#F8F6F1]';
    }
  };

  return (
    <div className={`w-full min-h-[85vh] rounded-3xl p-6 md:p-10 transition-colors duration-700 relative overflow-hidden flex flex-col justify-between ${getLightingClass()}`}>
      
      {/* Background Atmosphere Layers */}
      {/* Rain Animation Effect Overlay */}
      {settings.ambientSound === 'rain' && (
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_24px] animate-pulse" />
      )}

      {/* Fireplace Glow Overlay */}
      {(settings.ambientSound === 'fireplace' || settings.lightingTheme === 'soft-candle') && (
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-[#FF6B35]/15 rounded-full blur-3xl animate-pulse pointer-events-none" />
      )}

      {/* Desk Lamp Light Beam */}
      {isLampOn && (
        <div className="absolute -top-20 right-1/4 w-[500px] h-[600px] bg-gradient-to-b from-[#FFF2A3]/25 via-[#FFF2A3]/10 to-transparent blur-2xl rounded-full pointer-events-none transform -rotate-12" />
      )}

      {/* Header Controls Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 bg-black/30 backdrop-blur-md p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#A0522D] text-[#FFFFFF] flex items-center justify-center">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif-title text-xl font-bold tracking-tight text-white">Reading Haven</h3>
            <p className="text-[11px] text-white/70">Cozy Virtual Sanctuary</p>
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
                ? 'bg-[#FFF2A3] text-[#1D1D1D] border-[#FFF2A3]'
                : 'bg-black/50 text-white/60 border-white/10 hover:text-white'
            }`}
          >
            <Lamp className="w-3.5 h-3.5" />
            <span>{isLampOn ? 'Desk Lamp On' : 'Lamp Off'}</span>
          </button>
        </div>
      </div>

      {/* Main Reading Desk & Book Showcase */}
      <div className="relative z-10 max-w-4xl mx-auto my-auto py-12 flex flex-col md:flex-row items-center gap-8 md:gap-12">
        
        {/* Book Cover Display on Wooden Desk */}
        <div className="relative group perspective-1000">
          <div className="w-52 h-80 rounded-xl overflow-hidden shadow-2xl border border-white/20 transform group-hover:rotate-y-6 transition-transform duration-500">
            <img
              src={activeBook.cover}
              alt={activeBook.title}
              className="w-full h-full object-cover"
            />
          </div>
          {/* Desk shadow reflection */}
          <div className="w-52 h-4 bg-black/40 blur-lg rounded-full -mt-2 mx-auto" />
        </div>

        {/* Reading Room Desk Information */}
        <div className="flex-1 text-center md:text-left space-y-4">
          <span className="inline-block text-xs uppercase tracking-widest text-[#E0A96D] font-semibold bg-black/30 px-3 py-1 rounded-full border border-white/10">
            Open Volume
          </span>
          <h2 className="font-serif-title text-4xl md:text-5xl font-bold text-white leading-tight">
            {activeBook.title}
          </h2>
          <p className="text-sm text-white/80 font-medium">by {activeBook.author}</p>
          <p className="text-sm text-white/60 italic max-w-lg font-reader leading-relaxed">
            "{activeBook.quote || activeBook.description.slice(0, 140)}..."
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center md:justify-start gap-4">
            <button
              onClick={() => onOpenReader(activeBook)}
              className="flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#E0A96D] text-[#1D1D1D] font-bold text-sm hover:bg-[#D49A5B] transition-all shadow-warm-lg"
            >
              <BookOpen className="w-4 h-4" />
              <span>Begin Reading Session</span>
            </button>

            {/* Switch Book Select */}
            <select
              value={activeBook.id}
              onChange={(e) => {
                const found = books.find((b) => b.id === e.target.value);
                if (found) setActiveBook(found);
              }}
              className="bg-black/40 border border-white/20 text-white text-xs rounded-full px-4 py-3 focus:outline-none cursor-pointer"
            >
              {books.map((b) => (
                <option key={b.id} value={b.id} className="bg-[#211915] text-white">
                  {b.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Footer Ambient Info */}
      <div className="relative z-10 flex items-center justify-between text-xs text-white/50 border-t border-white/10 pt-4">
        <span>Active Environment: {settings.ambientSound.toUpperCase()} AUDIO • {settings.lightingTheme.replace('-', ' ').toUpperCase()} LIGHT</span>
        <span className="hidden sm:inline">OpenBook Haven Mode</span>
      </div>
    </div>
  );
};
