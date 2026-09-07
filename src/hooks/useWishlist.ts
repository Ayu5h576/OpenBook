import { useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WishlistApiService, WishlistEntry } from '../services/api';

/**
 * Add / remove, without fetching any part of the wishlist — for screens that
 * only write to it. Invalidates the `['wishlist']` prefix, which covers the list
 * pages and the per-book queries.
 */
export function useWishlistMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async ({ bookId, priority, notes }: { bookId: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; notes?: string }) => {
      const res = await WishlistApiService.addToWishlist(bookId, priority, notes);
      if (res.error) throw new Error(res.error);
      return res.data!.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await WishlistApiService.removeFromWishlist(entryId);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const addBook = useCallback(
    async (bookId: string, priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM', notes?: string) =>
      addMutation.mutateAsync({ bookId, priority, notes }),
    [addMutation]
  );

  const removeBook = useCallback(
    async (entryId: string) => removeMutation.mutateAsync(entryId),
    [removeMutation]
  );

  return { addBook, removeBook };
}

/**
 * The wishlist, one cursor-paginated page at a time. `entries` holds the pages
 * loaded so far; `total` is the real size. To test whether one book is saved,
 * use {@link useWishlistEntryForBook} rather than searching `entries`.
 */
export function useWishlist(limit?: number) {
  const mutations = useWishlistMutations();

  const {
    data,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    error: queryError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['wishlist', 'list', limit ?? null],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await WishlistApiService.getWishlist({ limit, cursor: pageParam });
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

  const error = queryError ? queryError.message : null;
  const entries = data?.pages.flatMap((page) => page.entries) ?? [];
  const total = data?.pages[0]?.total ?? entries.length;

  const loadMore = useCallback(async () => {
    if (hasNextPage && !loadingMore) await fetchNextPage();
  }, [hasNextPage, loadingMore, fetchNextPage]);

  return {
    entries,
    /** Size of the whole wishlist on the server, not of `entries`. */
    total,
    loading,
    loadingMore,
    error,
    hasMore: !!hasNextPage,
    loadMore,
    refetch,
    ...mutations,
  };
}

/**
 * The wishlist entry for one book, or undefined if it isn't saved. Asks the
 * server about that single book — see {@link useLibraryEntryForBook} for why a
 * loaded-pages search is not equivalent.
 */
export function useWishlistEntryForBook(bookId?: string) {
  const { data: entry, isLoading: loading } = useQuery({
    queryKey: ['wishlist', 'book', bookId],
    enabled: !!bookId,
    queryFn: async (): Promise<WishlistEntry | null> => {
      const res = await WishlistApiService.getWishlist({ bookId, limit: 1 });
      if (res.error) throw new Error(res.error);
      return res.data?.entries[0] ?? null;
    },
  });

  return { entry: entry ?? undefined, loading };
}
