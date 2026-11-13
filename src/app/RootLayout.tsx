import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ScrollRestoration, useLocation, useNavigationType, useOutlet } from 'react-router'
import { softSpring } from '../design/motion'

/** Animates page changes. Study screens slide up, regular pages fade-slide sideways. */
export function RootLayout() {
  const location = useLocation()
  const outlet = useOutlet()
  const reduce = useReducedMotion()
  const study = /\/(flashcards|learn|test)$/.test(location.pathname)

  // POP comes only from the system (iOS edge swipe, browser back/forward), which already animated its own snapshot.
  const pop = useNavigationType() === 'POP'

  // The exiting page keeps its old props, so `exit` reads `pop` through AnimatePresence's `custom`.
  const variants = {
    exit: (isPop: boolean) =>
      isPop
        ? { opacity: 0, transition: { duration: 0 } }
        : reduce
          ? { opacity: 0 }
          : { opacity: 0, transition: { duration: 0.12 } },
  }

  return (
    <>
      <AnimatePresence mode="wait" initial={false} custom={pop}>
        <motion.div
          key={location.pathname}
          variants={variants}
          initial={
            pop
              ? false
              : reduce
                ? { opacity: 0 }
                : study
                  ? { opacity: 0, y: 28 }
                  : { opacity: 0, x: 16 }
          }
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit="exit"
          transition={softSpring}
          className="min-h-dvh"
        >
          {outlet}
        </motion.div>
      </AnimatePresence>
      <ScrollRestoration />
    </>
  )
}
