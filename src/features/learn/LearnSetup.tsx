import type { AnswerSide, Card, Progress } from '@/db'
import { Button, Checkbox } from '@/design'
import { AnswerWithPicker } from '@/features/study/AnswerWithPicker'
import { SetupCard } from '@/features/study/SetupCard'
import { StudyScopePicker, useStudyScope } from '@/features/study/StudyScopePicker'
import { type ScopeOptions, scopeCounts, usableScope } from '@/features/study/scope'
import { t } from '@/i18n/ru'
import { LEARN_TYPES, type LearnType } from './learnEngine'

export const TYPE_LABELS: Record<LearnType, string> = {
  flashcard: t.learn.flashcards,
  choice: t.learn.choice,
  written: t.learn.written,
}

export function LearnSetup({
  cards,
  progress,
  answerWith,
  onAnswerWith,
  types,
  onTypes,
  onStart,
}: {
  cards: Card[]
  progress: Map<string, Progress>
  answerWith: AnswerSide
  onAnswerWith: (side: AnswerSide) => void
  types: LearnType[]
  onTypes: (types: LearnType[]) => void
  onStart: (options: ScopeOptions) => void
}) {
  const { scope, setScope, limit, setLimit } = useStudyScope()
  const counts = scopeCounts(cards, progress)
  const shown = usableScope(scope, counts)
  const enabled = types.filter((x) => LEARN_TYPES.includes(x))
  return (
    <SetupCard
      title={t.deck.learn}
      onSubmit={() => enabled.length && onStart({ scope: shown, limit })}
    >
      <StudyScopePicker
        counts={counts}
        scope={shown}
        onScope={setScope}
        limit={limit}
        onLimit={setLimit}
      />
      <fieldset className="flex flex-col">
        <legend className="mb-1 text-[0.9375rem] font-medium text-ink-2">{t.learn.types}</legend>
        {LEARN_TYPES.map((type) => (
          <Checkbox
            key={type}
            checked={enabled.includes(type)}
            onChange={(on) =>
              onTypes(on ? [...new Set([...enabled, type])] : enabled.filter((x) => x !== type))
            }
          >
            {TYPE_LABELS[type]}
          </Checkbox>
        ))}
        {!enabled.length && <p className="text-[0.9375rem] text-bad">{t.learn.needType}</p>}
      </fieldset>
      <AnswerWithPicker value={answerWith} onChange={onAnswerWith} />
      <Button type="submit" variant="primary" size="lg" block disabled={!enabled.length}>
        {t.scope.start}
      </Button>
    </SetupCard>
  )
}
