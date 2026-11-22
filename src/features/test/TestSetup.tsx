import { useState } from 'react'
import type { AnswerSide, Card, Progress } from '@/db'
import { Button, Checkbox } from '@/design'
import { AnswerWithPicker } from '@/features/study/AnswerWithPicker'
import { SetupCard } from '@/features/study/SetupCard'
import { StudyScopePicker, useStudyScope } from '@/features/study/StudyScopePicker'
import { scopeCounts, selectStudyCards, usableScope } from '@/features/study/scope'
import { t } from '@/i18n/ru'
import { useSetting } from '@/lib'
import {
  defaultQuestionCount,
  QUESTION_TYPES,
  type QuestionType,
  type TestConfig,
} from './testGenerator'

export function TestSetup({
  cards,
  progress,
  onStart,
}: {
  cards: Card[]
  progress: Map<string, Progress>
  /** `cardIds`: the cards to ask about (the chosen scope). */
  onStart: (c: TestConfig, cardIds: string[]) => void
}) {
  const [savedTypes, setSavedTypes] = useSetting<QuestionType[]>('test.types', [...QUESTION_TYPES])
  const [answerWith, setAnswerWith] = useSetting<AnswerSide>('test.answerWith', 'definition')
  const { scope: savedScope, setScope } = useStudyScope()
  const counts = scopeCounts(cards, progress)
  const scope = usableScope(savedScope, counts)
  const cardCount = counts[scope]
  const [count, setCount] = useState(() => defaultQuestionCount(cardCount))
  const types = savedTypes.filter((x) => QUESTION_TYPES.includes(x))
  const toggle = (type: QuestionType, on: boolean) =>
    setSavedTypes(on ? [...new Set([...types, type])] : types.filter((x) => x !== type))
  const labels: Record<QuestionType, string> = {
    choice: t.test.choice,
    truefalse: t.test.truefalse,
    written: t.test.written,
  }

  return (
    <SetupCard
      title={t.test.setupTitle}
      onSubmit={() => {
        if (!types.length) return
        onStart(
          { count, types, answerWith },
          selectStudyCards(cards, progress, { scope, limit: 0 }),
        )
      }}
    >
      <StudyScopePicker
        counts={counts}
        scope={scope}
        onScope={(s) => {
          setScope(s)
          setCount(defaultQuestionCount(counts[s]))
        }}
      />
      <div className="flex flex-col gap-2">
        <label
          htmlFor="test-count"
          className="flex items-baseline justify-between text-[0.9375rem] font-medium text-ink-2"
        >
          {t.test.count}
          <span className="text-lg font-semibold text-ink tabular-nums">{count}</span>
        </label>
        <input
          id="test-count"
          type="range"
          min={1}
          max={cardCount}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="h-11 w-full cursor-pointer accent-[var(--fw-primary)]"
        />
      </div>
      <fieldset className="flex flex-col">
        <legend className="mb-1 text-[0.9375rem] font-medium text-ink-2">{t.test.types}</legend>
        {QUESTION_TYPES.map((type) => (
          <Checkbox key={type} checked={types.includes(type)} onChange={(on) => toggle(type, on)}>
            {labels[type]}
          </Checkbox>
        ))}
        {!types.length && <p className="text-[0.9375rem] text-bad">{t.test.needType}</p>}
      </fieldset>
      <AnswerWithPicker value={answerWith} onChange={setAnswerWith} />
      <Button type="submit" variant="primary" size="lg" block disabled={!types.length}>
        {t.test.start}
      </Button>
    </SetupCard>
  )
}
