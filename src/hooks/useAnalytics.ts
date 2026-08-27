import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnalyticsApiService, AnalyticsStats, ReadingGoal } from '../services/api';
import { useAnalyticsStream } from './useAnalyticsStream';

export interface UseAnalyticsOptions {
  /**
   * Hold an SSE connection and apply pushed stats.
   *
   * Off by default on purpose: `AppLayout` calls this hook and is mounted on
   * every page, so defaulting to true would give every signed-in reader a
   * permanent stream regardless of what they are looking at. The dashboard opts
   * in instead — and because pushes land in the shared React Query cache, the
   * layout's numbers still update live while the dashboard is open.
   */
  live?: boolean;
}

export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const { live = false } = options;
  const queryClient = useQueryClient();

  const stream = useAnalyticsStream(live);

  const { data: statsData, isLoading: loadingStats, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['analytics', 'stats'],
    queryFn: async () => {
      const res = await AnalyticsApiService.getStats();
      if (res.error) throw new Error(res.error);
      return res.data?.stats ?? null;
    },
  });

  const { data: goalData, isLoading: loadingGoal, error: goalError, refetch: refetchGoal } = useQuery({
    queryKey: ['analytics', 'goal'],
    queryFn: async () => {
      const res = await AnalyticsApiService.getGoal();
      if (res.error) throw new Error(res.error);
      return res.data?.goal ?? null;
    },
  });

  const loading = loadingStats || loadingGoal;
  const error = statsError ? statsError.message : goalError ? goalError.message : null;

  const upsertMutation = useMutation({
    mutationFn: async (data: { year: number; targetBooks: number; targetPages?: number }) => {
      const res = await AnalyticsApiService.upsertGoal(data);
      if (res.error) throw new Error(res.error);
      return res.data!.goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics', 'goal'] });
    },
  });

  const upsertGoal = useCallback(
    async (data: { year: number; targetBooks: number; targetPages?: number }) => upsertMutation.mutateAsync(data),
    [upsertMutation]
  );

  const fetchAll = useCallback(async () => {
    await Promise.all([refetchStats(), refetchGoal()]);
  }, [refetchStats, refetchGoal]);

  return {
    stats: statsData ?? null,
    goal: goalData ?? null,
    loading,
    error,
    refetch: fetchAll,
    upsertGoal,
    /** SSE connection state. Inert unless `live` was requested. */
    stream,
  };
}
