import { motion } from 'motion/react'
import { useState } from 'react'
import type { AnswerSide } from '../../db/types'
import { Button } from '../../design/Button'
import { Checkbox, Segmented } from '../../design/Field'
import { t } from '../../i18n/ru'
import { useSetting } from '../../lib/storage'
import {
  defaultQuestionCount,
  QUESTION_TYPES,
  type QuestionType,
  type TestConfig,
} from './testGenerator'

export function TestSetup({
  cardCount,
  onStart,
}: {
  cardCount: number
  onStart: (c: TestConfig) => void
}) {
  const [savedTypes, setSavedTypes] = useSetting<QuestionType[]>('test.types', [...QUESTION_TYPES])
  const [answerWith, setAnswerWith] = useSetting<AnswerSide>('test.answerWith', 'definition')
  const [count, setCount] = useState(defaultQuestionCount(cardCount))
  const types = savedTypes.filter((x) => QUESTION_TYPES.includes(x))
  const toggle = (type: QuestionType, on: boolean) =>
    setSavedTypes(on ? [...new Set([...types, type])] : types.filter((x) => x !== type))
  const labels: Record<QuestionType, string> = {
    choice: t.test.choice,
    truefalse: t.test.truefalse,
    written: t.test.written,
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={(e) => {
        e.preventDefault()
        if (types.length) onStart({ count, types, answerWith })
      }}
      className="raised mx-auto flex max-w-lg flex-col gap-6 rounded-[1.75rem] p-6"
    >
      <h1 className="text-2xl font-bold tracking-tight">{t.test.setupTitle}</h1>
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
      <div className="flex flex-col gap-2">
        <span className="text-[0.9375rem] font-medium text-ink-2">{t.study.answerWith}</span>
        <Segmented
          label={t.study.answerWith}
          value={answerWith}
          onChange={setAnswerWith}
          options={[
            { value: 'definition', label: t.study.withDefinition },
            { value: 'term', label: t.study.withTerm },
          ]}
        />
      </div>
      <Button type="submit" variant="primary" size="lg" block disabled={!types.length}>
        {t.test.start}
      </Button>
    </motion.form>
  )
}
