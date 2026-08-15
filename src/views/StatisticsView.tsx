import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { useAnalytics } from '../hooks/useAnalytics';
import { StatCardSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

const GENRE_COLORS = ['#A0522D', '#E0A96D', '#4A3B32', '#2D4030', '#1B263B', '#6B4F3A', '#8B7355', '#556B2F'];

export const StatisticsView: React.FC = () => {
  const { stats, goal, loading } = useAnalytics();
  const year = new Date().getFullYear();

  if (loading) {
    return (
      <div className="space-y-8 pb-12">
        <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-8 shadow-warm-md animate-pulse h-32" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-8 h-80 animate-pulse" />
      </div>
    );
  }

  const ov = stats?.overview;
  const monthly = stats?.monthly ?? [];
  const genres = (stats?.genreDistribution ?? []).map((g, i) => ({
    ...g,
    color: GENRE_COLORS[i % GENRE_COLORS.length],
    value: g.count,
  }));
  const total = genres.reduce((s, g) => s + g.value, 0);

  return (
    <div className="space-y-8 pb-12">

      {/* Header */}
      <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-beige)] text-[var(--ink)] text-xs font-semibold mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Reading Analytics Engine</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[var(--ink)]">Reading Statistics</h1>
          <p className="text-xs text-[var(--muted)] mt-1">Detailed metric breakdown of pages turned, hours logged, and genre resonance.</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-2xl p-5 shadow-warm-sm">
          <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Total Pages Read</span>
          <h3 className="font-serif-title text-3xl font-bold text-[var(--ink)] my-1">{(ov?.totalPagesRead ?? 0).toLocaleString()}</h3>
          <span className="text-[11px] text-[#A0522D] font-medium">All time</span>
        </div>

        <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-2xl p-5 shadow-warm-sm">
          <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Hours Logged</span>
          <h3 className="font-serif-title text-3xl font-bold text-[var(--ink)] my-1">{ov?.totalHours ?? 0} hrs</h3>
          <span className="text-[11px] text-[#2D4030] font-medium">Deep focus reading</span>
        </div>

        <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-2xl p-5 shadow-warm-sm">
          <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Finished Volumes</span>
          <h3 className="font-serif-title text-3xl font-bold text-[var(--ink)] my-1">{ov?.booksCompleted ?? 0} Books</h3>
          {goal && (
            <span className="text-[11px] text-[var(--muted)]">{year} Goal: {goal.targetBooks}</span>
          )}
        </div>

        <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-2xl p-5 shadow-warm-sm">
          <span className="text-[10px] font-bold uppercase text-[var(--muted)]">Active Streak</span>
          <h3 className="font-serif-title text-3xl font-bold text-[var(--ink)] my-1">{ov?.readingStreak ?? 0} Days</h3>
          <span className="text-[11px] text-[#B8860B] font-medium">Keep it going</span>
        </div>
      </div>

      {monthly.length > 0 && (
        <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-sm">
          <h3 className="font-serif-title text-2xl font-bold text-[var(--ink)] mb-4">Monthly Pages Turned Trend</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A0522D" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#A0522D" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#777777" fontSize={11} tickLine={false} />
                <YAxis stroke="#777777" fontSize={11} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="pages" stroke="#A0522D" strokeWidth={3} fillOpacity={1} fill="url(#colorPages)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {genres.length > 0 && (
        <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-6 md:p-8 shadow-warm-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="font-serif-title text-2xl font-bold text-[var(--ink)] mb-2">Genre Resonance Breakdown</h3>
            <p className="text-xs text-[var(--muted)] mb-6 leading-relaxed">
              Distribution across your entire reading library.
            </p>
            <div className="space-y-2">
              {genres.map((g) => (
                <div key={g.name} className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                    <span>{g.name}</span>
                  </div>
                  <span className="font-bold text-[var(--ink)]">
                    {total > 0 ? Math.round((g.value / total) * 100) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={genres} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={4}>
                  {genres.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {genres.length === 0 && monthly.every((m) => m.pages === 0) && (
        <div className="bg-[var(--white)] border border-[var(--border-light)] rounded-3xl p-12 shadow-warm-sm text-center">
          <p className="text-[var(--muted)] text-sm">Start reading and logging sessions to see your analytics.</p>
        </div>
      )}

    </div>
  );
};
