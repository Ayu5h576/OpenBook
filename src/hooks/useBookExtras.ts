import { useQuery } from '@tanstack/react-query';
import { BookApiService, MediaImage, OffersResult, Region } from '../services/api';

/**
 * Purchase offers for a book in a region.
 *
 * `enabled` is deliberately gated on the caller's open state: both of these hit
 * third-party APIs (Google Books, Open Library), so nothing should be fetched
 * until the reader actually opens the spread.
 */
export function useBookOffers(bookId: string | undefined, region: Region, enabled = true) {
  return useQuery<OffersResult>({
    queryKey: ['bookOffers', bookId, region],
    queryFn: async () => {
      const res = await BookApiService.getOffers(bookId!, region);
      if (res.error) throw new Error(res.error);
      return res.data!;
    },
    enabled: Boolean(bookId) && enabled,
    // Prices move, but not within a browsing session.
    staleTime: 1000 * 60 * 30,
  });
}

/** Collage images (edition covers + author portrait) for the scrapbook page. */
export function useBookMedia(bookId: string | undefined, enabled = true) {
  return useQuery<MediaImage[]>({
    queryKey: ['bookMedia', bookId],
    queryFn: async () => {
      const res = await BookApiService.getMedia(bookId!);
      if (res.error) throw new Error(res.error);
      return res.data?.images ?? [];
    },
    enabled: Boolean(bookId) && enabled,
    // Which editions exist doesn't change day to day.
    staleTime: 1000 * 60 * 60 * 24,
  });
}
