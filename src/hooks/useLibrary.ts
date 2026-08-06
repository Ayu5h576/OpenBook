import { useState, useEffect, useCallback } from 'react';
import { LibraryApiService, LibraryEntry, LibraryStatus } from '../services/api';

export function useLibrary(statusFilter?: LibraryStatus) {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await LibraryApiService.getLibrary(statusFilter);
    if (res.error) {
      setError(res.error);
    } else {
      setEntries(res.data?.entries ?? []);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  const addBook = useCallback(async (bookId: string, status: LibraryStatus = 'OWNED') => {
    const res = await LibraryApiService.addToLibrary(bookId, status);
    if (res.error) throw new Error(res.error);
    setEntries((prev) => [res.data!.entry, ...prev]);
    return res.data!.entry;
  }, []);

  const updateEntry = useCallback(async (entryId: string, data: Parameters<typeof LibraryApiService.updateEntry>[1]) => {
    const res = await LibraryApiService.updateEntry(entryId, data);
    if (res.error) throw new Error(res.error);
    setEntries((prev) => prev.map((e) => (e.id === entryId ? res.data!.entry : e)));
    return res.data!.entry;
  }, []);

  const removeEntry = useCallback(async (entryId: string) => {
    const res = await LibraryApiService.removeFromLibrary(entryId);
    if (res.error) throw new Error(res.error);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }, []);

  return { entries, loading, error, refetch: fetchLibrary, addBook, updateEntry, removeEntry };
}
