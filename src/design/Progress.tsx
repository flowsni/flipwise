import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useState } from 'react'
import { softSpring } from './motion'

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
    >
      <motion.div
        className="h-full origin-left rounded-full bg-gradient-to-r from-coral to-sun"
        initial={false}
        animate={{ scaleX: pct }}
        transition={softSpring}
      />
    </div>
  )
}

/** Circular progress ring. `animateFromZero` replays the fill on mount (summary screens). */
export function Ring({
  value,
  size = 48,
  stroke = 5,
  color = 'var(--fw-coral)',
  track = 'var(--fw-surface-3)',
  animateFromZero = false,
  children,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  animateFromZero?: boolean
  children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: animateFromZero ? c : c * (1 - pct) }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{
            type: 'spring',
            stiffness: 60,
            damping: 18,
            delay: animateFromZero ? 0.15 : 0,
          }}
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  )
}

/** Number that counts up on mount. */
export function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const reduce = useReducedMotion()
  const mv = useMotionValue(reduce ? to : 0)
  const rounded = useTransform(mv, (v) => Math.round(v))
  const [text, setText] = useState(String(reduce ? to : 0))
  useEffect(() => rounded.on('change', (v) => setText(String(v))), [rounded])
  useEffect(() => {
    if (reduce) {
      mv.set(to)
      setText(String(to))
      return
    }
    const controls = animate(mv, to, { duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 })
    return () => controls.stop()
  }, [to, mv, reduce])
  return (
    <span className="tabular-nums">
      {text}
      {suffix}
    </span>
  )
}
