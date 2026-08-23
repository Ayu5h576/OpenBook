import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { MIN_RATING, MAX_RATING, RATING_STEP, clampRating } from '../../utils/reviewStats';

const STARS = [1, 2, 3, 4, 5];
/** Gold matching the aggregate pill on the book page. */
const GOLD = '#B8860B';

/**
 * One star, filled 0–100%.
 *
 * A half star is an outline star with a filled copy layered over it, clipped to
 * half its width — cheaper and crisper than an SVG gradient mask, and it keeps
 * the two states pixel-aligned because they are the same glyph.
 */
const StarGlyph: React.FC<{ fillPercent: number; sizeClass: string }> = ({ fillPercent, sizeClass }) => (
  <span className={`relative inline-block ${sizeClass}`}>
    <Star className={`${sizeClass} text-[#D8CFC0]`} />
    {fillPercent > 0 && (
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${fillPercent}%` }}
        aria-hidden="true"
      >
        {/* Colour via `style`, not a Tailwind arbitrary value — an interpolated
            class name is invisible to the Tailwind scanner and never emitted. */}
        <Star className={`${sizeClass} fill-current`} style={{ color: GOLD }} />
      </span>
    )}
  </span>
);

function fillFor(star: number, value: number): number {
  if (value >= star) return 100;
  if (value >= star - 0.5) return 50;
  return 0;
}

// ─── Display ─────────────────────────────────────────────────────────────────

export interface StarRatingProps {
  value: number;
  sizeClass?: string;
  className?: string;
  /** Screen-reader label; the visual stars are hidden from the a11y tree. */
  label?: string;
}

/** Read-only star row. */
export const StarRating: React.FC<StarRatingProps> = ({
  value,
  sizeClass = 'w-4 h-4',
  className = '',
  label,
}) => (
  <span className={`inline-flex items-center gap-0.5 ${className}`} role="img"
    aria-label={label ?? `${value} out of ${MAX_RATING} stars`}>
    {STARS.map((star) => (
      <StarGlyph key={star} fillPercent={fillFor(star, value)} sizeClass={sizeClass} />
    ))}
  </span>
);

// ─── Input ───────────────────────────────────────────────────────────────────

export interface StarRatingInputProps {
  value: number;
  onChange: (rating: number) => void;
  sizeClass?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Half-star rating input.
 *
 * Each star is split into two hit zones — the left half sets `n - 0.5`, the
 * right half sets `n` — because the column is `Decimal(3,1)` and the server
 * validates `multipleOf(0.5)`.
 *
 * Semantically it is a radiogroup over the ten possible values, so a screen
 * reader announces "3.5 stars" rather than describing five ambiguous buttons.
 */
export const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value,
  onChange,
  sizeClass = 'w-7 h-7',
  disabled = false,
  className = '',
}) => {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  const step = (delta: number) => {
    if (disabled) return;
    // An unrated composer starts at 0; stepping up from there should land on
    // the minimum, not skip past it.
    onChange(clampRating((value || 0) + delta));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        step(-RATING_STEP);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        step(RATING_STEP);
        break;
      case 'Home':
        e.preventDefault();
        if (!disabled) onChange(MIN_RATING);
        break;
      case 'End':
        e.preventDefault();
        if (!disabled) onChange(MAX_RATING);
        break;
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        role="radiogroup"
        aria-label="Your rating"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHover(null)}
        className={`inline-flex items-center gap-1 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A0522D] ${
          disabled ? 'opacity-60' : ''
        }`}
      >
        {STARS.map((star) => (
          <span key={star} className={`relative inline-block ${sizeClass}`}>
            <StarGlyph fillPercent={fillFor(star, shown)} sizeClass={sizeClass} />

            {/* Two transparent halves stacked over the glyph. Buttons rather
                than click handlers on the glyph so each value is focusable and
                announced individually. */}
            {[star - RATING_STEP, star].map((rating, half) => (
              <button
                key={rating}
                type="button"
                role="radio"
                aria-checked={value === rating}
                aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}`}
                disabled={disabled}
                tabIndex={-1}
                onClick={() => !disabled && onChange(rating)}
                onMouseEnter={() => !disabled && setHover(rating)}
                className="absolute inset-y-0 w-1/2 cursor-pointer disabled:cursor-default"
                style={{ left: half === 0 ? 0 : '50%' }}
              />
            ))}
          </span>
        ))}
      </div>

      <span className="text-xs font-bold text-[var(--ink)] tabular-nums w-7">
        {shown > 0 ? shown.toFixed(1) : '—'}
      </span>
    </div>
  );
};
