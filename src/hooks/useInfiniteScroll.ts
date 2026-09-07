import { useEffect, useRef } from 'react';

/**
 * Calls `onReachEnd` when the returned ref scrolls into view — the sentinel half
 * of infinite scroll. Attach the ref to an element placed just after the last
 * row of a list.
 *
 * `enabled` should be `hasMore && !loadingMore`: IntersectionObserver fires
 * repeatedly while the sentinel stays visible, and a short page can leave it on
 * screen even after loading, so an unguarded callback would request every
 * remaining page at once.
 *
 * `rootMargin` starts the fetch before the reader actually hits the bottom.
 */
export function useInfiniteScroll(
  onReachEnd: () => void,
  enabled: boolean,
  rootMargin = '320px'
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Kept in a ref so a fresh inline callback each render doesn't tear the
  // observer down and rebuild it.
  const callbackRef = useRef(onReachEnd);
  callbackRef.current = onReachEnd;

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) callbackRef.current();
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return sentinelRef;
}
