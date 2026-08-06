import { useState, useEffect, useCallback } from 'react';
import { WishlistApiService, WishlistEntry } from '../services/api';

export function useWishlist() {
  const [entries, setEntries] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await WishlistApiService.getWishlist();
    if (res.error) setError(res.error);
    else setEntries(res.data?.entries ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const addBook = useCallback(async (bookId: string, priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM', notes?: string) => {
    const res = await WishlistApiService.addToWishlist(bookId, priority, notes);
    if (res.error) throw new Error(res.error);
    setEntries((prev) => [res.data!.entry, ...prev]);
    return res.data!.entry;
  }, []);

  const removeBook = useCallback(async (entryId: string) => {
    const res = await WishlistApiService.removeFromWishlist(entryId);
    if (res.error) throw new Error(res.error);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }, []);

  return { entries, loading, error, refetch: fetchWishlist, addBook, removeBook };
}
