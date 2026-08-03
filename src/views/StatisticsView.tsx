import React from 'react';
import { readingStatsMonthly, genreDistribution } from '../data/mockData';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, BookOpen, Clock, Flame, Award } from 'lucide-react';

export const StatisticsView: React.FC = () => {
  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Reading Analytics Engine</span>
          </div>
          <h1 className="font-serif-title text-4xl font-bold text-[#1D1D1D]">Reading Statistics</h1>
          <p className="text-xs text-[#777777] mt-1">Detailed metric breakdown of pages turned, hours logged, and genre resonance.</p>
        </div>
      </div>

      {/* Top Quick Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-2xl p-5 shadow-warm-sm">
          <span className="text-[10px] font-bold uppercase text-[#777777]">Total Pages Read</span>
          <h3 className="font-serif-title text-3xl font-bold text-[#1D1D1D] my-1">3,604</h3>
          <span className="text-[11px] text-[#A0522D] font-medium">+18% vs last month</span>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-2xl p-5 shadow-warm-sm">
          <span className="text-[10px] font-bold uppercase text-[#777777]">Hours Logged</span>
          <h3 className="font-serif-title text-3xl font-bold text-[#1D1D1D] my-1">193 hrs</h3>
          <span className="text-[11px] text-[#2D4030] font-medium">Deep focus reading</span>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-2xl p-5 shadow-warm-sm">
          <span className="text-[10px] font-bold uppercase text-[#777777]">Finished Volumes</span>
          <h3 className="font-serif-title text-3xl font-bold text-[#1D1D1D] my-1">18 Books</h3>
          <span className="text-[11px] text-[#777777]">2026 Challenge Goal: 30</span>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-2xl p-5 shadow-warm-sm">
          <span className="text-[10px] font-bold uppercase text-[#777777]">Active Streak</span>
          <h3 className="font-serif-title text-3xl font-bold text-[#1D1D1D] my-1">14 Days</h3>
          <span className="text-[11px] text-[#B8860B] font-medium">Personal best</span>
        </div>
      </div>

      {/* Monthly Reading Area Chart */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-sm">
        <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D] mb-4">Monthly Pages Turned Trend</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={readingStatsMonthly}>
              <defs>
                <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A0522D" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#A0522D" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="month" stroke="#777777" fontSize={12} tickLine={false} />
              <YAxis stroke="#777777" fontSize={12} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="pages" stroke="#A0522D" strokeWidth={3} fillOpacity={1} fill="url(#colorPages)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Genre Distribution Pie Chart */}
      <div className="bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-8 shadow-warm-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div>
          <h3 className="font-serif-title text-2xl font-bold text-[#1D1D1D] mb-2">Genre Resonance Breakdown</h3>
          <p className="text-xs text-[#777777] mb-6 leading-relaxed">
            Your reading library is strongly anchored in Architecture & Scandinavian Design (35%) followed by Philosophy (25%).
          </p>
          <div className="space-y-2">
            {genreDistribution.map((g) => (
              <div key={g.name} className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                  <span>{g.name}</span>
                </div>
                <span className="font-bold text-[#1D1D1D]">{g.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-64 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={genreDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={4}>
                {genreDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
