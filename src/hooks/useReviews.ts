import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ReviewApiService, ApiReview } from '../services/api';
import { useAuth } from './useAuth';
import { normalizeRating, averageRating } from '../utils/reviewStats';

/**
 * A review with its rating already coerced to a number, so no component has to
 * remember that `Decimal` crosses the wire as a string.
 */
export interface Review extends Omit<ApiReview, 'rating'> {
  rating: number;
}

export interface SaveReviewInput {
  rating: number;
  title?: string;
  body?: string;
  isPrivate?: boolean;
}

const toReview = (r: ApiReview): Review => ({ ...r, rating: normalizeRating(r.rating) });

/**
 * Member reviews for one book.
 *
 * `bookId` must be the **local** book UUID, not a `googleBooksId` — the review
 * routes are keyed on the Prisma row. Pass `undefined` while the book is still
 * resolving and both queries stay parked.
 */
export function useReviews(bookId?: string) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const {
    data: reviews = [],
    isLoading: loading,
    error: queryError,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['reviews', bookId],
    queryFn: async () => {
      const res = await ReviewApiService.getBookReviews(bookId!);
      if (res.error) throw new Error(res.error);
      return (res.data?.reviews ?? []).map(toReview);
    },
    enabled: Boolean(bookId),
  });

  // Fetched separately because the public list filters `isPrivate: true` rows
  // out server-side — including the caller's own. This is the only way the
  // composer can pre-fill a private review.
  const {
    data: myReview = null,
    isLoading: myLoading,
    error: myQueryError,
    refetch: refetchMine,
  } = useQuery({
    queryKey: ['reviews', 'mine', bookId],
    queryFn: async () => {
      const res = await ReviewApiService.getMyReview(bookId!);
      if (res.error) throw new Error(res.error);
      return res.data?.review ? toReview(res.data.review) : null;
    },
    enabled: Boolean(bookId) && isAuthenticated,
  });

  const error = queryError ? queryError.message : myQueryError ? myQueryError.message : null;

  // `error` is flattened from both queries, so a single Retry has to run both —
  // otherwise the button silently does nothing when it was the own-review
  // request that failed.
  const refetch = useCallback(() => {
    refetchList();
    refetchMine();
  }, [refetchList, refetchMine]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['reviews'] });
    // Achievements are evaluated and persisted on *read* — nothing on the
    // review write path notifies achievementService. Without this refetch,
    // "The Critic Emerges" stays locked until the user happens to open the
    // achievements page.
    queryClient.invalidateQueries({ queryKey: ['achievements'] });
    // The feed gains a WROTE_REVIEW entry on a first public review.
    queryClient.invalidateQueries({ queryKey: ['activityFeed'] });
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: async (input: SaveReviewInput) => {
      const res = await ReviewApiService.upsertReview(bookId!, input);
      if (res.error) throw new Error(res.error);
      return toReview(res.data!.review);
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await ReviewApiService.deleteReview(bookId!);
      if (res.error) throw new Error(res.error);
    },
    onSuccess: invalidate,
  });

  const saveReview = useCallback(
    async (input: SaveReviewInput) => saveMutation.mutateAsync(input),
    [saveMutation]
  );

  const deleteReview = useCallback(async () => deleteMutation.mutateAsync(), [deleteMutation]);

  const memberAverage = useMemo(() => averageRating(reviews), [reviews]);

  return {
    reviews,
    myReview,
    loading: loading || myLoading,
    error,
    refetch,
    saveReview,
    deleteReview,
    saving: saveMutation.isPending || deleteMutation.isPending,
    memberAverage,
    memberCount: reviews.length,
  };
}
