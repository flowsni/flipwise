import type { Transition } from 'motion/react'

/**
 * Spring presets. Components pick one of these instead of inventing stiffness/damping values,
 * so the whole app moves with one personality. `MotionConfig reducedMotion="user"` in App
 * turns them into instant transitions for people who prefer reduced motion.
 */

/** Sheets, toasts: quick and settled. */
export const spring = {
  type: 'spring',
  stiffness: 520,
  damping: 34,
  mass: 0.9,
} satisfies Transition
/** Page transitions, progress bars, summary screens: calm. */
export const softSpring = { type: 'spring', stiffness: 260, damping: 30 } satisfies Transition
/** Press feedback on buttons. */
export const pressSpring = { type: 'spring', stiffness: 700, damping: 30 } satisfies Transition
/** Popovers and drag spring-back: fast with no overshoot. */
export const snappySpring = { type: 'spring', stiffness: 600, damping: 36 } satisfies Transition
/** Content entering the screen (cards, questions, list items). */
export const enterSpring = { type: 'spring', stiffness: 380, damping: 32 } satisfies Transition
/** 3D card flip: a touch of weight. */
export const flipSpring = { type: 'spring', stiffness: 240, damping: 24 } satisfies Transition
/** Celebrations: playful overshoot. */
export const bouncySpring = { type: 'spring', stiffness: 220, damping: 12 } satisfies Transition
/** Progress rings filling up on summary screens. */
export const ringSpring = { type: 'spring', stiffness: 60, damping: 18 } satisfies Transition
