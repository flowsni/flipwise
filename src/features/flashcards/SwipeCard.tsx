import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Card } from '../../db/types'
import { cx } from '../../design/cx'
import { IconSparkles } from '../../design/icons'
import { enterSpring, flipSpring, snappySpring } from '../../design/motion'
import { t } from '../../i18n/ru'
import { fitClass, fitSentenceClass } from '../../lib/textFit'
import { Marked } from '../ai/Marked'
import { stripMarks } from '../ai/prompt'
import { StarButton } from '../decks/StarButton'
import { SpeakButton } from '../tts/SpeakButton'

export type SwipeDir = 1 | -1 // 1 = know (right), -1 = still learning (left)

export interface SwipeCardHandle {
  flip: () => void
  swipe: (dir: SwipeDir) => void
}

/** One face of the card. */
export interface CardSide {
  text: string
  lang: string
  label: string
  /** A sentence, possibly with [[marked]] words: rendered with <mark> and a sentence-sized font. */
  sentence?: boolean
}

const THRESHOLD = 110
const VELOCITY = 550

export const SwipeCard = forwardRef<
  SwipeCardHandle,
  {
    /** For the star; the faces come from `sides`. */
    card: Card
    sides: { front: CardSide; back: CardSide }
    /** Card comes back from this side (undo). */
    enterFrom?: SwipeDir
    starred: boolean
    onSwiped: (dir: SwipeDir) => void
    /** Leave out to hide the «Примеры» button on the back. */
    onExamples?: () => void
    onStar: () => void
  }
>(function SwipeCard({ card, sides, enterFrom, starred, onSwiped, onExamples, onStar }, ref) {
  const reduce = useReducedMotion()
  const x = useMotionValue(enterFrom ? enterFrom * 700 : 0)
  const rotate = useTransform(x, [-320, 0, 320], [-16, 0, 16])
  const knowOpacity = useTransform(x, [16, 130], [0, 1])
  const learnOpacity = useTransform(x, [-130, -16], [1, 0])
  const [flipped, setFlipped] = useState(false)
  const dragged = useRef(false)
  const leaving = useRef(false)

  useEffect(() => {
    if (enterFrom) animate(x, 0, enterSpring)
  }, [enterFrom, x])

  const fly = (dir: SwipeDir, velocity = 0) => {
    if (leaving.current) return
    leaving.current = true
    if (reduce) {
      onSwiped(dir)
      return
    }
    const distance = dir * (window.innerWidth / 2 + 520)
    animate(x, distance, { duration: 0.32, ease: [0.4, 0, 0.9, 0.6], velocity }).then(() =>
      onSwiped(dir),
    )
  }

  useImperativeHandle(ref, () => ({
    flip: () => setFlipped((f) => !f),
    swipe: (dir) => fly(dir),
  }))

  const shown = flipped ? sides.back : sides.front
  const shownText = shown.sentence ? stripMarks(shown.text) : shown.text

  return (
    <motion.div
      className="absolute inset-0 touch-pan-y select-none [perspective:1600px]"
      style={{ x, rotate }}
      drag="x"
      dragMomentum={false}
      dragElastic={0.9}
      onPointerDown={() => {
        dragged.current = false
      }}
      onDragStart={() => {
        dragged.current = true
      }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > THRESHOLD || Math.abs(info.velocity.x) > VELOCITY) {
          fly(info.offset.x > 0 ? 1 : -1, info.velocity.x)
        } else {
          animate(x, 0, snappySpring)
        }
      }}
    >
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={`${t.flash.flip}. ${shownText}`}
        onClick={() => {
          if (!dragged.current) setFlipped((f) => !f)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setFlipped((f) => !f)
          }
        }}
        className="relative size-full cursor-grab rounded-[2rem] preserve-3d outline-offset-4 active:cursor-grabbing"
        initial={false}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={reduce ? { duration: 0 } : flipSpring}
      >
        <Face side={sides.front} hint={t.flash.tapToFlip} />
        <Face back side={sides.back} />
      </motion.div>

      {/* Controls live outside the rotating surface so buttons are never nested. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-5">
        <div className="flex justify-end gap-1">
          <StarButton
            term={card.term}
            starred={starred}
            onToggle={onStar}
            size="md"
            className="pointer-events-auto"
          />
          <SpeakButton
            text={shownText}
            lang={shown.lang}
            size="md"
            className="pointer-events-auto"
          />
        </div>
        <div className="flex h-12 items-center justify-center">
          <AnimatePresence>
            {flipped && onExamples && (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.12 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                whileTap={{ scale: 0.94 }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onExamples}
                className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-sun-soft px-4 py-2 text-[0.9375rem] font-semibold text-sun-ink"
              >
                <IconSparkles size={16} />
                {t.examples.button}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Know / still learning tints that bloom with the drag distance. */}
      <motion.div
        aria-hidden="true"
        style={{ opacity: knowOpacity }}
        className="pointer-events-none absolute inset-0 rounded-[2rem] border-[3px] border-good bg-good/12"
      >
        <span className="absolute top-6 left-6 -rotate-12 rounded-xl border-[3px] border-good px-3 py-1 text-xl font-extrabold tracking-wide text-good uppercase">
          {t.flash.know}
        </span>
      </motion.div>
      <motion.div
        aria-hidden="true"
        style={{ opacity: learnOpacity }}
        className="pointer-events-none absolute inset-0 rounded-[2rem] border-[3px] border-bad bg-bad/12"
      >
        <span className="absolute top-6 right-6 rotate-12 rounded-xl border-[3px] border-bad px-3 py-1 text-xl font-extrabold tracking-wide text-bad uppercase">
          {t.flash.learning}
        </span>
      </motion.div>
    </motion.div>
  )
})

function Face({ side, back, hint }: { side: CardSide; back?: boolean; hint?: string }) {
  const { text, lang, label, sentence } = side
  return (
    <span
      aria-hidden="true"
      className={cx(
        'raised absolute inset-0 flex flex-col overflow-hidden rounded-[2rem] p-5 backface-hidden sm:p-7',
        back && '[transform:rotateY(180deg)]',
      )}
    >
      <span className="flex h-9 items-center">
        <span className="text-[0.8125rem] font-semibold tracking-wider text-ink-3 uppercase">
          {label}
        </span>
      </span>
      <span
        lang={lang}
        className={cx(
          'flex flex-1 items-center justify-center px-2 text-center break-words hyphens-auto',
          sentence
            ? `leading-snug font-medium ${fitSentenceClass(stripMarks(text))}`
            : `leading-tight font-semibold tracking-tight ${fitClass(text)}`,
        )}
      >
        {sentence ? (
          <span>
            <Marked text={text} />
          </span>
        ) : (
          text
        )}
      </span>
      <span className="flex min-h-10 items-center justify-center text-[0.9375rem] text-ink-3">
        {hint}
      </span>
    </span>
  )
}
