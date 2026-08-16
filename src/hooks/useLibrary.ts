import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LibraryApiService, LibraryEntry, LibraryStatus } from '../services/api';

export function useLibrary(statusFilter?: LibraryStatus) {
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['library', statusFilter],
    queryFn: async () => {
      const res = await LibraryApiService.getLibrary(statusFilter);
      if (res.error) throw new Error(res.error);
      return res.data?.entries ?? [];
    },
  });

  const error = queryError ? queryError.message : null;

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

  return { entries, loading, error, refetch, addBook, updateEntry, removeEntry };
}

