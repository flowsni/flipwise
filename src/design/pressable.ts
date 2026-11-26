import { motion } from 'motion/react'
import { Link } from 'react-router'
import { pressSpring } from './motion'

export const MotionLink = motion.create(Link)

export const tones = {
  coral: 'bg-coral/15 text-primary',
  plum: 'bg-plum-soft text-plum-ink',
  sun: 'bg-sun-soft text-sun-ink',
}

export const pressProps = {
  whileTap: { scale: 0.97, boxShadow: 'var(--fw-shadow-pressed)' },
  transition: pressSpring,
}
