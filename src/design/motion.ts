import type { Transition } from 'motion/react'

export const spring = {
  type: 'spring',
  stiffness: 520,
  damping: 34,
  mass: 0.9,
} satisfies Transition
export const softSpring = { type: 'spring', stiffness: 260, damping: 30 } satisfies Transition
export const pressSpring = { type: 'spring', stiffness: 700, damping: 30 } satisfies Transition
