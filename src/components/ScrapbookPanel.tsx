import React, { useMemo, useState } from 'react';
import { MediaImage } from '../services/api';
import { EmptyState } from './EmptyState';
import { hasPlausibleCoverShape, isGoogleCoverPlaceholder } from './BookCover';
import { Images } from 'lucide-react';

interface ScrapbookPanelProps {
  title: string;
  author: string;
  images: MediaImage[];
  loading: boolean;
  error?: string | null;
}

interface PlateProps {
  image: MediaImage;
  alt: string;
  delayMs: number;
  hero?: boolean;
  onError: () => void;
}

/**
 * One cover reproduced as a plate on the page. A cream mat, a hairline frame,
 * the cover shown whole (object-contain, never cropped — a cropped cover loses
 * its title), and a caption underneath, the way a plate is captioned in a real
 * illustrated book.
 */
const Plate: React.FC<PlateProps> = ({ image, alt, delayMs, hero, onError }) => (
  <figure className="animate-plate-in" style={{ animationDelay: `${delayMs}ms` }}>
    <div className="cover-plate rounded-[3px] p-2 aspect-[3/4] flex items-center justify-center">
      <img
        src={image.url}
        alt={alt}
        loading={hero ? 'eager' : 'lazy'}
        onError={onError}
        // Google's "image not available" filler returns 200 OK, so onError never
        // fires for it — its shape once decoded is the only tell.
        onLoad={(e) => {
          if (!hasPlausibleCoverShape(e.currentTarget)) onError();
        }}
        className="max-h-full max-w-full object-contain rounded-[1px] shadow-sm"
      />
    </div>
    {image.caption && (
      <figcaption className="font-reader text-[12px] italic leading-snug text-[var(--muted)] text-center pt-2 px-1">
        {image.caption}
      </figcaption>
    )}
  </figure>
);

// ─── Panel ────────────────────────────────────────────────────────────────────

/** Right page of the spread: every cover this book has worn, as book plates. */
export const ScrapbookPanel: React.FC<ScrapbookPanelProps> = ({
  title,
  author,
  images,
  loading,
  error,
}: ScrapbookPanelProps) => {
  // Open Library serves plenty of 404s; a dead image must leave no gap behind.
  const [failed, setFailed] = useState<Set<string>>(new Set());

  const usable = useMemo(
    () =>
      images.filter(
        // Drop Google's known "image not available" fillers up front (they'd
        // 200-OK past onError), and anything a shape check has already retired.
        (i) => !isGoogleCoverPlaceholder(i.url) && !failed.has(i.url),
      ),
    [images, failed],
  );

  // Split the images into the three roles the page lays out differently: the
  // author portrait, the lead cover, and the remaining editions.
  const { portrait, hero, rest } = useMemo(() => {
    const portrait = usable.find((i) => i.kind === 'author');
    const covers = usable.filter((i) => i.kind !== 'author');
    const [hero, ...rest] = covers;
    return { portrait, hero, rest };
  }, [usable]);

  const markFailed = (url: string) =>
    setFailed((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));

  const altFor = (image: MediaImage): string => {
    if (image.kind === 'author') return `Portrait of ${author}`;
    if (image.kind === 'cover') return `Cover of ${title}`;
    return image.caption
      ? `${title} — ${image.caption} edition cover`
      : `Alternate cover of ${title}`;
  };

  const credits = useMemo(() => {
    const bySource = new Map<string, string>();
    for (const image of usable) {
      if (!bySource.has(image.sourceName)) bySource.set(image.sourceName, image.sourceUrl);
    }
    return [...bySource.entries()];
  }, [usable]);

  if (loading) {
    return (
      <div className="space-y-6" role="status">
        <span className="sr-only">Loading cover photos</span>
        <div className="h-6 w-40 rounded bg-[var(--bg-beige)] animate-pulse" />
        <div className="aspect-[3/4] max-w-[60%] mx-auto rounded bg-[var(--bg-beige)] animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-[3/4] rounded bg-[var(--bg-beige)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || usable.length === 0) {
    return (
      <EmptyState
        preset="library"
        icon={<Images className="w-10 h-10" />}
        title="No cover gallery yet"
        description={
          error
            ? "The edition archive didn't respond, so there are no covers to show for this book."
            : 'No cover images were found for this book in the edition archives.'
        }
      />
    );
  }

  return (
    <div>
      {/* Page heading, set like the facing "Where to buy" — same eyebrow, same
          serif title, so the two pages read as one spread. */}
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] mb-2">
            Cover gallery
          </p>
          <h3 className="font-serif-title text-2xl font-bold text-[var(--ink)] leading-tight">
            Every cover it has worn
          </h3>
        </div>

        {/* The author, framed as a small inset portrait — captioned, so it
            reads as "the author", not another edition. */}
        {portrait && (
          <figure className="flex-shrink-0 w-20 text-center">
            <div className="cover-plate rounded-full p-1.5 aspect-square flex items-center justify-center">
              <img
                src={portrait.url}
                alt={altFor(portrait)}
                loading="lazy"
                onError={() => markFailed(portrait.url)}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <figcaption className="font-reader text-[11px] italic text-[var(--muted)] pt-1.5 leading-tight">
              {portrait.caption || author}
            </figcaption>
          </figure>
        )}
      </header>

      {/* The lead cover, given the room a frontispiece gets. */}
      {hero && (
        <div className="max-w-[62%] mx-auto mb-8">
          <Plate image={hero} alt={altFor(hero)} delayMs={0} hero onError={() => markFailed(hero.url)} />
        </div>
      )}

      {/* The other editions, ranged in an even plate grid. */}
      {rest.length > 0 && (
        <>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] mb-4 pt-4 border-t border-[var(--border-light)]">
            Other editions
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {rest.map((image, index) => (
              <Plate
                key={image.url}
                image={image}
                alt={altFor(image)}
                delayMs={70 + index * 55}
                onError={() => markFailed(image.url)}
              />
            ))}
          </div>
        </>
      )}

      {credits.length > 0 && (
        <p className="mt-8 pt-5 border-t border-[var(--border-light)] text-[11px] text-[var(--muted)]">
          Covers from{' '}
          {credits.map(([name, url], i) => (
            <React.Fragment key={name}>
              {i > 0 && ' · '}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[var(--ink)] transition-colors"
              >
                {name}
              </a>
            </React.Fragment>
          ))}
        </p>
      )}
    </div>
  );
};
