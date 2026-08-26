import { useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { LibraryApiService, MemoryCard } from '../services/api';

/**
 * The reader's finished books as memory cards, one cursor-paginated page at a
 * time.
 *
 * Read-only: a card is a view over rows the reader already wrote elsewhere — a
 * review, a quote, a note — so there is nothing to mutate here. Editing one means
 * editing the underlying review or note, and `useLibraryMutations` and
 * `useQuoteMutations` both invalidate this prefix so those edits land here.
 */
export function useMemories(limit?: number) {
  const {
    data,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    error: queryError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['memories', 'list', limit ?? null],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await LibraryApiService.getMemories({ limit, cursor: pageParam });
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

  const error = queryError ? queryError.message : null;
  const memories = data?.pages.flatMap((page) => page.memories) ?? [];
  const total = data?.pages[0]?.total ?? memories.length;

  const loadMore = useCallback(async () => {
    if (hasNextPage && !loadingMore) await fetchNextPage();
  }, [hasNextPage, loadingMore, fetchNextPage]);

  return {
    memories,
    /** Every finished book on the server, not just the loaded pages. */
    total,
    loading,
    loadingMore,
    error,
    hasMore: !!hasNextPage,
    loadMore,
    refetch,
  };
}

export type { MemoryCard };
