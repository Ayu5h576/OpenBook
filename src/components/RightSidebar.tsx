import React from 'react';
import { Quote } from '../types';
import { Flame, Calendar, Sparkles, Trophy, ArrowRight } from 'lucide-react';
import type { User, AnalyticsStats, ReadingGoal, ActivityItem } from '../services/api';

/**
 * Describes the activity verbs for each type so the feed reads naturally.
 */
function activityVerb(type: ActivityItem['type']): string {
  switch (type) {
    case 'FINISHED_BOOK':     return 'finished reading';
    case 'STARTED_BOOK':      return 'started reading';
    case 'ADDED_TO_LIBRARY':  return 'added to library';
    case 'WROTE_REVIEW':      return 'reviewed';
    case 'FOLLOWED_USER':     return 'followed someone';
    case 'CREATED_CLUB':      return 'created a club';
    case 'JOINED_CLUB':       return 'joined a club';
    case 'POSTED_DISCUSSION': return 'posted a discussion';
    case 'UNLOCKED_ACHIEVEMENT': return 'unlocked an achievement';
    default: return 'did something';
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface RightSidebarProps {
  authUser?: User | null;
  stats?: AnalyticsStats | null;
  goal?: ReadingGoal | null;
  activities?: ActivityItem[];
  quoteOfDay?: Quote;
  onOpenPlanner?: () => void;
  onOpenCommunity?: () => void;
  onNavigate?: (view: any) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  authUser,
  stats,
  goal,
  activities = [],
  quoteOfDay,
  onOpenPlanner,
  onOpenCommunity,
  onNavigate,
}) => {
  const streak = stats?.overview?.readingStreak ?? 0;
  const readBooks = stats?.overview?.yearlyCompleted ?? 0;
  const goalBooks = goal?.targetBooks ?? stats?.overview?.yearlyGoal ?? 30;

  // We don't have daily reading minutes in the current analytics API,
  // so we show a simplified version based on pages read today.
  const totalPages = stats?.overview?.totalPagesRead ?? 0;
  const totalHours = stats?.overview?.totalHours ?? 0;

  return (
    <aside className="w-80 bg-[var(--bg-ivory)] border-l border-[var(--border-light)] p-5 hidden xl:flex flex-col gap-6 overflow-y-auto">
      
      {/* Reading Stats Card */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-5 shadow-warm-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Reading Stats</span>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-[#FFF8E7] text-[#B8860B] px-2.5 py-1 rounded-full text-xs font-bold">
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>{streak} Day Streak</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--muted)]">Pages Read</span>
            <h4 className="font-serif-title text-xl font-bold text-[var(--ink)]">{totalPages.toLocaleString()}</h4>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--muted)]">Hours Logged</span>
            <h4 className="font-serif-title text-xl font-bold text-[var(--ink)]">{totalHours}</h4>
          </div>
        </div>

        <button
          onClick={() => onOpenPlanner ? onOpenPlanner() : (onNavigate && onNavigate('smart-planner'))}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-2xl bg-[var(--bg-beige)] hover:bg-[#E5DCCF] text-[var(--ink)] text-xs font-semibold transition-all"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Reading Planner</span>
        </button>
      </div>

      {/* Quote of the Day Card */}
      {quoteOfDay && (
        <div className="bg-[var(--ink)] text-[var(--bg-ivory)] rounded-3xl p-5 shadow-warm-md relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#E0A96D]/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-2 text-[#E0A96D] text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Book Quote of the Day</span>
          </div>
          <p className="font-serif-title italic text-lg leading-snug mb-3">
            "{quoteOfDay.text}"
          </p>
          <div className="text-xs text-[#E0E1DD]/80">
            <span className="font-semibold block text-[var(--bg-ivory)]">{quoteOfDay.author}</span>
            <span className="text-[11px] text-[#A0A0A0]">{quoteOfDay.bookTitle}</span>
          </div>
        </div>
      )}

      {/* Live Activity Feed */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-5 shadow-warm-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Activity</h4>
          <button
            onClick={() => onOpenCommunity ? onOpenCommunity() : (onNavigate && onNavigate('community'))}
            className="text-xs font-semibold text-[var(--ink)] hover:underline flex items-center gap-1"
          >
            <span>See all</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-3">
          {activities.length === 0 && (
            <p className="text-xs text-[var(--muted)] text-center py-2">
              Follow readers to see their activity here.
            </p>
          )}
          {activities.slice(0, 3).map((act) => (
            <div key={act.id} className="flex items-start gap-3">
              {act.actor.avatar ? (
                <img
                  src={act.actor.avatar}
                  alt={act.actor.username}
                  className="w-8 h-8 rounded-full object-cover mt-0.5"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] flex items-center justify-center text-xs font-bold mt-0.5">
                  {act.actor.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 text-xs">
                <span className="font-semibold text-[var(--ink)]">{act.actor.username}</span>
                <p className="text-[var(--muted)]">
                  {activityVerb(act.type)}
                  {act.book && (
                    <> <span className="italic text-[var(--ink)]">{act.book.title}</span></>
                  )}
                </p>
                <span className="text-[10px] text-[#A0A0A0]">{timeAgo(act.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Yearly Reading Goal Progress */}
      <div className="bg-[var(--bg-beige)] rounded-3xl p-5 border border-[#E5DCCF]">
        <div className="flex items-center gap-2 mb-2 text-[var(--ink)]">
          <Trophy className="w-4 h-4 text-[#B8860B]" />
          <h4 className="text-xs font-bold uppercase tracking-wider">{new Date().getFullYear()} Reading Challenge</h4>
        </div>
        <p className="text-xs text-[var(--muted)] mb-3">
          You have finished <span className="font-bold text-[var(--ink)]">{readBooks}</span> of {goalBooks} books this year!
        </p>
        <div className="w-full bg-[var(--white)] h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--ink)] transition-all"
            style={{ width: `${Math.min(100, (readBooks / Math.max(1, goalBooks)) * 100)}%` }}
          />
        </div>
      </div>

    </aside>
  );
};
