import { useCallback } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CollectionApiService, ApiCollection } from '../services/api';

/**
 * Create / update / delete / add-book / remove-book, shared by the list and the
 * detail hook so both invalidate identically. Everything lives under the
 * `['collections']` prefix, so one invalidation refreshes the list *and* any
 * open detail query.
 */
function useCollectionMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['collections'] });

  const createMutation = useMutation({
    mutationFn: async (data: Parameters<typeof CollectionApiService.createCollection>[0]) => {
      const res = await CollectionApiService.createCollection(data);
      if (res.error) throw new Error(res.error);
      return res.data!.collection;
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Parameters<typeof CollectionApiService.updateCollection>[1] }) => {
      const res = await CollectionApiService.updateCollection(id, data);
      if (res.error) throw new Error(res.error);
      return res.data!.collection;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await CollectionApiService.deleteCollection(id);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });

  const addBookMutation = useMutation({
    mutationFn: async ({ collectionId, bookId }: { collectionId: string; bookId: string }) => {
      const res = await CollectionApiService.addBook(collectionId, bookId);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });

  const removeBookMutation = useMutation({
    mutationFn: async ({ collectionId, bookId }: { collectionId: string; bookId: string }) => {
      const res = await CollectionApiService.removeBook(collectionId, bookId);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });

  const createCollection = useCallback(
    async (data: Parameters<typeof CollectionApiService.createCollection>[0]) => createMutation.mutateAsync(data),
    [createMutation]
  );

  const updateCollection = useCallback(
    async (id: string, data: Parameters<typeof CollectionApiService.updateCollection>[1]) => updateMutation.mutateAsync({ id, data }),
    [updateMutation]
  );

  const deleteCollection = useCallback(
    async (id: string) => deleteMutation.mutateAsync(id),
    [deleteMutation]
  );

  const addBook = useCallback(
    async (collectionId: string, bookId: string) => addBookMutation.mutateAsync({ collectionId, bookId }),
    [addBookMutation]
  );

  const removeBook = useCallback(
    async (collectionId: string, bookId: string) => removeBookMutation.mutateAsync({ collectionId, bookId }),
    [removeBookMutation]
  );

  return { createCollection, updateCollection, deleteCollection, addBook, removeBook };
}

/**
 * One cursor-paginated page of collections at a time.
 *
 * Each collection's `books` is a **six-cover preview**, not its contents — read
 * `bookCount` for the size, and use {@link useCollection} when you need every
 * book. `total` is the number of collections on the server.
 */
export function useCollections(limit?: number) {
  const mutations = useCollectionMutations();
  const {
    data,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    error: queryError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['collections', 'list', limit ?? null],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const res = await CollectionApiService.getCollections({ limit, cursor: pageParam });
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

  const error = queryError ? queryError.message : null;
  const collections = data?.pages.flatMap((page) => page.collections) ?? [];
  const total = data?.pages[0]?.total ?? collections.length;

  const loadMore = useCallback(async () => {
    if (hasNextPage && !loadingMore) await fetchNextPage();
  }, [hasNextPage, loadingMore, fetchNextPage]);

  return {
    collections,
    /** Number of collections on the server, not in `collections`. */
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
 * One collection with **every** book in it.
 *
 * The detail page used to pick its collection out of the list response; since
 * that list now carries only a cover preview, it has to be fetched on its own.
 */
export function useCollection(collectionId?: string) {
  const mutations = useCollectionMutations();
  const { data: collection, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['collections', 'detail', collectionId],
    enabled: !!collectionId,
    queryFn: async (): Promise<ApiCollection> => {
      const res = await CollectionApiService.getCollection(collectionId!);
      if (res.error) throw new Error(res.error);
      return res.data!.collection;
    },
  });

  return {
    collection,
    loading,
    error: queryError ? queryError.message : null,
    refetch,
    ...mutations,
  };
}
