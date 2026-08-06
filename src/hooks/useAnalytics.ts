import { useState, useEffect, useCallback } from 'react';
import { AnalyticsApiService, AnalyticsStats, ReadingGoal } from '../services/api';

export function useAnalytics() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [statsRes, goalRes] = await Promise.all([
      AnalyticsApiService.getStats(),
      AnalyticsApiService.getGoal(),
    ]);
    if (statsRes.error) setError(statsRes.error);
    else setStats(statsRes.data?.stats ?? null);
    if (!goalRes.error) setGoal(goalRes.data?.goal ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const upsertGoal = useCallback(async (data: { year: number; targetBooks: number; targetPages?: number }) => {
    const res = await AnalyticsApiService.upsertGoal(data);
    if (res.error) throw new Error(res.error);
    setGoal(res.data!.goal);
    return res.data!.goal;
  }, []);

  return { stats, goal, loading, error, refetch: fetchAll, upsertGoal };
}
