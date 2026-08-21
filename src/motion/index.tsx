import React from 'react';
import { LazyMotion, MotionConfig } from 'motion/react';
import type { Transition, Variants } from 'motion/react';

/**
 * The project's Motion (Framer Motion) foundation.
 *
 * Two things here are deliberate and load-bearing:
 *
 * 1. **Bundle.** We import the `m` component (tiny, feature-less) plus load the
 *    feature set once through `LazyMotion`, instead of importing `motion.*`
 *    (which bundles every feature at every call site). `domMax` is chosen over
 *    the lighter `domAnimation` because shared-element transitions (`layoutId`)
 *    need Motion's layout-projection engine, which only `domMax` includes.
 *    Everything animated in the app must import `m` FROM THIS FILE and use
 *    `<m.div>` etc. — never `motion.div`.
 *
 * 2. **Reduced motion is an accessibility guarantee we already had.** `index.css`
 *    has a `prefers-reduced-motion` block that flattens every *CSS* animation to
 *    ~0ms. Motion animates via the Web Animations API / JS, which that CSS rule
 *    cannot reach — so without help, adding Motion would silently *regress* that
 *    guarantee. `MotionConfig reducedMotion="user"` restores it: when the OS
 *    setting is on, Motion disables transform/layout animation and keeps only
 *    opacity, automatically, for every declarative `m.*` animation below.
 *
 *    One thing `MotionConfig` can NOT neutralize is *imperative* motion values
 *    (`useMotionValue`/`useSpring` — the 3D tilt). Those are raw numbers, not
 *    declarative animations, so any component driving them must gate on
 *    `useReducedMotion()` itself. See `useTilt`.
 */

// Re-export the surface the rest of the app uses, so components import motion
// from one place and can't reach for the bundle-heavy `motion.*` by accident.
export { AnimatePresence, useReducedMotion } from 'motion/react';
export {
  m,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from 'motion/react';
export type { Variants, Transition } from 'motion/react';

// ─── Shared motion tokens ───────────────────────────────────────────────────
//
// The app's CSS already leans on one easing curve — cubic-bezier(0.22,1,0.36,1)
// — across index.css (`animate-fade-up`, `.cover-plate`, etc). Matching it here
// makes Motion transitions feel like they belong to the same design language
// rather than a bolted-on library.

/** The house easing curve, as Motion expects it (control-point array). */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Snappy spring for UI that should settle quickly (hovers, small moves). */
export const SPRING_SNAPPY: Transition = { type: 'spring', stiffness: 420, damping: 38 };

/** Softer spring for larger travel (a cover flying across the screen). */
export const SPRING_GENTLE: Transition = { type: 'spring', stiffness: 240, damping: 28 };

// ─── Page transitions ─────────────────────────────────────────────────────────

/**
 * Enter/exit for a routed page. Kept subtle on purpose: a small rise on the way
 * in, a smaller settle on the way out, so navigation feels responsive rather
 * than theatrical. Under `reducedMotion="user"` the `y` is dropped by Motion and
 * only the opacity crossfade remains.
 */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: 'easeIn' } },
};

// ─── Staggered lists/grids ──────────────────────────────────────────────────
//
// A parent uses `staggerListContainer` and each child uses `staggerListItem`;
// the parent's `staggerChildren` cascades the children in without any per-item
// delay bookkeeping at the call site.

export const staggerListContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05, delayChildren: 0.03 },
  },
};

export const staggerListItem: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT },
  },
};

// ─── Provider ───────────────────────────────────────────────────────────────

/**
 * Wrap the app once, at the root. Provides the lazily-loaded feature set to
 * every `m.*` component and installs the reduced-motion policy.
 */
// Load the feature bundle as its own chunk (see ./features) rather than baking
// it into the entry. Deferred one microtask past mount; core motion (values,
// springs, useReducedMotion) already works synchronously without it.
const loadFeatures = () => import('./features').then((res) => res.default);

export const MotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MotionConfig reducedMotion="user">
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  </MotionConfig>
);
