import React from 'react';
import { Book } from '../types';
import { Dna, Sparkles, Brain, Clock, Compass, BookOpen } from 'lucide-react';

interface BookDNAProps {
  books: Book[];
}

export const BookDNA: React.FC<BookDNAProps> = ({ books }) => {
  const readBooks = books.filter((b) => b.status === 'completed' || b.progress > 0);

  return (
    <div className="w-full bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-10 shadow-warm-md">
      
      {/* Header */}
      <div className="max-w-2xl mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold mb-3">
          <Dna className="w-3.5 h-3.5 text-[#A0522D]" />
          <span>Literary Genome Engine</span>
        </div>
        <h2 className="font-serif-title text-4xl font-bold text-[#1D1D1D] mb-2">Your Book DNA</h2>
        <p className="text-sm text-[#777777]">
          An algorithmic synthesis of your reading habits, prose complexity preferences, thematic resonance, and mood signatures.
        </p>
      </div>

      {/* Grid of DNA Vectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        
        {/* Dominant Writing Style */}
        <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-6">
          <div className="w-10 h-10 rounded-xl bg-[#1D1D1D] text-[#F8F6F1] flex items-center justify-center mb-4">
            <Brain className="w-5 h-5" />
          </div>
          <span className="text-xs uppercase font-semibold text-[#777777] tracking-wider">Prose Signature</span>
          <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D] my-1">Quietly Atmospheric</h3>
          <p className="text-xs text-[#777777] leading-relaxed">
            You prefer contemplative prose with rich sensory detail, tactile interior architecture, and measured pacing over high-velocity plot twists.
          </p>
        </div>

        {/* Favorite Mood Resonance */}
        <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-6">
          <div className="w-10 h-10 rounded-xl bg-[#A0522D] text-[#FFFFFF] flex items-center justify-center mb-4">
            <Compass className="w-5 h-5" />
          </div>
          <span className="text-xs uppercase font-semibold text-[#777777] tracking-wider">Mood Palette</span>
          <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D] my-1">Solitary Melancholy & Wisdom</h3>
          <p className="text-xs text-[#777777] leading-relaxed">
            72% of your highest-rated volumes focus on philosophical introspection, rain-soaked landscapes, and Stoic resilience.
          </p>
        </div>

        {/* Reading Velocity */}
        <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-6">
          <div className="w-10 h-10 rounded-xl bg-[#2D4030] text-[#FFFFFF] flex items-center justify-center mb-4">
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-xs uppercase font-semibold text-[#777777] tracking-wider">Reading Velocity</span>
          <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D] my-1">42 Pages / Hour</h3>
          <p className="text-xs text-[#777777] leading-relaxed">
            Deep immersive reading pace. You average 32 minutes per session, most frequently active during quiet twilight hours (10 PM – 1 AM).
          </p>
        </div>

      </div>

      {/* DNA Helix Visual Breakdown Bars */}
      <div className="bg-[#F8F6F1] rounded-2xl p-6 border border-[#E5E0D8]">
        <h4 className="font-serif-title text-xl font-bold text-[#1D1D1D] mb-4">Genre Affinity Strands</h4>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-medium text-[#1D1D1D] mb-1">
              <span>Architecture & Spatial Philosophy</span>
              <span>38%</span>
            </div>
            <div className="w-full bg-[#EFE8DD] h-2.5 rounded-full overflow-hidden">
              <div className="bg-[#A0522D] h-full rounded-full" style={{ width: '38%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-[#1D1D1D] mb-1">
              <span>Classic Philosophy & Stoicism</span>
              <span>28%</span>
            </div>
            <div className="w-full bg-[#EFE8DD] h-2.5 rounded-full overflow-hidden">
              <div className="bg-[#4A3B32] h-full rounded-full" style={{ width: '28%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-[#1D1D1D] mb-1">
              <span>Nordic Noir & Gothic Mystery</span>
              <span>22%</span>
            </div>
            <div className="w-full bg-[#EFE8DD] h-2.5 rounded-full overflow-hidden">
              <div className="bg-[#1B263B] h-full rounded-full" style={{ width: '22%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
