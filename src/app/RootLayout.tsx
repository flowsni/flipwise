import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router'
import { softSpring } from '../design/motion'

/** Animates page changes. Study screens slide up, regular pages fade-slide sideways. */
export function RootLayout() {
  const location = useLocation()
  const outlet = useOutlet()
  const reduce = useReducedMotion()
  const study = /\/(flashcards|learn|test)$/.test(location.pathname)

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to top on every route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={reduce ? { opacity: 0 } : study ? { opacity: 0, y: 28 } : { opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, transition: { duration: 0.12 } }}
        transition={softSpring}
        className="min-h-dvh"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  )
}
