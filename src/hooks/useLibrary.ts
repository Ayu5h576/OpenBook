import { useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LibraryApiService, LibraryEntry, LibraryStatus } from '../services/api';

/**
 * Add / update / remove / log-session, without fetching any part of the shelf.
 * Use this where a screen only needs to *write* — a book page adding to the
 * library has no reason to pull a page of library rows it will never render.
 *
 * Everything invalidates the `['library']` prefix, which covers the list pages
 * and the per-book queries below.
 */
export function useLibraryMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async ({ bookId, status }: { bookId: string; status: LibraryStatus }) => {
      const res = await LibraryApiService.addToLibrary(bookId, status);
      if (res.error) throw new Error(res.error);
      return res.data!.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ entryId, data }: { entryId: string; data: Parameters<typeof LibraryApiService.updateEntry>[1] }) => {
      const res = await LibraryApiService.updateEntry(entryId, data);
      if (res.error) throw new Error(res.error);
      return res.data!.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      // Page and status changes feed every reading stat.
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      // Marking a book COMPLETED is what puts it on the memories shelf.
      queryClient.invalidateQueries({ queryKey: ['memories'] });
    },
  });

  const logSessionMutation = useMutation({
    mutationFn: async ({ entryId, session }: { entryId: string; session: Parameters<typeof LibraryApiService.logSession>[1] }) => {
      const res = await LibraryApiService.logSession(entryId, session);
      if (res.error) throw new Error(res.error);
      return res.data!.session;
    },
    onSuccess: (_session, { entryId }) => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
      queryClient.invalidateQueries({ queryKey: ['entry', entryId] });
      // Sessions drive pages, hours, streak and the heatmap.
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const res = await LibraryApiService.removeFromLibrary(entryId);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library'] });
    },
  });

  const addBook = useCallback(
    async (bookId: string, status: LibraryStatus = 'OWNED') => addMutation.mutateAsync({ bookId, status }),
    [addMutation]
  );

  const updateEntry = useCallback(
    async (entryId: string, data: Parameters<typeof LibraryApiService.updateEntry>[1]) => updateMutation.mutateAsync({ entryId, data }),
    [updateMutation]
  );

  const removeEntry = useCallback(
    async (entryId: string) => removeMutation.mutateAsync(entryId),
    [removeMutation]
  );

  const logSession = useCallback(
    async (entryId: string, session: Parameters<typeof LibraryApiService.logSession>[1]) =>
      logSessionMutation.mutateAsync({ entryId, session }),
    [logSessionMutation]
  );

  return {
    addBook,
    updateEntry,
    removeEntry,
    logSession,
    savingProgress: updateMutation.isPending || logSessionMutation.isPending,
  };
}

/**
 * The reader's shelf, one cursor-paginated page at a time.
 *
 * `entries` is everything fetched so far, not the whole library — call
 * `loadMore()` for the next page and read `total` for the real size. Anything
 * that needs to know whether one specific book is on the shelf must use
 * {@link useLibraryEntryForBook} instead of searching `entries`, which only
 * holds the pages that have been loaded.
 */
export function useLibrary(statusFilter?: LibraryStatus, limit?: number) {
  const mutations = useLibraryMutations();

  const {
    data,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    error: queryError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    // Nested under ['library'] so every mutation's prefix invalidation still
    // catches this and the per-book queries below.
    queryKey: ['library', 'list', statusFilter ?? null, limit ?? null],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await LibraryApiService.getLibrary({ status: statusFilter, limit, cursor: pageParam });
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

  const error = queryError ? queryError.message : null;
  const entries = data?.pages.flatMap((page) => page.entries) ?? [];
  // Every page reports the same server-side count; the first is the freshest
  // that has definitely arrived.
  const total = data?.pages[0]?.total ?? entries.length;

  const loadMore = useCallback(async () => {
    if (hasNextPage && !loadingMore) await fetchNextPage();
  }, [hasNextPage, loadingMore, fetchNextPage]);

  return {
    entries,
    /** Size of the whole filtered shelf on the server, not of `entries`. */
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
 * The library entry for one book, or undefined if it isn't on the shelf.
 *
 * This asks the server about that single book rather than scanning a page of
 * the library: once a shelf outgrows one page, a loaded-pages search would
 * start reporting owned books as missing.
 */
export function useLibraryEntryForBook(bookId?: string) {
  const { data: entry, isLoading: loading } = useQuery({
    queryKey: ['library', 'book', bookId],
    enabled: !!bookId,
    queryFn: async (): Promise<LibraryEntry | null> => {
      const res = await LibraryApiService.getLibrary({ bookId, limit: 1 });
      if (res.error) throw new Error(res.error);
      return res.data?.entries[0] ?? null;
    },
  });

  return { entry: entry ?? undefined, loading };
}
