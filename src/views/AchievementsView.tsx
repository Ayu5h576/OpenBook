import React from 'react';
import {
  Award, ShieldCheck, Flame, BookOpen, Star, Sparkles, CheckCircle2,
  Library, Clock, Compass, MessageSquare, Users, UserPlus, Trophy,
  BookMarked, CalendarDays, PenLine,
} from 'lucide-react';
import { useAchievements } from '../hooks/useAchievements';
import { AchievementSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';

// Maps the backend catalog's string icon names to lucide-react components.
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  BookMarked,
  Library,
  Star,
  ShieldCheck,
  Flame,
  CalendarDays,
  Clock,
  Compass,
  PenLine,
  MessageSquare,
  Users,
  UserPlus,
  Award,
  Trophy,
  Sparkles,
};

function unlockedDateLabel(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export const AchievementsView: React.FC = () => {
  const { achievements, summary, loading, error } = useAchievements();

  return (
    <div className="space-y-8 pb-12">

      {/* Header */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] text-xs font-semibold mb-2">
            <Award className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Literary Milestones</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[var(--ink)]">Achievements & Badges</h1>
          <p className="text-xs text-[var(--muted)] mt-1">
            {loading ? 'Tallying your milestones…' : `${summary.unlocked} of ${summary.total} Milestones Unlocked`}
          </p>
        </div>
        {!loading && summary.total > 0 && (
          <div className="flex flex-col items-center">
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" stroke="#EFE8DD" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="16" fill="none" stroke="#A0522D" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${(summary.unlocked / summary.total) * 100} 100`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[var(--ink)]">
                {Math.round((summary.unlocked / summary.total) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <AchievementSkeleton key={i} />)}
        </div>
      ) : error ? (
        <ErrorBanner message={error} />
      ) : achievements.length === 0 ? (
        <EmptyState
          preset="achievements"
          title="No achievements yet"
          description="Keep reading — achievements unlock automatically as you hit milestones."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievements.map((b) => {
            const IconComp = ICON_MAP[b.icon] ?? Award;
            return (
              <div
                key={b.key}
                className={`border rounded-3xl p-6 shadow-warm-sm transition-all flex flex-col justify-between ${
                  b.unlocked ? 'bg-[var(--white)] border-[var(--border-light)]' : 'bg-[var(--bg-ivory)] border-[var(--border-light)] opacity-70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${b.unlocked ? 'bg-[var(--ink)] text-[var(--bg-ivory)]' : 'bg-[var(--bg-beige)] text-[var(--muted)]'}`}>
                      <IconComp className="w-6 h-6" />
                    </div>
                    {b.unlocked ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#2D4030] bg-[#E8F0E9] px-2.5 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Unlocked
                      </span>
                    ) : (
                      <span className="text-[11px] text-[var(--muted)] font-semibold">Locked</span>
                    )}
                  </div>

                  <h3 className="font-serif-title text-2xl font-bold text-[var(--ink)] mb-1">{b.title}</h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed mb-4">{b.description}</p>
                </div>

                <div className="pt-3 border-t border-[var(--border-light)]">
                  {b.unlocked ? (
                    <span className="text-[11px] text-[var(--muted)]">{unlockedDateLabel(b.unlockedAt) || 'Unlocked'}</span>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-[var(--muted)] mb-1.5">
                        <span>{b.progress.toLocaleString()} / {b.threshold.toLocaleString()} {b.unit}</span>
                        <span>{b.progressPercent}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--bg-beige)] overflow-hidden">
                        <div className="h-full bg-[#A0522D] rounded-full transition-all" style={{ width: `${b.progressPercent}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
