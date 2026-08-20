import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Region } from '../services/api';
import { useBookMedia, useBookOffers } from '../hooks/useBookExtras';
import { PurchasePanel } from './PurchasePanel';
import { ScrapbookPanel } from './ScrapbookPanel';
import { Globe, X } from 'lucide-react';

interface BookSpreadProps {
  /** Local (UUID) book id — the offers and media endpoints key off this. */
  bookId: string;
  title: string;
  author: string;
  description: string;
  onClose: () => void;
}

const REGIONS: { value: Region; label: string }[] = [
  { value: 'IN', label: 'India' },
  { value: 'US', label: 'US' },
];

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * The "More info" spread — a hardbound book opened flat. Left page is where to
 * buy the book, right page is every cover it has worn.
 */
export const BookSpread: React.FC<BookSpreadProps> = ({
  bookId,
  title,
  author,
  description,
  onClose,
}) => {
  const [region, setRegion] = useState<Region>('IN');
  const containerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const offers = useBookOffers(bookId, region);
  const media = useBookMedia(bookId);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      // Keep Tab inside the dialog.
      if (event.key !== 'Tab' || !containerRef.current) return;
      const focusable = (
        Array.from(containerRef.current.querySelectorAll(FOCUSABLE)) as HTMLElement[]
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [handleKeyDown]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-spread-title"
        className="w-full max-w-[1180px] flex flex-col max-h-full animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header sits on the backdrop so the album pages stay uncluttered. */}
        <div className="flex items-center justify-between gap-4 px-1 sm:px-2 pb-3 flex-shrink-0">
          <div className="min-w-0">
            <h2
              id="book-spread-title"
              className="font-serif-title text-lg sm:text-2xl font-bold text-white truncate"
            >
              {title}
            </h2>
            <p className="text-[11px] sm:text-xs text-white/60 truncate">by {author}</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div
              role="group"
              aria-label="Store region"
              className="flex items-center gap-1 p-1 rounded-full bg-white/10 border border-white/15"
            >
              <Globe className="w-3.5 h-3.5 text-white/50 ml-1.5" aria-hidden="true" />
              {REGIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setRegion(option.value)}
                  aria-pressed={region === option.value}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                    region === option.value
                      ? 'bg-white text-[#1D1D1D]'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close book details"
              className="p-2.5 rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The book. On a phone the whole thing is one scroll; on a desktop each
            page scrolls independently, the way you'd read a real spread. The
            binding cases the pages in, and a central gutter falls between them. */}
        <div className="book-binding flex-1 min-h-0 rounded-lg p-2 sm:p-2.5 lg:p-3">
          <div className="book-block relative h-full min-h-0 overflow-y-auto lg:overflow-hidden rounded-[3px] grid grid-cols-1 lg:grid-cols-2">
            <div className="album-paper album-page-left bg-[var(--white)] p-5 sm:p-8 lg:p-10 lg:pr-12 lg:overflow-y-auto">
              <PurchasePanel
                description={description}
                data={offers.data}
                loading={offers.isLoading}
                error={offers.error ? (offers.error as Error).message : null}
                region={region}
                onRetry={() => offers.refetch()}
              />
            </div>

            <div className="album-paper album-page-right bg-[var(--white)] p-5 sm:p-8 lg:p-10 lg:pl-12 lg:overflow-y-auto">
              <ScrapbookPanel
                title={title}
                author={author}
                images={media.data ?? []}
                loading={media.isLoading}
                error={media.error ? (media.error as Error).message : null}
              />
            </div>

            {/* The gutter, drawn over the seam where the two pages meet. Desktop
                only — on a phone the pages stack and scroll as one, so there is
                no fixed seam for it to sit on. */}
            <div
              aria-hidden="true"
              className="book-gutter hidden lg:block absolute inset-y-0 left-1/2 w-16 -translate-x-1/2 pointer-events-none"
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
