import React from 'react';
import { CalendarDays, Flame, CheckCircle, Clock, Sparkles } from 'lucide-react';

export const SmartPlanner: React.FC = () => {
  // Generate 28 days for GitHub style contribution graph
  const days = Array.from({ length: 28 }, (_, i) => {
    const intensity = (i % 5 === 0 || i % 7 === 0) ? 0 : (i % 3 === 0 ? 3 : (i % 2 === 0 ? 2 : 1));
    return { day: i + 1, intensity };
  });

  const getContributionColor = (intensity: number) => {
    switch (intensity) {
      case 3: return 'bg-[#1D1D1D]'; // Highest intensity
      case 2: return 'bg-[#A0522D]';
      case 1: return 'bg-[#E0A96D]';
      default: return 'bg-[#EFE8DD]'; // Rest day
    }
  };

  return (
    <div className="w-full bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-10 shadow-warm-md">
      
      {/* Header */}
      <div className="max-w-2xl mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold mb-3">
          <CalendarDays className="w-3.5 h-3.5 text-[#A0522D]" />
          <span>Intelligent Schedule Generator</span>
        </div>
        <h2 className="font-serif-title text-4xl font-bold text-[#1D1D1D] mb-2">Smart Reading Planner</h2>
        <p className="text-sm text-[#777777]">
          Personalized daily and weekly pacing goals designed to prevent burnout while sustaining a continuous reading habit.
        </p>
      </div>

      {/* GitHub-Style Reading Heatmap Matrix */}
      <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif-title text-xl font-bold text-[#1D1D1D]">August 2026 Reading Heatmap</h3>
            <p className="text-xs text-[#777777]">14 Day Consecutive Reading Streak Active</p>
          </div>
          <div className="flex items-center gap-2 bg-[#FFF8E7] text-[#B8860B] px-3 py-1.5 rounded-full text-xs font-bold">
            <Flame className="w-4 h-4 fill-current" />
            <span>14 Days Streak</span>
          </div>
        </div>

        {/* Contribution Matrix Grid */}
        <div className="grid grid-cols-7 gap-2 max-w-md mx-auto my-4">
          {days.map((d) => (
            <div
              key={d.day}
              className={`aspect-square rounded-md ${getContributionColor(d.intensity)} transition-all hover:scale-110 flex items-center justify-center text-[10px] text-white/80 font-mono`}
              title={`Aug ${d.day}: ${d.intensity * 25} minutes logged`}
            >
              {d.day}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 text-[11px] text-[#777777] mt-2">
          <span>Less</span>
          <div className="w-3 h-3 bg-[#EFE8DD] rounded-sm" />
          <div className="w-3 h-3 bg-[#E0A96D] rounded-sm" />
          <div className="w-3 h-3 bg-[#A0522D] rounded-sm" />
          <div className="w-3 h-3 bg-[#1D1D1D] rounded-sm" />
          <span>More</span>
        </div>
      </div>

      {/* Recommended Pacing Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-5">
          <span className="text-[10px] font-bold uppercase text-[#777777] tracking-wider">Daily Goal</span>
          <h4 className="font-serif-title text-2xl font-bold text-[#1D1D1D] my-1">45 Mins / Day</h4>
          <p className="text-xs text-[#777777]">Recommended window: 10:00 PM – 10:45 PM in Reading Room Mode.</p>
        </div>

        <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-5">
          <span className="text-[10px] font-bold uppercase text-[#777777] tracking-wider">Weekly Target</span>
          <h4 className="font-serif-title text-2xl font-bold text-[#1D1D1D] my-1">280 Pages / Week</h4>
          <p className="text-xs text-[#777777]">Pacing set to finish <span className="italic">The Architecture of Solitude</span> by Sunday.</p>
        </div>

        <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-5">
          <span className="text-[10px] font-bold uppercase text-[#777777] tracking-wider">Monthly Horizon</span>
          <h4 className="font-serif-title text-2xl font-bold text-[#1D1D1D] my-1">3 Books / Month</h4>
          <p className="text-xs text-[#777777]">On track for 100% completion of your 2026 Reading Challenge.</p>
        </div>
      </div>

    </div>
  );
};
