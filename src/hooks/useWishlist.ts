import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WishlistApiService, WishlistEntry } from '../services/api';

export function useWishlist() {
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const res = await WishlistApiService.getWishlist();
      if (res.error) throw new Error(res.error);
      return res.data?.entries ?? [];
    },
  });

  const error = queryError ? queryError.message : null;

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

  return { entries, loading, error, refetch, addBook, removeBook };
}
