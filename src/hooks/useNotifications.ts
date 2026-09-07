import { useCallback } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { NotificationApiService, AppNotification } from '../services/api';

/** How often the bell re-checks for new notifications. */
const UNREAD_POLL_MS = 60_000;

/**
 * Drives the notification bell and its panel.
 *
 * The unread count is a separate, cheap query that polls, so the badge stays
 * current without holding the whole list in memory; the list itself is only
 * fetched when the panel is opened (`enabled`).
 */
export function useNotifications(enabled = true, limit = 20) {
  const queryClient = useQueryClient();

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: async () => {
      const res = await NotificationApiService.getUnreadCount();
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    refetchInterval: UNREAD_POLL_MS,
    refetchOnWindowFocus: true,
  });

  const {
    data,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    error: queryError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['notifications', 'list', limit],
    enabled,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const res = await NotificationApiService.list(limit, pageParam ?? undefined);
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor || null,
  });

  const notifications: AppNotification[] = data?.pages.flatMap((p) => p.notifications) ?? [];
  const unreadCount = unreadData?.unread ?? 0;

  const loadMore = useCallback(async () => {
    if (hasNextPage && !loadingMore) await fetchNextPage();
  }, [hasNextPage, loadingMore, fetchNextPage]);

  /** Flip one row locally, then confirm with the server. */
  const markRead = useCallback(
    async (id: string) => {
      const target = notifications.find((n) => n.id === id);
      if (!target || target.read) return;

      queryClient.setQueryData(['notifications', 'list', limit], (old: any) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                notifications: page.notifications.map((n: AppNotification) =>
                  n.id === id ? { ...n, read: true } : n
                ),
              })),
            }
          : old
      );
      queryClient.setQueryData(['notifications', 'unreadCount'], (old: any) =>
        old ? { unread: Math.max(0, old.unread - 1) } : old
      );

      const res = await NotificationApiService.markRead(id);
      // On failure, drop the optimistic edit by refetching rather than guessing.
      if (res.error) {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    },
    [notifications, queryClient, limit]
  );

  const markAllRead = useCallback(async () => {
    if (!unreadCount) return;
    queryClient.setQueryData(['notifications', 'unreadCount'], { unread: 0 });
    const res = await NotificationApiService.markAllRead();
    if (res.error) {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } else {
      // Refresh the list so every row picks up its new read state.
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
    }
  }, [unreadCount, queryClient]);

  return {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    error: queryError ? (queryError as Error).message : null,
    hasMore: !!hasNextPage,
    loadMore,
    markRead,
    markAllRead,
    refetch,
  };
}
