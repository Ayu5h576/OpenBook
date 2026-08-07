import React, { useEffect, useState } from 'react';
import { CalendarDays, Flame, Clock, Sparkles, RefreshCw } from 'lucide-react';
import { AIApiService, PlannerResponse } from '../services/api';
import { useLibrary } from '../hooks/useLibrary';

export const SmartPlanner: React.FC = () => {
  const { entries, loading: libraryLoading } = useLibrary('READING');
  const activeEntry = entries[0];
  const [planner, setPlanner] = useState<PlannerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlanner = async () => {
    if (!activeEntry) return;
    setLoading(true);
    setError(null);
    const response = await AIApiService.getPlanner(activeEntry.bookId, 45);
    if (response.error) {
      setError(response.error);
    } else {
      setPlanner(response.data ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPlanner();
  }, [activeEntry?.bookId]);

  return (
    <div className="w-full bg-[#FFFFFF] border border-[#E5E0D8] rounded-3xl p-6 md:p-10 shadow-warm-md">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFE8DD] text-[#1D1D1D] text-xs font-semibold mb-3">
            <CalendarDays className="w-3.5 h-3.5 text-[#A0522D]" />
            <span>Intelligent Schedule Generator</span>
          </div>
          <h2 className="font-serif-title text-4xl font-bold text-[#1D1D1D] mb-2">Smart Reading Planner</h2>
          <p className="text-sm text-[#777777]">
            Personalized pacing based on your current book, current page, logged reading speed, and goals.
          </p>
        </div>
        <button
          onClick={loadPlanner}
          disabled={!activeEntry || loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E5E0D8] text-xs font-bold hover:bg-[#F8F6F1] disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {libraryLoading || loading ? (
        <div className="h-64 bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl animate-pulse" />
      ) : !activeEntry ? (
        <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-8 text-center">
          <p className="font-serif-title text-2xl font-bold text-[#1D1D1D]">No active reading book yet</p>
          <p className="text-xs text-[#777777] mt-2">Mark a library book as Reading to generate a personalized plan.</p>
        </div>
      ) : error ? (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">{error}</div>
      ) : (
        <>
          <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif-title text-xl font-bold text-[#1D1D1D]">{activeEntry.book.title}</h3>
                <p className="text-xs text-[#777777]">
                  Page {activeEntry.currentPage} of {activeEntry.book.pageCount ?? 'unknown'}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-[#FFF8E7] text-[#B8860B] px-3 py-1.5 rounded-full text-xs font-bold">
                <Flame className="w-4 h-4 fill-current" />
                <span>{planner?.plan.estimatedFinishDate ?? 'Planning'}</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {(planner?.plan.weeklySchedule ?? []).map((day) => (
                <div key={day.day} className="rounded-xl bg-[#EFE8DD] p-3 text-center">
                  <p className="text-[10px] font-bold text-[#1D1D1D]">{day.day.slice(0, 3)}</p>
                  <p className="font-serif-title text-xl font-bold text-[#A0522D]">{day.targetPages}</p>
                  <p className="text-[10px] text-[#777777]">{day.estimatedMinutes}m</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-5">
              <Clock className="w-5 h-5 text-[#A0522D] mb-2" />
              <span className="text-[10px] font-bold uppercase text-[#777777] tracking-wider">Daily Goal</span>
              <h4 className="font-serif-title text-2xl font-bold text-[#1D1D1D] my-1">{planner?.plan.dailyPages ?? 0} Pages</h4>
            </div>
            <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-5">
              <Sparkles className="w-5 h-5 text-[#B8860B] mb-2" />
              <span className="text-[10px] font-bold uppercase text-[#777777] tracking-wider">Weekly Target</span>
              <h4 className="font-serif-title text-2xl font-bold text-[#1D1D1D] my-1">{planner?.plan.weeklyGoal ?? 0} Pages</h4>
            </div>
            <div className="bg-[#F8F6F1] border border-[#E5E0D8] rounded-2xl p-5">
              <span className="text-[10px] font-bold uppercase text-[#777777] tracking-wider">Adaptive Note</span>
              <p className="text-xs text-[#777777] mt-2">{planner?.plan.adaptiveNotes}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
