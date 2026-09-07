import React from 'react';
import { Loader2 } from 'lucide-react';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

interface LoadMoreProps {
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  /** Shown once everything is loaded — omit it to render nothing at the end. */
  endLabel?: string;
}

/**
 * The footer of a paginated list: an invisible sentinel that fetches the next
 * page as it scrolls into view, plus a real button behind it.
 *
 * The button is not redundant. IntersectionObserver never fires for a reader
 * navigating by keyboard or with reduced motion, and it stays silent if the
 * list's container is short enough that the sentinel is already on screen
 * without a scroll event — so the tap target is the fallback that makes the rest
 * of the list reachable.
 */
export const LoadMore: React.FC<LoadMoreProps> = ({ hasMore, loadingMore, onLoadMore, endLabel }) => {
  const sentinelRef = useInfiniteScroll(onLoadMore, hasMore && !loadingMore);

  if (!hasMore) {
    return endLabel ? (
      <p className="py-6 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {endLabel}
      </p>
    ) : null;
  }

  return (
    <div ref={sentinelRef} className="flex justify-center py-6">
      <button
        onClick={onLoadMore}
        disabled={loadingMore}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--white)] border border-[var(--border-light)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--bg-beige)] transition-colors disabled:opacity-60"
      >
        {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {loadingMore ? 'Loading…' : 'Load more'}
      </button>
    </div>
  );
};
