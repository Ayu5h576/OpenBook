import React, { useEffect, useMemo, useState } from 'react';
import { m } from '../motion';

/**
 * Book cover with an honest fallback chain.
 *
 * Covers fail in three distinct ways, and each needs a different guard:
 *
 * 1. Google Books answers *200 OK* with an "image not available" PNG for volumes
 *    it holds no scan of. Because it is a successful response `onError` never
 *    fires and the placeholder renders as if it were the cover. Two variants
 *    exist, and only one is detectable from the bitmap:
 *      - a 575x750 portrait grey box — plausibly cover-shaped, so the *volume id*
 *        has to catch it (see isGoogleCoverPlaceholder);
 *      - a 575x92 wide banner — caught by the aspect-ratio check below.
 *    Verified against the live API on the local catalog: `gBhlAQAACAAJ` serves
 *    the portrait box, `k8vYF4wOaRwC` the banner, `sq4KacVAW-gC` a real cover.
 * 2. The record has no cover URL at all. Previously those fell back to a stock
 *    photo of somebody else's bookshelf, which is worse than admitting it.
 * 3. Open Library has art Google doesn't, keyed by ISBN — worth asking before
 *    giving up, and `default=false` makes it 404 on a miss, which is exactly the
 *    behaviour a fallback chain needs.
 *
 * When every source is exhausted we *draw* a cover from the book's own metadata.
 */

export type CoverSize = 'thumb' | 'large';

interface BookCoverProps {
  title: string;
  author?: string;
  /** Cover URL from our own record, if any. */
  coverUrl?: string | null;
  isbn13?: string | null;
  isbn10?: string | null;
  /** Applied to the rendered image/drawing. Pass sizing and radius here. */
  className?: string;
  /** Eager-load the one cover that's above the fold; lazy-load the rest. */
  eager?: boolean;
  /**
   * How large this cover is rendered. `thumb` (default) asks Google for a ~300px
   * image; `large` asks for the full-resolution scan. Getting this wrong is a
   * 400KB-per-card mistake, not a cosmetic one.
   */
  size?: CoverSize;
  /**
   * Opt-in shared-element id. When two mounted BookCovers carry the same
   * `layoutId` and one replaces the other, Motion flies the cover between their
   * positions (see the bookshelf → cinematic-modal handoff). Omitted everywhere
   * else, so the common case renders a bare <img>/<svg> with no wrapper — the
   * sizing every existing call site relies on is untouched.
   */
  layoutId?: string;
}

// ─── Placeholder detection ────────────────────────────────────────────────────

/**
 * True for Google Books URLs guaranteed to serve the "image not available"
 * placeholder.
 *
 * Volume ids encode what Google holds: `…AAAAQBAJ` is a publisher-supplied ebook
 * with real cover art, while `…AAAACAAJ` is a record imported from a library
 * catalogue with no digitised copy. For the latter every image size resolves to
 * the same grey box, and because that box is portrait-shaped no check on the
 * decoded bitmap can tell it from a real cover — this is the only signal there
 * is, so it runs before the request is ever made.
 */
export function isGoogleCoverPlaceholder(url: string): boolean {
  if (!/books\.google\.com/.test(url)) return false;
  const id = /[?&]id=([^&]+)/.exec(url)?.[1];
  return Boolean(id && /CAAJ$/.test(id));
}

/**
 * Book covers are portrait. Anything wildly outside that is a cropped strip,
 * Google's wide "not available" banner, or a tracking pixel — not artwork. The
 * bound is deliberately loose so an unusual but genuine cover (square-ish art
 * books) still passes.
 */
export function hasPlausibleCoverShape(img: {
  naturalWidth: number;
  naturalHeight: number;
}): boolean {
  const { naturalWidth: w, naturalHeight: h } = img;
  if (w < 24 || h < 24) return false;
  const ratio = w / h;
  return ratio > 0.4 && ratio < 1.15;
}

/**
 * Ask Google for an image sized to how we render it.
 *
 * `zoom` is the whole story: 1 is 128px wide, 2 is ~300px, 0 is the full scan
 * (1744px, ~400KB). Stored URLs pin `zoom=0` because the same builder fed both
 * the detail hero and the card grids, so a shelf of twelve cards pulled ~5MB of
 * cover art. `edge=curl` paints a fake page-curl onto the bitmap, which reads as
 * an artifact once the image sits in our own framed, rounded card.
 */
function sizeGoogleCover(url: string, size: CoverSize): string {
  if (!/books\.google\.com/.test(url)) return url;
  return url
    .replace(/([?&])zoom=\d+/, `$1zoom=${size === 'large' ? 0 : 2}`)
    .replace(/([?&])edge=curl/, '$1edge=none');
}

function openLibraryCover(isbn: string, size: CoverSize): string {
  // default=false → 404 instead of Open Library's own blank placeholder, so a
  // miss reaches onError and moves the chain along.
  const suffix = size === 'large' ? 'L' : 'M';
  return `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-${suffix}.jpg?default=false`;
}

// ─── Drawn cover ──────────────────────────────────────────────────────────────

