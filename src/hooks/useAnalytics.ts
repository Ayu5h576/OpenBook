import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnalyticsApiService, AnalyticsStats, ReadingGoal } from '../services/api';

export function useAnalytics() {
  const queryClient = useQueryClient();

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

  return { stats: statsData ?? null, goal: goalData ?? null, loading, error, refetch: fetchAll, upsertGoal };
}
