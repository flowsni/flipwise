import type { AnswerSide, Card, Progress } from '@/db'
import { Button } from '@/design'
import { AnswerWithPicker } from '@/features/study/AnswerWithPicker'
import { SetupCard } from '@/features/study/SetupCard'
import { StudyScopePicker, useStudyScope } from '@/features/study/StudyScopePicker'
import { type ScopeOptions, scopeCounts, usableScope } from '@/features/study/scope'
import { t } from '@/i18n/ru'

export function LearnSetup({
  cards,
  progress,
  answerWith,
  onAnswerWith,
  onStart,
}: {
  cards: Card[]
  progress: Map<string, Progress>
  answerWith: AnswerSide
  onAnswerWith: (side: AnswerSide) => void
  onStart: (options: ScopeOptions) => void
}) {
  const { scope, setScope, limit, setLimit } = useStudyScope()
  const counts = scopeCounts(cards, progress)
  const shown = usableScope(scope, counts)
  return (
    <SetupCard title={t.deck.learn} onSubmit={() => onStart({ scope: shown, limit })}>
      <StudyScopePicker
        counts={counts}
        scope={shown}
        onScope={setScope}
        limit={limit}
        onLimit={setLimit}
      />
      <AnswerWithPicker value={answerWith} onChange={onAnswerWith} />
      <Button type="submit" variant="primary" size="lg" block>
        {t.scope.start}
      </Button>
    </SetupCard>
  )
}
