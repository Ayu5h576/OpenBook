import { useState, useEffect, useRef, useCallback } from 'react';
import { BookApiService, GoogleBookResult } from '../services/api';

export function useBookSearch() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'title' | 'author' | 'isbn' | 'category'>('title');
  const [results, setResults] = useState<GoogleBookResult[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string, searchType = type, page = 0) => {
    if (!q.trim()) {
      setResults([]);
      setTotalItems(0);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await BookApiService.search(q, searchType, page);
    if (res.error) {
      setError(res.error);
    } else {
      setResults(res.data?.items ?? []);
      setTotalItems(res.data?.totalItems ?? 0);
    }
    setLoading(false);
  }, [type]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query, type), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, type, search]);

  const importBook = useCallback(async (googleBooksId: string) => {
    const res = await BookApiService.importBook(googleBooksId);
    if (res.error) throw new Error(res.error);
    return res.data!.book;
  }, []);

  return { query, setQuery, type, setType, results, totalItems, loading, error, importBook };
}
