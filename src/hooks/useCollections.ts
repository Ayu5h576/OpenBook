import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CollectionApiService, ApiCollection } from '../services/api';

export function useCollections() {
  const queryClient = useQueryClient();

  const { data: collections = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const res = await CollectionApiService.getCollections();
      if (res.error) throw new Error(res.error);
      return res.data?.collections ?? [];
    },
  });

  const error = queryError ? queryError.message : null;

  const createMutation = useMutation({
    mutationFn: async (data: Parameters<typeof CollectionApiService.createCollection>[0]) => {
      const res = await CollectionApiService.createCollection(data);
      if (res.error) throw new Error(res.error);
      return res.data!.collection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Parameters<typeof CollectionApiService.updateCollection>[1] }) => {
      const res = await CollectionApiService.updateCollection(id, data);
      if (res.error) throw new Error(res.error);
      return res.data!.collection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await CollectionApiService.deleteCollection(id);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const addBookMutation = useMutation({
    mutationFn: async ({ collectionId, bookId }: { collectionId: string; bookId: string }) => {
      const res = await CollectionApiService.addBook(collectionId, bookId);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });

  const removeBookMutation = useMutation({
    mutationFn: async ({ collectionId, bookId }: { collectionId: string; bookId: string }) => {
      const res = await CollectionApiService.removeBook(collectionId, bookId);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
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

  return { collections, loading, error, refetch, createCollection, updateCollection, deleteCollection, addBook, removeBook };
}

