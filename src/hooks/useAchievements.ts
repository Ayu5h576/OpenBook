import { useQuery } from '@tanstack/react-query';
import { AchievementApiService } from '../services/api';

export function useAchievements() {
  const { data, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const res = await AchievementApiService.getAchievements();
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
  });

  const error = queryError ? queryError.message : null;
  const achievements = data?.achievements ?? [];
  const summary = data?.summary ?? { unlocked: 0, total: 0 };

  return { achievements, summary, loading, error, refetch };
}
