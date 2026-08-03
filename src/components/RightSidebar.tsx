import React from 'react';
import { ReaderUser, Quote } from '../types';
import { currentUser as defaultUser, sampleQuotes } from '../data/mockData';
import { Flame, Calendar, Sparkles, Trophy, Users, Heart, ArrowRight } from 'lucide-react';

interface RightSidebarProps {
  user?: ReaderUser;
  quoteOfDay?: Quote;
  onOpenPlanner?: () => void;
  onOpenCommunity?: () => void;
  currentlyReadingBook?: any;
  quotes?: Quote[];
  onOpenReader?: (book: any) => void;
  onNavigate?: (view: any) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  user = defaultUser,
  quoteOfDay = sampleQuotes[0],
  onOpenPlanner,
  onOpenCommunity,
  onNavigate,
}) => {
  const readMins = user?.todayMinutesRead ?? 35;
  const goalMins = user?.todayGoalMinutes ?? 45;
  const goalPercentage = Math.min(100, Math.round((readMins / Math.max(1, goalMins)) * 100));

  const activeQuote = quoteOfDay || sampleQuotes[0];
  const readBooks = user?.yearlyReadBooks ?? 18;
  const goalBooks = user?.yearlyGoalBooks ?? 30;

  return (
    <aside className="w-80 bg-[#F8F6F1] border-l border-[#E5E0D8] p-5 hidden xl:flex flex-col gap-6 overflow-y-auto">
      
      {/* Daily Goal & Streak Card */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-5 shadow-warm-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-[#777777] uppercase tracking-wider">Today's Focus</span>
          <div className="flex items-center gap-1.5 bg-[#FFF8E7] text-[#B8860B] px-2.5 py-1 rounded-full text-xs font-bold">
            <Flame className="w-3.5 h-3.5 fill-current" />
            <span>{user?.streakDays ?? 14} Day Streak</span>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-baseline mb-1">
            <h4 className="font-serif-title text-xl font-bold text-[#1D1D1D]">{readMins} mins</h4>
            <span className="text-xs text-[#777777]">Goal: {goalMins} mins</span>
          </div>
          
          {/* Goal Progress Ring / Bar */}
          <div className="w-full h-2.5 bg-[#EFE8DD] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1D1D1D] rounded-full transition-all duration-500"
              style={{ width: `${goalPercentage}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => onOpenPlanner ? onOpenPlanner() : (onNavigate && onNavigate('smart-planner'))}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-[#EFE8DD] hover:bg-[#E5DCCF] text-[#1D1D1D] text-xs font-semibold transition-all"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Adjust Reading Schedule</span>
        </button>
      </div>

      {/* Quote of the Day Card */}
      {activeQuote && (
        <div className="bg-[#1D1D1D] text-[#F8F6F1] rounded-3xl p-5 shadow-warm-md relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#E0A96D]/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-2 text-[#E0A96D] text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Book Quote of the Day</span>
          </div>
          <p className="font-serif-title italic text-lg leading-snug mb-3">
            "{activeQuote.text}"
          </p>
          <div className="text-xs text-[#E0E1DD]/80">
            <span className="font-semibold block text-[#F8F6F1]">{activeQuote.author}</span>
            <span className="text-[11px] text-[#A0A0A0]">{activeQuote.bookTitle}</span>
          </div>
        </div>
      )}

      {/* Friends Activity */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-5 shadow-warm-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold text-[#777777] uppercase tracking-wider">Friend Activity</h4>
          <button
            onClick={() => onOpenCommunity ? onOpenCommunity() : (onNavigate && onNavigate('community'))}
            className="text-xs font-semibold text-[#1D1D1D] hover:underline flex items-center gap-1"
          >
            <span>See all</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <img
              src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=100&q=80"
              alt="Clara"
              className="w-8 h-8 rounded-full object-cover mt-0.5"
            />
            <div className="flex-1 text-xs">
              <span className="font-semibold text-[#1D1D1D]">Clara Vance</span>
              <p className="text-[#777777]">Finished <span className="italic text-[#1D1D1D]">The Architecture of Solitude</span></p>
              <span className="text-[10px] text-[#A0A0A0]">2 hours ago</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"
              alt="Marcus"
              className="w-8 h-8 rounded-full object-cover mt-0.5"
            />
            <div className="flex-1 text-xs">
              <span className="font-semibold text-[#1D1D1D]">Marcus Thorne</span>
              <p className="text-[#777777]">Bookmarked Chapter 3 in <span className="italic text-[#1D1D1D]">The Daily Stoic</span></p>
              <span className="text-[10px] text-[#A0A0A0]">5 hours ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Yearly Reading Goal Progress */}
      <div className="bg-[#EFE8DD] rounded-3xl p-5 border border-[#E5DCCF]">
        <div className="flex items-center gap-2 mb-2 text-[#1D1D1D]">
          <Trophy className="w-4 h-4 text-[#B8860B]" />
          <h4 className="text-xs font-bold uppercase tracking-wider">2026 Reading Challenge</h4>
        </div>
        <p className="text-xs text-[#777777] mb-3">
          You have finished <span className="font-bold text-[#1D1D1D]">{readBooks}</span> of {goalBooks} books this year!
        </p>
        <div className="w-full bg-[#FFFFFF] h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1D1D1D] transition-all"
            style={{ width: `${(readBooks / Math.max(1, goalBooks)) * 100}%` }}
          />
        </div>
      </div>

    </aside>
  );
};
