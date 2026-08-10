import { useState, useEffect, useCallback } from 'react';
import { AchievementApiService, Achievement } from '../services/api';

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [summary, setSummary] = useState<{ unlocked: number; total: number }>({ unlocked: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await AchievementApiService.getAchievements();
    if (res.error) setError(res.error);
    else {
      setAchievements(res.data?.achievements ?? []);
      setSummary(res.data?.summary ?? { unlocked: 0, total: 0 });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAchievements(); }, [fetchAchievements]);

  return { achievements, summary, loading, error, refetch: fetchAchievements };
}
