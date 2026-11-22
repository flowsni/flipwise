import { motion, useReducedMotion } from 'motion/react'
import { cx, IconCheck } from '@/design'
import type { LearnState } from '@/features/learn/learnEngine'
import { t } from '@/i18n/ru'
import type { Feedback } from './types'

export function ChoiceOptions({
  question,
  feedback,
  answerLang,
  onAnswer,
}: {
  question: NonNullable<LearnState['current']>
  feedback: Feedback | null
  answerLang: string
  onAnswer: (response: string) => void
}) {
  const reduce = useReducedMotion()
  return (
    <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <legend className="sr-only">{t.learn.chooseAnswer}</legend>
      {question.options?.map((option, i) => {
        const isAnswer = option === question.answer
        const chosen = feedback?.response === option
        const state = !feedback ? 'idle' : isAnswer ? 'right' : chosen ? 'wrong' : 'dim'
        return (
          <motion.button
            key={option}
            type="button"
            disabled={!!feedback}
            onClick={() => onAnswer(option)}
            whileTap={{ scale: 0.97 }}
            animate={
              state === 'right' && chosen && !reduce ? { scale: [1, 1.04, 1] } : { scale: 1 }
            }
            transition={{ duration: 0.35 }}
            lang={answerLang}
            className={cx(
              'flex min-h-16 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[1.05rem] font-medium transition-colors',
              state === 'idle' && 'raised border-transparent hover:border-line',
              state === 'right' && 'border-good bg-good-soft',
              state === 'wrong' && 'border-bad bg-bad-soft',
              state === 'dim' && 'border-transparent bg-surface opacity-50',
            )}
          >
            <span
              className={cx(
                'size-7 shrink-0 place-items-center rounded-lg text-[0.9375rem] font-semibold',
                // The 1–4 hints only make sense where there is a keyboard.
                state === 'right'
                  ? 'grid bg-good text-white'
                  : 'hidden bg-surface-2 text-ink-2 fine:grid',
              )}
            >
              {state === 'right' ? <IconCheck size={16} strokeWidth={3} /> : i + 1}
            </span>
            <span className="break-words">{option}</span>
          </motion.button>
        )
      })}
    </fieldset>
  )
}
