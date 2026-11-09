import { motion } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'
import type { Deck } from '../../db/types'
import { Button } from '../../design/Button'
import { IconCheck, IconX } from '../../design/icons'
import { CountUp, Ring } from '../../design/Progress'
import { t } from '../../i18n/ru'
import { AnswerFeedback } from '../study/AnswerFeedback'
import { gradeTest } from './testGenerator'
import { langOf, type TestState } from './testState'

export function TestResults({
  deck,
  state,
  onOverride,
  onRetakeMistakes,
  onNew,
  onDeck,
}: {
  deck: Deck
  state: TestState
  onOverride: (questionId: string) => void
  onRetakeMistakes: (cardIds: string[]) => void
  onNew: () => void
  onDeck: () => void
}) {
  const answerLang = langOf(deck, state.config.answerWith)
  const result = useMemo(
    () => gradeTest(state.questions, state.answers, answerLang, state.overrides),
    [state, answerLang],
  )
  const mistakes = state.questions.filter(
    (q) => !result.items.find((r) => r.questionId === q.id)?.correct,
  )
  const almost = result.items.filter((r) => r.match?.verdict === 'almost').map((r) => r.questionId)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6 pb-6"
    >
      <div className="raised flex flex-col items-center gap-3 rounded-[1.75rem] p-6 text-center">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold text-ink-2 outline-none"
        >
          {t.test.resultsTitle}
        </h1>
        <Ring
          value={result.percent / 100}
          size={150}
          stroke={13}
          color={result.percent >= 80 ? 'var(--fw-good)' : 'var(--fw-coral)'}
          animateFromZero
        >
          <span className="text-4xl font-bold">
            <CountUp to={result.percent} suffix="%" />
          </span>
        </Ring>
        <p className="font-semibold">{t.test.correctOf(result.correct, result.total)}</p>
        <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
          {mistakes.length > 0 && (
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={() => onRetakeMistakes([...new Set(mistakes.map((q) => q.cardId))])}
            >
              {t.test.retakeMistakes}
            </Button>
          )}
          <Button
            variant={mistakes.length ? 'raised' : 'primary'}
            size="lg"
            className="flex-1"
            onClick={onNew}
          >
            {t.test.newTest}
          </Button>
          <Button variant="ghost" size="lg" onClick={onDeck}>
            {t.test.toDeck}
          </Button>
        </div>
      </div>

      <section aria-labelledby="mistakes-title" className="flex flex-col gap-3">
        <h2 id="mistakes-title" className="text-lg font-semibold tracking-tight">
          {t.test.mistakes}
        </h2>
        {mistakes.length === 0 && <p className="text-ink-2">{t.test.noMistakes}</p>}
        {mistakes.map((q) => {
          const given = state.answers[q.id] ?? ''
          const shownGiven =
            q.type === 'truefalse'
              ? given === 'true'
                ? t.test.true
                : given === 'false'
                  ? t.test.false
                  : ''
              : given
          return (
            <div
              key={q.id}
              className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4"
            >
              <p className="font-semibold break-words">
                {q.prompt}
                {q.type === 'truefalse' && (
                  <span className="font-normal text-ink-2"> — {q.shown}</span>
                )}
              </p>
              <p className="flex items-start gap-2 text-[0.9375rem]">
                <IconX size={18} className="mt-0.5 shrink-0 text-bad" />
                <span>
                  <span className="text-ink-2">{t.test.yourAnswer}: </span>
                  {shownGiven || <span className="text-ink-3 italic">{t.test.noAnswer}</span>}
                </span>
              </p>
              <p className="flex items-start gap-2 text-[0.9375rem]">
                <IconCheck size={18} className="mt-0.5 shrink-0 text-good" />
                <span>
                  <span className="text-ink-2">{t.test.correctAnswer}: </span>
                  <span className="font-semibold" lang={answerLang}>
                    {q.type === 'truefalse'
                      ? `${q.isTrue ? t.test.true : t.test.false} (${q.answer})`
                      : q.answer}
                  </span>
                </span>
              </p>
              {q.type === 'written' && given.trim() && (
                <Button
                  size="sm"
                  variant="soft"
                  className="self-start"
                  onClick={() => onOverride(q.id)}
                >
                  {t.test.iWasRight}
                </Button>
              )}
            </div>
          )
        })}
        {almost.length > 0 &&
          state.questions
            .filter((q) => almost.includes(q.id))
            .map((q) => (
              <AnswerFeedback
                key={`almost-${q.id}`}
                match={result.items.find((r) => r.questionId === q.id)!.match!}
                response={state.answers[q.id] ?? ''}
                answer={q.answer}
                lang={answerLang}
              />
            ))}
      </section>
    </motion.section>
  )
}