function hashString(value: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Binding cloths. Chosen to sit with the app's warm paper palette rather than
 * against it, and dark enough that cream lettering stays legible on every one.
 */
const CLOTHS = [
  { cloth: '#6E2431', spine: '#571C27' }, // oxblood
  { cloth: '#24443A', spine: '#1B342C' }, // forest
  { cloth: '#22344F', spine: '#1A283D' }, // navy
  { cloth: '#7C5E1E', spine: '#634A17' }, // ochre
  { cloth: '#4A2B49', spine: '#3A213A' }, // plum
  { cloth: '#35414B', spine: '#28313A' }, // slate
  { cloth: '#7A4426', spine: '#61351D' }, // sienna
];

const INK = '#F1E7D3';

/** Greedy wrap using an average glyph width — good enough for 1–4 short lines. */
function wrapTitle(title: string, fontSize: number, maxWidth: number): string[] {
  const perChar = fontSize * 0.46;
  const maxChars = Math.max(6, Math.floor(maxWidth / perChar));
  const lines: string[] = [];
  let line = '';

  for (const word of title.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  // Four lines is the most the plate can hold; truncate the last one.
  if (lines.length > 4) {
    const kept = lines.slice(0, 4);
    kept[3] = `${kept[3].slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
    return kept;
  }
  return lines;
}

/**
 * A cloth-bound cover drawn from the book's own metadata.
 *
 * SVG rather than a div stack so one description scales from a 48px list
 * thumbnail to a 400px detail hero without a second set of type sizes.
 */
const DrawnCover: React.FC<{ title: string; author?: string; className?: string }> = ({
  title,
  author,
  className,
}) => {
  const { cloth, spine, lines, fontSize } = useMemo(() => {
    const palette = CLOTHS[hashString(title) % CLOTHS.length];
    // Long titles step down so a four-word title isn't set at caption size.
    const size = title.length > 58 ? 21 : title.length > 34 ? 25 : title.length > 18 ? 29 : 34;
    return {
      cloth: palette.cloth,
      spine: palette.spine,
      lines: wrapTitle(title, size, 208),
      fontSize: size,
    };
  }, [title]);

  const lineHeight = fontSize * 1.16;
  // Centre the title block in the plate, then place the author beneath it.
  const blockTop = 225 - ((lines.length - 1) * lineHeight) / 2 - 14;
  const authorY = blockTop + (lines.length - 1) * lineHeight + 46;

  return (
    <svg
      viewBox="0 0 300 450"
      className={className}
      role="img"
      aria-label={author ? `${title} by ${author}` : title}
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="300" height="450" fill={cloth} />

      {/* Spine, with the light catch along its inner edge. */}
      <rect width="26" height="450" fill={spine} />
      <rect x="26" width="1.5" height="450" fill={INK} opacity="0.14" />

      {/* Blind-stamped double rule. */}
      <rect
        x="44"
        y="30"
        width="228"
        height="390"
        fill="none"
        stroke={INK}
        strokeOpacity="0.34"
        strokeWidth="1.2"
      />
      <rect
        x="49"
        y="35"
        width="218"
        height="380"
        fill="none"
        stroke={INK}
        strokeOpacity="0.16"
        strokeWidth="0.6"
      />

      <g
        fill={INK}
        textAnchor="middle"
        fontFamily="'Cormorant Garamond', 'Playfair Display', Georgia, serif"
      >
        {lines.map((line, i) => (
          <text
            key={i}
            x="158"
            y={blockTop + i * lineHeight}
            fontSize={fontSize}
            fontWeight="600"
            letterSpacing="0.6"
          >
            {line}
          </text>
        ))}

        {author && (
          <>
            <line
              x1="130"
              x2="186"
              y1={authorY - 24}
              y2={authorY - 24}
              stroke={INK}
              strokeOpacity="0.4"
              strokeWidth="0.9"
            />
            <text
              x="158"
              y={authorY}
              fontSize="13"
              fontWeight="500"
              letterSpacing="2.4"
              opacity="0.82"
              fontFamily="'Inter', system-ui, sans-serif"
            >
              {author.toUpperCase().slice(0, 26)}
            </text>
          </>
        )}

        {/* Printer's ornament — the quiet mark a plain plate needs at the foot. */}
        <text x="158" y="396" fontSize="15" opacity="0.42">
          ❧
        </text>
      </g>
    </svg>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const BookCover: React.FC<BookCoverProps> = ({
  title,
  author,
  coverUrl,
  isbn13,
  isbn10,
  className,
  eager,
  size = 'thumb',
  layoutId,
}: BookCoverProps) => {
  const candidates = useMemo(() => {
    const urls: string[] = [];
    if (coverUrl && !isGoogleCoverPlaceholder(coverUrl)) urls.push(sizeGoogleCover(coverUrl, size));
    // Open Library keys covers by ISBN, so it can only help when we have one.
    // The two ISBNs of the same edition often resolve to different scans there.
    for (const isbn of [isbn13, isbn10]) {
      if (isbn) urls.push(openLibraryCover(isbn, size));
    }
    return urls;
  }, [coverUrl, isbn13, isbn10, size]);

  const [index, setIndex] = useState(0);

  // Card lists recycle this component across books; without a reset a book whose
  // first candidate works would inherit the previous book's exhausted index.
  useEffect(() => setIndex(0), [candidates]);

  const src = candidates[index];

  const inner = !src ? (
    <DrawnCover title={title} author={author} className={className} />
  ) : (
    <img
      // Keyed by URL so React swaps the element rather than reusing one that has
      // already fired onError for the previous candidate.
      key={src}
      src={src}
      alt={author ? `Cover of ${title} by ${author}` : `Cover of ${title}`}
      loading={eager ? 'eager' : 'lazy'}
      className={className}
      onError={() => setIndex((i) => i + 1)}
      onLoad={(event) => {
        if (!hasPlausibleCoverShape(event.currentTarget)) setIndex((i) => i + 1);
      }}
    />
  );

  // No layoutId → return the bare element, exactly as before (no extra wrapper,
  // so callers' object-cover / sizing on `className` behaves identically). With
  // a layoutId, the shared-element wrapper fills its parent and the cover fills
  // the wrapper, so the flight box tracks the rendered cover.
  if (!layoutId) return inner;
  return (
    <m.div layoutId={layoutId} className="w-full h-full">
      {inner}
    </m.div>
  );
};
