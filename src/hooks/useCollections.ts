import { useState, useEffect, useCallback } from 'react';
import { CollectionApiService, ApiCollection } from '../services/api';

export function useCollections() {
  const [collections, setCollections] = useState<ApiCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await CollectionApiService.getCollections();
    if (res.error) setError(res.error);
    else setCollections(res.data?.collections ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const createCollection = useCallback(async (data: Parameters<typeof CollectionApiService.createCollection>[0]) => {
    const res = await CollectionApiService.createCollection(data);
    if (res.error) throw new Error(res.error);
    setCollections((prev) => [res.data!.collection, ...prev]);
    return res.data!.collection;
  }, []);

  const updateCollection = useCallback(async (id: string, data: Parameters<typeof CollectionApiService.updateCollection>[1]) => {
    const res = await CollectionApiService.updateCollection(id, data);
    if (res.error) throw new Error(res.error);
    setCollections((prev) => prev.map((c) => (c.id === id ? res.data!.collection : c)));
    return res.data!.collection;
  }, []);

  const deleteCollection = useCallback(async (id: string) => {
    const res = await CollectionApiService.deleteCollection(id);
    if (res.error) throw new Error(res.error);
    setCollections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addBook = useCallback(async (collectionId: string, bookId: string) => {
    const res = await CollectionApiService.addBook(collectionId, bookId);
    if (res.error) throw new Error(res.error);
    await fetchCollections();
  }, [fetchCollections]);

  const removeBook = useCallback(async (collectionId: string, bookId: string) => {
    const res = await CollectionApiService.removeBook(collectionId, bookId);
    if (res.error) throw new Error(res.error);
    await fetchCollections();
  }, [fetchCollections]);

  return { collections, loading, error, refetch: fetchCollections, createCollection, updateCollection, deleteCollection, addBook, removeBook };
}
