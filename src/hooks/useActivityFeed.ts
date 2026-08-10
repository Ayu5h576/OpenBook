import { useState, useEffect, useCallback } from 'react';
import { SocialApiService, ActivityItem } from '../services/api';

export type FeedScope = 'following' | 'me' | 'global';

export function useActivityFeed(scope: FeedScope = 'following', limit = 20) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await SocialApiService.getFeed(scope, limit);
    if (res.error) setError(res.error);
    else {
      setActivities(res.data?.activities ?? []);
      setNextCursor(res.data?.nextCursor ?? null);
    }
    setLoading(false);
  }, [scope, limit]);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const res = await SocialApiService.getFeed(scope, limit, nextCursor);
    if (!res.error && res.data) {
      setActivities((prev) => [...prev, ...res.data!.activities]);
      setNextCursor(res.data.nextCursor);
    }
    setLoadingMore(false);
  }, [scope, limit, nextCursor, loadingMore]);

  return { activities, loading, loadingMore, error, hasMore: !!nextCursor, refetch: fetchFeed, loadMore };
}
