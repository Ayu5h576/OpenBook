import React from 'react';

/**
 * A user's picture, or their initial when they have none.
 *
 * Previously defined three times over, and the copies had drifted: the club
 * view used `rounded-xl`, the profile view `rounded-2xl`, and the activity
 * sidebar a `rounded-full` chip with a different initial colour. The props
 * below exist to cover exactly that drift so every original call site keeps
 * rendering identically — defaults reproduce the club-view flavour.
 */
export interface AvatarProps {
  username: string;
  avatar?: string | null;
  /** Tailwind width/height pair, e.g. `'w-20 h-20'`. */
  size?: string;
  /** Tailwind text size for the fallback initial. */
  textSize?: string;
  /** Tailwind border-radius for the frame. */
  shape?: string;
  /** Tailwind colour for the fallback initial. */
  initialClass?: string;
  /** Extra classes on the frame — positioning, margins. */
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  username,
  avatar,
  size = 'w-8 h-8',
  textSize = 'text-xs',
  shape = 'rounded-xl',
  initialClass = 'text-[#A0522D]',
  className = '',
}) => (
  <div
    className={`${size} ${shape} ${className} bg-[var(--bg-beige)] flex items-center justify-center shrink-0 overflow-hidden`}
  >
    {avatar ? (
      <img src={avatar} alt={username} className="w-full h-full object-cover" />
    ) : (
      <span className={`${textSize} font-bold ${initialClass}`}>
        {username.charAt(0).toUpperCase()}
      </span>
    )}
  </div>
);
