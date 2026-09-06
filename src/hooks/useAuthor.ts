import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthorApiService, AIApiService, AuthorProfile, AuthorInsight } from '../services/api';

/**
 * Everything the author page needs, from two requests.
 *
 * The profile is one call — biography, the reader's own shelf of this author,
 * the rest of the bibliography, related authors — because every part of it is
 * assembled from the same handful of upstream lookups server-side, and four
 * round trips would only stagger the page in.
 *
 * The AI insight is deliberately **opt-in**. It costs a model call against the
 * reader's per-user rate limit, and most visits to an author page are a glance
 * at the bibliography — spending the budget on arrival would exhaust it for the
 * readers who actually want the answer. `requestInsight()` is wired to a button.
 */
export function useAuthor(param?: string) {
  const profileQuery = useQuery<AuthorProfile>({
    queryKey: ['author', param],
    queryFn: async () => {
      const res = await AuthorApiService.getProfile(param as string);
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    enabled: Boolean(param),
  });

  const [insightRequested, setInsightRequested] = useState(false);
  // Key the insight by the *resolved* name, not the URL param, so a legacy
  // `auth-<uuid>` link and the plain name share one cache entry.
  const authorName = profileQuery.data?.author.name;

  const insightQuery = useQuery<AuthorInsight>({
    queryKey: ['ai', 'author-insight', authorName],
    queryFn: async () => {
      const res = await AIApiService.getAuthorInsight(authorName as string);
      if (res.error) throw new Error(res.error);
      return res.data!.insight;
    },
    enabled: insightRequested && Boolean(authorName),
    staleTime: 24 * 60 * 60 * 1000, // Matches the server-side cache; asking twice costs nothing.
  });

  const requestInsight = useCallback(() => setInsightRequested(true), []);

  return {
    profile: profileQuery.data ?? null,
    loading: profileQuery.isLoading,
    error: profileQuery.error?.message ?? null,
    refetch: profileQuery.refetch,

    insight: insightQuery.data ?? null,
    insightLoading: insightQuery.isFetching,
    insightError: insightQuery.error?.message ?? null,
    insightRequested,
    requestInsight,
  };
}
