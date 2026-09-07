import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SocialApiService, DiscoveredReader } from '../services/api';

const DEBOUNCE_MS = 300;

/**
 * Reader discovery: debounced username search plus a "readers you may like"
 * list, both annotated with follow state so one hook drives the whole panel.
 *
 * `results` is null while no search is active, which lets the UI distinguish
 * "not searching" from "searched and found nobody".
 */
export function useReaderDiscovery(suggestionLimit = 8) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DiscoveredReader[] | null>(null);
  const [suggestions, setSuggestions] = useState<DiscoveredReader[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Guards against a slow early request overwriting a newer one.
  const requestSeq = useRef(0);

  const loadSuggestions = useCallback(async () => {
    const res = await SocialApiService.getSuggestedReaders(suggestionLimit);
    if (res.error) setError(res.error);
    else setSuggestions(res.data?.users ?? []);
    setLoadingSuggestions(false);
  }, [suggestionLimit]);

  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    const seq = ++requestSeq.current;
    const timer = setTimeout(async () => {
      const res = await SocialApiService.searchReaders(term);
      if (seq !== requestSeq.current) return; // a newer keystroke already won
      if (res.error) setError(res.error);
      else setResults(res.data?.users ?? []);
      setSearching(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const toggleFollow = useCallback(
    async (userId: string) => {
      if (busyId) return;
      const target = results?.find((u) => u.id === userId) ?? suggestions.find((u) => u.id === userId);
      if (!target) return;

      const wasFollowing = target.isFollowing;
      setBusyId(userId);
      setError(null);

      // Optimistic: flip the button in whichever list holds the reader.
      const setFollowing = (value: boolean) => (list: DiscoveredReader[]) =>
        list.map((u) => (u.id === userId ? { ...u, isFollowing: value } : u));
      const apply = (value: boolean) => {
        setResults((r) => (r ? setFollowing(value)(r) : r));
        setSuggestions(setFollowing(value));
      };
      apply(!wasFollowing);

      try {
        const res = wasFollowing
          ? await SocialApiService.unfollow(userId)
          : await SocialApiService.follow(userId);
        if (res.error) throw new Error(res.error);
        // The circle feed is defined by the follow graph, so it is now stale.
        queryClient.invalidateQueries({ queryKey: ['activityFeed'] });
      } catch (e: any) {
        apply(wasFollowing);
        setError(e.message || 'Could not update follow.');
      } finally {
        setBusyId(null);
      }
    },
    [busyId, results, suggestions, queryClient]
  );

  return {
    query,
    setQuery,
    results,
    suggestions,
    searching,
    loadingSuggestions,
    error,
    busyId,
    toggleFollow,
    refetchSuggestions: loadSuggestions,
  };
}
