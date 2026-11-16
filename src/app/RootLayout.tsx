import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ScrollRestoration, useLocation, useNavigationType, useOutlet } from 'react-router'
import { softSpring } from '../design/motion'

/** Animates page changes. Study screens slide up, regular pages fade-slide sideways. */
export function RootLayout() {
  const location = useLocation()
  const outlet = useOutlet()
  const reduce = useReducedMotion()
  const study = /\/(flashcards|learn|test)$/.test(location.pathname)

  // POP = app start or the system's back/forward (iOS edge swipe), which already animated its own
  // snapshot. Swap pages in the same frame: `mode="wait"` would leave an empty frame between the
  // old page leaving and the new one mounting. `initial={false}` also skips in-page enter
  // animations.
  const pop = useNavigationType() === 'POP'

  return (
    <>
      {pop ? (
        <AnimatePresence key={location.pathname} initial={false}>
          <div key="page" className="min-h-dvh">
            {outlet}
          </div>
        </AnimatePresence>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={
              reduce ? { opacity: 0 } : study ? { opacity: 0, y: 28 } : { opacity: 0, x: 16 }
            }
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, transition: { duration: 0.12 } }}
            transition={softSpring}
            className="min-h-dvh"
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      )}
      <ScrollRestoration />
    </>
  )
}
