import React, { useMemo, useState } from 'react';
import { MediaImage } from '../services/api';
import { EmptyState } from './EmptyState';
import { Images } from 'lucide-react';

interface ScrapbookPanelProps {
  bookId: string;
  title: string;
  author: string;
  images: MediaImage[];
  loading: boolean;
  error?: string | null;
}

// ─── Seeded arrangement ───────────────────────────────────────────────────────

function hashString(value: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Small deterministic PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Placement {
  rotation: number;
  width: string;
  align: string;
  tape: 0 | 1 | 2;
}

const WIDTHS = ['100%', '92%', '82%'];
const ALIGNMENTS = ['mr-auto', 'ml-auto', 'mx-auto'];

/**
 * Where a photo sits on the page.
 *
 * Seeded from the image URL, not its list index: a book always looks the same,
 * and dropping a 404'd cover mid-session doesn't reshuffle everything else.
 * `Math.random()` here would re-roll on every render and make the collage twitch.
 */
function placementFor(bookId: string, url: string): Placement {
  const rnd = mulberry32(hashString(`${bookId}:${url}`));

  let rotation = -6.5 + rnd() * 13;
  // Nudge away from dead-straight — a photo at 0.2° just looks like a mistake.
  if (Math.abs(rotation) < 1.5) rotation = rotation < 0 ? -1.5 - rnd() * 2 : 1.5 + rnd() * 2;

  return {
    rotation: Math.round(rotation * 10) / 10,
    width: WIDTHS[Math.floor(rnd() * WIDTHS.length)],
    align: ALIGNMENTS[Math.floor(rnd() * ALIGNMENTS.length)],
    tape: Math.floor(rnd() * 3) as 0 | 1 | 2,
  };
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

const Tape: React.FC<{ variant: 0 | 1 | 2 }> = ({ variant }) => {
  if (variant === 2) return null;

  if (variant === 0) {
    return (
      <span
        aria-hidden="true"
        className="album-tape absolute -top-2.5 left-1/2 -translate-x-1/2 w-16 h-5 rotate-[-2deg]"
      />
    );
  }

  return (
    <>
      <span
        aria-hidden="true"
        className="album-tape absolute -top-2 -left-3 w-14 h-5 rotate-[-42deg]"
      />
      <span
        aria-hidden="true"
        className="album-tape absolute -bottom-2 -right-3 w-14 h-5 rotate-[-42deg]"
      />
    </>
  );
};

interface PhotoProps {
  image: MediaImage;
  placement: Placement;
  alt: string;
  delayMs: number;
  hero?: boolean;
  onError: () => void;
}

const Photo: React.FC<PhotoProps> = ({ image, placement, alt, delayMs, hero, onError }) => {
  // Author portraits get a circular mount, the way a portrait is framed in a
  // real album — and it also says "this is a person, not another edition".
  const isPortrait = image.kind === 'author';

  const img = (
    <img
      src={image.url}
      alt={alt}
      loading={hero ? 'eager' : 'lazy'}
      onError={onError}
      className={`w-full block bg-[var(--bg-beige)] object-cover ${
        isPortrait ? 'rounded-full aspect-square' : ''
      }`}
    />
  );

  return (
    // Outer element owns the resting tilt and the hover straighten. The paste-in
    // animation lives on the inner wrapper so its fill-mode transform can't
    // permanently override hover.
    <div
      className="transition-transform duration-300 ease-out hover:rotate-0 hover:scale-[1.04] hover:z-20 relative"
      style={{ transform: `rotate(${placement.rotation}deg)` }}
    >
      <div className="animate-paste-in" style={{ animationDelay: `${delayMs}ms` }}>
        {isPortrait ? (
          <figure>
            {/* Caption sits outside the circle — inside it the round mount
                would crop the text. */}
            <div className="album-photo relative rounded-full bg-[var(--white)] p-3">
              <Tape variant={placement.tape} />
              {img}
            </div>
            {image.caption && (
              <figcaption className="font-hand text-[17px] leading-tight text-[var(--muted)] text-center pt-2">
                {image.caption}
              </figcaption>
            )}
          </figure>
        ) : (
          <figure
            className={`album-photo relative bg-[var(--white)] p-2 ${
              image.caption ? 'pb-7' : ''
            }`}
          >
            <Tape variant={placement.tape} />
            {img}
            {image.caption && (
              <figcaption className="font-hand text-[17px] leading-none text-[var(--muted)] pt-2 pl-0.5">
                {image.caption}
              </figcaption>
            )}
          </figure>
        )}
      </div>
    </div>
  );
};

// ─── Panel ────────────────────────────────────────────────────────────────────

/** Right page of the spread: every cover this book has worn, pasted in. */
export const ScrapbookPanel: React.FC<ScrapbookPanelProps> = ({
  bookId,
  title,
  author,
  images,
  loading,
  error,
}) => {
  // Open Library serves plenty of 404s; a dead image must leave no gap behind.
  const [failed, setFailed] = useState<Set<string>>(new Set());

  const usable = useMemo(() => images.filter((i) => !failed.has(i.url)), [images, failed]);

  const { hero, rest } = useMemo(() => {
    const heroIndex = usable.findIndex((i) => i.kind === 'cover');
    const index = heroIndex >= 0 ? heroIndex : 0;
    return {
      hero: usable[index],
      rest: usable.filter((_, i) => i !== index),
    };
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

  // Sticker dots, placed once per book. Decorative only.
  const dots = useMemo(() => {
    const rnd = mulberry32(hashString(`dots:${bookId}`));
    const colors = ['#A0522D', '#B8860B', '#8A9A7B'];
    return colors.map((color, i) => ({
      color,
      top: `${8 + rnd() * 78}%`,
      left: `${4 + rnd() * 88}%`,
      size: 7 + Math.round(rnd() * 5),
      key: `${color}-${i}`,
    }));
  }, [bookId]);

  if (loading) {
    return (
      <div className="space-y-6" role="status">
        <span className="sr-only">Loading cover photos</span>
        <div className="h-64 w-2/3 mx-auto rounded-xl bg-[var(--bg-beige)] animate-pulse" />
        <div className="grid grid-cols-2 gap-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-[var(--bg-beige)] animate-pulse" />
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
        title="Nothing pasted in yet"
        description={
          error
            ? "The edition archive didn't respond, so there are no photos to show for this book."
            : 'No cover photos were found for this book in the edition archives.'
        }
      />
    );
  }

  return (
    <div className="relative">
      {dots.map((dot) => (
        <span
          key={dot.key}
          aria-hidden="true"
          className="absolute rounded-full pointer-events-none"
          style={{
            top: dot.top,
            left: dot.left,
            width: dot.size,
            height: dot.size,
            backgroundColor: dot.color,
            opacity: 0.5,
          }}
        />
      ))}

      <p className="font-hand text-3xl text-[var(--ink)] text-center rotate-[-1.5deg] mb-8">
        every cover it has worn
      </p>

      {hero && (
        <div className="max-w-[62%] mx-auto mb-10">
          <Photo
            image={hero}
            placement={placementFor(bookId, hero.url)}
            alt={altFor(hero)}
            delayMs={0}
            hero
            onError={() => markFailed(hero.url)}
          />
        </div>
      )}

      {/* CSS columns rather than a grid: covers arrive at wildly different
          aspect ratios and a column flow lets them pack like real pasted photos
          instead of stretching to fill grid cells. */}
      {rest.length > 0 && (
        <div className="columns-2 gap-5 [column-fill:balance]">
          {rest.map((image, index) => {
            const placement = placementFor(bookId, image.url);
            return (
              <div
                key={image.url}
                className={`break-inside-avoid mb-7 ${placement.align}`}
                style={{ width: placement.width }}
              >
                <Photo
                  image={image}
                  placement={placement}
                  alt={altFor(image)}
                  delayMs={80 + index * 55}
                  onError={() => markFailed(image.url)}
                />
              </div>
            );
          })}
        </div>
      )}

      {credits.length > 0 && (
        <p className="mt-10 pt-5 border-t border-[var(--border-light)] text-[11px] text-[var(--muted)]">
          Photos from{' '}
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
