import { useMemo } from 'react';
import type { MouseEvent } from 'react';
import { useMotionValue, useSpring, useReducedMotion, SPRING_SNAPPY } from './index';
import type { MotionValue } from 'motion/react';

interface TiltOptions {
  /** Peak rotation at the corners, in degrees. */
  maxDeg?: number;
  /** Spring used to smooth the raw pointer values into weighted motion. */
  stiffness?: number;
  damping?: number;
}

interface Tilt {
  /** Spring-smoothed rotation, ready to drop into an `m.div` style. */
  rotateX: MotionValue<number>;
  rotateY: MotionValue<number>;
  /** Attach to the element that should *sense* the pointer (often a parent). */
  onMouseMove: (e: MouseEvent<HTMLElement>) => void;
  /** Return the surface to rest — on mouse leave, and when a mode takes over. */
  reset: () => void;
}

/**
 * Pointer-driven 3D tilt built on motion values rather than React state.
 *
 * The version this replaces stored the pointer position in `useState`, so every
 * `mousemove` re-rendered the entire subtree under it (a whole shelf of books).
 * Motion values live outside React's render cycle: `.set()` pushes the new angle
 * straight to the compositor through a spring, and React never re-renders. That
 * is the whole point of moving the tilt here — it's a real performance fix, not
 * just nicer easing.
 *
 * Reduced motion: `MotionConfig reducedMotion="user"` (see ./index) only governs
 * *declarative* animations. These are imperative values, so the OS setting is
 * honoured here explicitly — when it's on, the setters no-op and the springs sit
 * at rest, leaving the element flat.
 */
export function useTilt(options: TiltOptions = {}): Tilt {
  const { maxDeg = 6 } = options;
  const prefersReduced = useReducedMotion();

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const springConfig = useMemo(
    () => ({
      ...SPRING_SNAPPY,
      ...(options.stiffness != null ? { stiffness: options.stiffness } : {}),
      ...(options.damping != null ? { damping: options.damping } : {}),
    }),
    [options.stiffness, options.damping],
  );

  const rotateX = useSpring(rawX, springConfig);
  const rotateY = useSpring(rawY, springConfig);

  const onMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (prefersReduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // Pointer position as -0.5…0.5 from the element's centre, scaled to degrees.
    // rotateX follows the vertical axis and is inverted so the top edge tips away.
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rawY.set(px * 2 * maxDeg);
    rawX.set(py * -2 * maxDeg);
  };

  const reset = () => {
    rawX.set(0);
    rawY.set(0);
  };

  return { rotateX, rotateY, onMouseMove, reset };
}
