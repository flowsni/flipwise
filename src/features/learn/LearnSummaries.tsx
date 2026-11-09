import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { AnswerSide, Card } from '../../db/types'
import { Button } from '../../design/Button'
import { Confetti } from '../../design/Confetti'
import { IconCheck } from '../../design/icons'
import { bouncySpring, softSpring } from '../../design/motion'
import { t } from '../../i18n/ru'

export function RoundSummary({
  number,
  learned,
  answerWith,
  onNext,
}: {
  number: number
  learned: Card[]
  answerWith: AnswerSide
  onNext: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => ref.current?.focus(), [])
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      className="flex flex-1 flex-col gap-6"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t.learn.roundDone(number)}</h1>
        <p className="mt-1 text-ink-2">
          {learned.length ? t.learn.learnedInRound : t.learn.noneLearned}
        </p>
      </div>
      {learned.length > 0 && (
        <ul className="flex flex-col gap-2">
          {learned.map((c, i) => (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.05 * i } }}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <span className="grid size-6 place-items-center rounded-full bg-good text-white">
                <IconCheck size={14} strokeWidth={3} />
              </span>
              <span className="font-semibold">{answerWith === 'term' ? c.definition : c.term}</span>
              <span className="text-ink-2">— {answerWith === 'term' ? c.term : c.definition}</span>
            </motion.li>
          ))}
        </ul>
      )}
      <div className="mt-auto pb-2">
        <Button ref={ref} variant="primary" size="lg" block onClick={onNext}>
          {t.learn.nextRound}
        </Button>
      </div>
    </motion.section>
  )
}

export function Finished({
  count,
  onAgain,
  onDeck,
}: {
  count: number
  onAgain: () => void
  onDeck: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={softSpring}
      className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
    >
      <Confetti />
      <motion.div
        initial={{ rotate: -20, scale: 0.6 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ ...bouncySpring, delay: 0.1 }}
        className="grid size-28 place-items-center rounded-full bg-sun-soft text-6xl"
        aria-hidden="true"
      >
        🎉
      </motion.div>
      <h1 className="text-3xl font-bold tracking-tight">{t.learn.finishedTitle}</h1>
      <p className="text-ink-2">{t.learn.finishedText(count)}</p>
      <div className="mt-2 flex w-full max-w-sm flex-col gap-3">
        <Button variant="primary" size="lg" block onClick={onAgain}>
          {t.learn.again}
        </Button>
        <Button variant="raised" size="lg" block onClick={onDeck}>
          {t.learn.toDeck}
        </Button>
      </div>
    </motion.section>
  )
}
