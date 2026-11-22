import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useRef } from 'react'
import type { Card } from '@/db'
import { enterSpring } from '@/design'
import {
  type CardSide,
  SwipeCard,
  type SwipeCardHandle,
  type SwipeDir,
} from '@/features/flashcards/SwipeCard'

/**
 * Imperative handle of the visible card, for the buttons and keys. The previous card unmounts
 * after its exit animation, i.e. after the next card attached its handle; a plain ref would then
 * be reset to null and the controls would do nothing.
 */
export function useCardHandle() {
  const ref = useRef<SwipeCardHandle>(null)
  const attach = useCallback((handle: SwipeCardHandle | null) => {
    ref.current = handle
    return () => {
      if (ref.current === handle) ref.current = null
    }
  }, [])
  return { ref, attach }
}

export function CardStack({
  current,
  next,
  sides,
  starred,
  round,
  index,
  enterFrom,
  attach,
  onSwiped,
  onExamples,
  onStar,
}: {
  current: Card | undefined
  next: Card | undefined
  sides: { front: CardSide; back: CardSide } | undefined
  starred: boolean
  round: number
  index: number
  enterFrom: SwipeDir | undefined
  attach: (handle: SwipeCardHandle | null) => void
  onSwiped: (dir: SwipeDir) => void
  onExamples: (() => void) | undefined
  onStar: () => void
}) {
  return (
    <div className="relative flex-1">
      <div className="relative mx-auto aspect-[3/4] max-h-[min(62dvh,560px)] w-full sm:aspect-[4/3]">
        {/* Next card peeks from behind for depth. */}
        {next && (
          <motion.div
            key={`peek-${next.id}`}
            aria-hidden="true"
            initial={{ scale: 0.9, y: 22, opacity: 0 }}
            animate={{ scale: 0.94, y: 16, opacity: 1 }}
            className="raised absolute inset-0 rounded-[2rem]"
          />
        )}
        <AnimatePresence initial={false}>
          {current && sides && (
            <motion.div
              key={`${current.id}-${round}-${index}`}
              className="absolute inset-0"
              initial={enterFrom ? false : { scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
              transition={enterSpring}
            >
              <SwipeCard
                ref={attach}
                card={current}
                sides={sides}
                enterFrom={enterFrom}
                starred={starred}
                onSwiped={onSwiped}
                onExamples={onExamples}
                onStar={onStar}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
