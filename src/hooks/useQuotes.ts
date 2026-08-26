import { useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QuoteApiService, UserQuote } from '../services/api';

interface QuoteFilters {
  category?: string;
  favorite?: boolean;
  bookId?: string;
  limit?: number;
}

/**
 * Add / edit / star / delete, without fetching any part of the wall — for a
 * reader saving a quote from a book page rather than from the wall itself.
 *
 * Everything invalidates the `['quotes']` prefix, which covers the list pages and
 * the category chips: saving the first quote in a new category has to make that
 * chip appear, and deleting the last one has to make it go away.
 */
export function useQuoteMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['quotes'] });
    // A quote is what supplies the pull-quote on a memory card.
    queryClient.invalidateQueries({ queryKey: ['memories'] });
  };

  const createMutation = useMutation({
    mutationFn: async (input: { text: string; bookId?: string; page?: number; category?: string }) => {
      const res = await QuoteApiService.createQuote(input);
      if (res.error) throw new Error(res.error);
      return res.data!.quote;
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ quoteId, data }: { quoteId: string; data: Parameters<typeof QuoteApiService.updateQuote>[1] }) => {
      const res = await QuoteApiService.updateQuote(quoteId, data);
      if (res.error) throw new Error(res.error);
      return res.data!.quote;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const res = await QuoteApiService.deleteQuote(quoteId);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });

  const addQuote = useCallback(
    async (input: { text: string; bookId?: string; page?: number; category?: string }) =>
      createMutation.mutateAsync(input),
    [createMutation]
  );

  const editQuote = useCallback(
    async (quoteId: string, data: Parameters<typeof QuoteApiService.updateQuote>[1]) =>
      updateMutation.mutateAsync({ quoteId, data }),
    [updateMutation]
  );

  /**
   * Takes the *next* state rather than toggling server-side, so two rapid clicks
   * settle on what the reader last asked for instead of racing.
   */
  const setFavorite = useCallback(
    async (quoteId: string, isFavorite: boolean) =>
      updateMutation.mutateAsync({ quoteId, data: { isFavorite } }),
    [updateMutation]
  );

  const removeQuote = useCallback(
    async (quoteId: string) => deleteMutation.mutateAsync(quoteId),
    [deleteMutation]
  );

  return {
    addQuote,
    editQuote,
    setFavorite,
    removeQuote,
    saving: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}

/**
 * The reader's quotes, one cursor-paginated page at a time.
 *
 * `quotes` is what has been fetched so far, not the whole wall — call `loadMore()`
 * for the next page and read `total` for the real size. Filters are applied
 * server-side and are part of the query key, so switching category refetches
 * rather than filtering a partial page in the browser.
 */
export function useQuotes({ category, favorite, bookId, limit }: QuoteFilters = {}) {
  const mutations = useQuoteMutations();

  const {
    data,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    error: queryError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    // Nested under ['quotes'] so every mutation's prefix invalidation catches
    // this and the category query below.
    queryKey: ['quotes', 'list', category ?? null, favorite ?? null, bookId ?? null, limit ?? null],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await QuoteApiService.getQuotes({ category, favorite, bookId, limit, cursor: pageParam });
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

  const error = queryError ? queryError.message : null;
  const quotes = data?.pages.flatMap((page) => page.quotes) ?? [];
  const total = data?.pages[0]?.total ?? quotes.length;

  const loadMore = useCallback(async () => {
    if (hasNextPage && !loadingMore) await fetchNextPage();
  }, [hasNextPage, loadingMore, fetchNextPage]);

  return {
    quotes,
    /** Size of the whole filtered set on the server, not of `quotes`. */
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
 * The categories the reader has actually used, with counts — the filter chips.
 * Derived server-side from their own rows, so the list shrinks when the last
 * quote in a category is deleted.
 */
export function useQuoteCategories() {
  const { data, isLoading: loading } = useQuery({
    queryKey: ['quotes', 'categories'],
    queryFn: async () => {
      const res = await QuoteApiService.getCategories();
      if (res.error) throw new Error(res.error);
      return res.data!.categories;
    },
  });

  return { categories: data ?? [], loading };
}

export type { UserQuote };
