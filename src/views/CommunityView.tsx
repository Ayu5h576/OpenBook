import React from 'react';
import { Users, MessageSquare, Heart, Sparkles, BookOpen, UserCheck } from 'lucide-react';

export const CommunityView: React.FC = () => {
  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Bibliophile Network</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[#1D1D1D]">Reader Community</h1>
          <p className="text-xs text-[#777777] mt-1">Join reading clubs, engage in thoughtful chapter discussions, and share favorite marginalia.</p>
        </div>
      </div>

      {/* Reading Clubs & Discussion Boards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 shadow-warm-sm">
          <span className="text-[10px] font-bold uppercase text-[#A0522D] tracking-wider">Active Book Club</span>
          <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D] my-1">Nordic Solitude & Timber Architecture</h3>
          <p className="text-xs text-[#777777] mb-4">Reading <span className="italic">The Architecture of Solitude</span> (Ch. 1-3 this week).</p>
          <div className="flex items-center justify-between pt-3 border-t border-[#E5E0D8] text-xs">
            <span className="text-[#777777]">148 Members</span>
            <button className="px-4 py-1.5 rounded-full bg-[#1D1D1D] text-[#F8F6F1] font-bold">Join Club</button>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 shadow-warm-sm">
          <span className="text-[10px] font-bold uppercase text-[#A0522D] tracking-wider">Active Book Club</span>
          <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D] my-1">Stoic Wisdom & Daily Meditations</h3>
          <p className="text-xs text-[#777777] mb-4">Reading Seneca & Rilke's Letters on creative patience.</p>
          <div className="flex items-center justify-between pt-3 border-t border-[#E5E0D8] text-xs">
            <span className="text-[#777777]">312 Members</span>
            <button className="px-4 py-1.5 rounded-full bg-[#1D1D1D] text-[#F8F6F1] font-bold">Join Club</button>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 shadow-warm-sm">
          <span className="text-[10px] font-bold uppercase text-[#A0522D] tracking-wider">Active Book Club</span>
          <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D] my-1">Dark Academia & Gothic Lore</h3>
          <p className="text-xs text-[#777777] mb-4">Analyzing leather-bound archives and manuscript mysteries.</p>
          <div className="flex items-center justify-between pt-3 border-t border-[#E5E0D8] text-xs">
            <span className="text-[#777777]">204 Members</span>
            <button className="px-4 py-1.5 rounded-full bg-[#1D1D1D] text-[#F8F6F1] font-bold">Join Club</button>
          </div>
        </div>

      </div>

    </div>
  );
};
