// Motion's heaviest bundle, isolated behind a dynamic import.
//
// `domMax` carries the whole animation + gesture + *layout-projection* engine
// (layout projection is what powers `layoutId` shared-element flights). Left as a
// static import it lands in the main entry chunk and adds ~45kB gzip to first
// paint. This module is imported *only* dynamically (see MotionProvider's
// loadFeatures), so the bundler splits it into its own chunk that loads after
// mount — `m` components paint immediately and gain animation a beat later, which
// is exactly the progressive-enhancement LazyMotion is designed for.
//
// Keep this file's imports to `domMax` alone. Anything statically re-exported
// from ./index is already in the main chunk; importing it here too is harmless,
// but importing something *new* here quietly widens this split chunk.
import { domMax } from 'motion/react';

export default domMax;
