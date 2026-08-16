import { useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { SocialApiService } from '../services/api';

export type FeedScope = 'following' | 'me' | 'global';

export function useActivityFeed(scope: FeedScope = 'following', limit = 20) {
  const {
    data,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    error: queryError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['activityFeed', scope, limit],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const res = await SocialApiService.getFeed(scope, limit, pageParam ?? undefined);
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor || null,
  });

  const error = queryError ? queryError.message : null;
  const activities = data?.pages.flatMap((page) => page.activities) ?? [];

  const loadMore = useCallback(async () => {
    if (hasNextPage && !loadingMore) {
      await fetchNextPage();
    }
  }, [hasNextPage, loadingMore, fetchNextPage]);

  return {
    activities,
    loading,
    loadingMore,
    error,
    hasMore: !!hasNextPage,
    refetch,
    loadMore,
  };
}
