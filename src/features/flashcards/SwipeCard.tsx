import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Card, Deck } from '../../db/types'
import { cx } from '../../design/cx'
import { IconSparkles } from '../../design/icons'
import { t } from '../../i18n/ru'
import { SpeakButton } from '../tts/SpeakButton'

export type SwipeDir = 1 | -1 // 1 = know (right), -1 = still learning (left)

export interface SwipeCardHandle {
  flip: () => void
  swipe: (dir: SwipeDir) => void
}

const THRESHOLD = 110
const VELOCITY = 550

/** Font size that keeps long terms readable inside the card. */
export function fitClass(text: string): string {
  const n = text.length
  if (n <= 14) return 'text-[2.6rem] sm:text-5xl'
  if (n <= 32) return 'text-[2rem] sm:text-4xl'
  if (n <= 70) return 'text-2xl sm:text-3xl'
  if (n <= 140) return 'text-xl sm:text-2xl'
  return 'text-lg'
}

export const SwipeCard = forwardRef<
  SwipeCardHandle,
  {
    card: Card
    deck: Deck
    front: 'term' | 'definition'
    /** Card comes back from this side (undo). */
    enterFrom?: SwipeDir
    onSwiped: (dir: SwipeDir) => void
    onExamples: () => void
  }
>(function SwipeCard({ card, deck, front, enterFrom, onSwiped, onExamples }, ref) {
  const reduce = useReducedMotion()
  const x = useMotionValue(enterFrom ? enterFrom * 700 : 0)
  const rotate = useTransform(x, [-320, 0, 320], [-16, 0, 16])
  const knowOpacity = useTransform(x, [16, 130], [0, 1])
  const learnOpacity = useTransform(x, [-130, -16], [1, 0])
  const [flipped, setFlipped] = useState(false)
  const dragged = useRef(false)
  const leaving = useRef(false)

  useEffect(() => {
    if (enterFrom) animate(x, 0, { type: 'spring', stiffness: 380, damping: 32 })
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

  const frontText = front === 'term' ? card.term : card.definition
  const backText = front === 'term' ? card.definition : card.term
  const frontLang = front === 'term' ? deck.termLang : deck.defLang
  const backLang = front === 'term' ? deck.defLang : deck.termLang
  const shownText = flipped ? backText : frontText
  const shownLang = flipped ? backLang : frontLang

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
          animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 })
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
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 240, damping: 24 }}
      >
        <Face
          text={frontText}
          lang={frontLang}
          label={front === 'term' ? t.study.termSide : t.study.definitionSide}
          hint={t.flash.tapToFlip}
        />
        <Face
          back
          text={backText}
          lang={backLang}
          label={front === 'term' ? t.study.definitionSide : t.study.termSide}
        />
      </motion.div>

      {/* Controls live outside the rotating surface so buttons are never nested. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-5">
        <div className="flex justify-end">
          <SpeakButton
            text={shownText}
            lang={shownLang}
            size="md"
            className="pointer-events-auto"
          />
        </div>
        <div className="flex h-12 items-center justify-center">
          <AnimatePresence>
            {flipped && (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.12 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                whileTap={{ scale: 0.94 }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onExamples}
                className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-sun-soft px-4 py-2 text-sm font-semibold text-[#7a5400] dark:text-sun"
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

function Face({
  text,
  lang,
  label,
  back,
  hint,
}: {
  text: string
  lang: string
  label: string
  back?: boolean
  hint?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'raised absolute inset-0 flex flex-col overflow-hidden rounded-[2rem] p-5 backface-hidden sm:p-7',
        back && '[transform:rotateY(180deg)]',
      )}
    >
      <span className="flex h-9 items-center">
        <span className="text-xs font-semibold tracking-wider text-ink-3 uppercase">{label}</span>
      </span>
      <span
        lang={lang}
        className={cx(
          'flex flex-1 items-center justify-center px-2 text-center leading-tight font-semibold tracking-tight break-words hyphens-auto',
          fitClass(text),
        )}
      >
        {text}
      </span>
      <span className="flex min-h-10 items-center justify-center text-sm text-ink-3">{hint}</span>
    </span>
  )
}
