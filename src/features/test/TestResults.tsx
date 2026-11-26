import { motion } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'
import type { Deck } from '@/db'
import { Button, SectionHeader } from '@/design'
import { langOf } from '@/features/study/cards'
import { ResultRing } from '@/features/study/ResultRing'
import { t } from '@/i18n/ru'
import { ResultRow, type Status } from './ResultRow'
import { gradeTest } from './testGenerator'
import type { TestState } from './testState'

const ORDER: Record<Status, number> = { wrong: 0, almost: 1, right: 2 }

export function TestResults({
  deck,
  state,
  onOverride,
  onRetakeMistakes,
  onNew,
}: {
  deck: Deck
  state: TestState
  onOverride: (questionId: string) => void
  onRetakeMistakes: (cardIds: string[]) => void
  onNew: () => void
}) {
  const answerLang = langOf(deck, state.config.answerWith)
  const result = useMemo(
    () => gradeTest(state.questions, state.answers, answerLang, state.overrides),
    [state, answerLang],
  )
  const rows = state.questions
    .map((q) => {
      const item = result.items.find((r) => r.questionId === q.id)
      const status: Status = !item?.correct
        ? 'wrong'
        : item.match?.verdict === 'almost'
          ? 'almost'
          : 'right'
      return { q, status, matched: item?.match?.matched ?? q.answer }
    })
    .sort((x, y) => ORDER[x.status] - ORDER[y.status])
  const count = (s: Status) => rows.filter((r) => r.status === s).length
  const mistakes = rows.filter((r) => r.status === 'wrong').map((r) => r.q)
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
        <ResultRing
          value={result.percent / 100}
          size={150}
          stroke={13}
          color={result.percent >= 80 ? 'var(--fw-good)' : 'var(--fw-coral)'}
        />
        <p className="font-semibold">{t.test.correctOf(result.correct, result.total)}</p>
        <p className="flex flex-wrap justify-center gap-x-4 text-[0.9375rem] text-ink-2">
          <span className="text-good">{t.test.rightCount(count('right'))}</span>
          <span className="text-sun-ink">{t.test.almostCount(count('almost'))}</span>
          <span className="text-bad">{t.test.wrongCount(count('wrong'))}</span>
        </p>
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
        </div>
      </div>

      <section aria-labelledby="answers-title" className="flex flex-col gap-3">
        <SectionHeader id="answers-title" title={t.test.answers} />
        <ul className="flex flex-col gap-3">
          {rows.map(({ q, status, matched }) => (
            <ResultRow
              key={q.id}
              q={q}
              status={status}
              matched={matched}
              given={state.answers[q.id] ?? ''}
              answerLang={answerLang}
              onOverride={() => onOverride(q.id)}
            />
          ))}
        </ul>
      </section>
    </motion.section>
  )
}
