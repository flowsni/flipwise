import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'

const COLORS = ['var(--fw-coral)', 'var(--fw-plum)', 'var(--fw-sun)', 'var(--fw-good)']

/** A light confetti burst for finishing Learn mode. */
export function Confetti({ count = 46 }: { count?: number }) {
  const reduce = useReducedMotion()
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        duration: 1.6 + Math.random() * 1.2,
        rotate: (Math.random() - 0.5) * 720,
        drift: (Math.random() - 0.5) * 160,
        size: 6 + Math.random() * 7,
        round: Math.random() > 0.6,
        color: COLORS[i % COLORS.length],
      })),
    [count],
  )
  if (reduce) return null
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            borderRadius: p.round ? '50%' : 2,
            background: p.color,
          }}
          initial={{ y: -20, x: 0, rotate: 0, opacity: 1 }}
          animate={{ y: '105vh', x: p.drift, rotate: p.rotate, opacity: [1, 1, 0.8] }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.2, 0.6, 0.4, 1] }}
        />
      ))}
    </div>
  )
}
