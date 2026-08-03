import React from 'react';
import { Award, ShieldCheck, Flame, BookOpen, Star, Sparkles, CheckCircle2 } from 'lucide-react';

export const AchievementsView: React.FC = () => {
  const badges = [
    { id: 1, title: 'First Volume Opened', desc: 'Commenced your initial reading session in OpenBook', date: 'Jan 2026', icon: BookOpen, unlocked: true },
    { id: 2, title: '1,000 Pages Turned', desc: 'Traversed 1,000 pages of literary prose', date: 'Feb 2026', icon: Star, unlocked: true },
    { id: 3, title: '7-Day Reading Streak', desc: 'Maintained continuous daily reading for a full week', date: 'Feb 2026', icon: Flame, unlocked: true },
    { id: 4, title: 'Night Owl Scholar', desc: 'Completed 10 midnight reading sessions past 11 PM', date: 'Mar 2026', icon: Sparkles, unlocked: true },
    { id: 5, title: 'Nordic Connoisseur', desc: 'Finished 5 volumes in Scandinavian Architecture & Design', date: 'Apr 2026', icon: Award, unlocked: true },
    { id: 6, title: '5,000 Pages Milestone', desc: 'Reach 5,000 total pages read across your library', date: 'In Progress (72%)', icon: ShieldCheck, unlocked: false },
  ];

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold mb-2">
            <Award className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Literary Milestones</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[#1D1D1D]">Achievements & Badges</h1>
          <p className="text-xs text-[#777777] mt-1">5 of 6 Milestones Unlocked</p>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {badges.map((b) => {
          const IconComp = b.icon;
          return (
            <div
              key={b.id}
              className={`border rounded-3xl p-6 shadow-warm-sm transition-all flex flex-col justify-between ${
                b.unlocked ? 'bg-[#FFFFFF] border-[#E5E0D8]' : 'bg-[#F8F6F1] border-[#E5E0D8] opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${b.unlocked ? 'bg-[#1D1D1D] text-[#F8F6F1]' : 'bg-[#EFE8DD] text-[#777777]'}`}>
                    <IconComp className="w-6 h-6" />
                  </div>
                  {b.unlocked ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[#2D4030] bg-[#E8F0E9] px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Unlocked
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#777777] font-semibold">Locked</span>
                  )}
                </div>

                <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D] mb-1">{b.title}</h3>
                <p className="text-xs text-[#777777] leading-relaxed mb-4">{b.desc}</p>
              </div>

              <div className="pt-3 border-t border-[#E5E0D8] text-[11px] text-[#777777]">
                <span>{b.date}</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
