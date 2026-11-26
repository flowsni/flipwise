import { NotFound } from '@/app/RouteError'
import { useBack } from '@/app/useBack'
import { type Card, type Deck, overrideWrong, type Progress, recordAnswer } from '@/db'
import { langOf, MIN_CARDS } from '@/features/study/cards'
import { StudyShell } from '@/features/study/StudyShell'
import { useRestartUndo } from '@/features/study/useSavedSession'
import { useStudyRoute } from '@/features/study/useStudyRoute'
import { useStudySession } from '@/features/study/useStudySession'
import { t } from '@/i18n/ru'
import { TestForm } from './TestForm'
import { TestResults } from './TestResults'
import { TestSetup } from './TestSetup'
import { generateTest, gradeTest, isAnswered, type TestConfig } from './testGenerator'
import { acceptTestSession, type TestState } from './testState'

export function TestPage() {
  const route = useStudyRoute({ minCards: MIN_CARDS })
  if (route.status === 'missing') return <NotFound />
  if (route.status === 'loading') return null
  const { deck, cards, progress } = route
  return <TestRunner key={deck.id} deck={deck} cards={cards} progress={progress} />
}

const isTaking = (s: TestState | null) => s?.phase === 'taking'

function TestRunner({
  deck,
  cards,
  progress,
}: {
  deck: Deck
  cards: Card[]
  progress: Map<string, Progress>
}) {
  const back = useBack(`/deck/${deck.id}`)
  const {
    state,
    setState,
    persist: update,
    ready,
    discarded,
  } = useStudySession<TestState>(deck.id, 'test', {
    accept: acceptTestSession,
    unfinished: isTaking,
  })
  useRestartUndo(discarded, update)

  const start = (config: TestConfig, onlyCardIds?: string[]) => {
    const questions = generateTest(cards, config, Math.random, onlyCardIds)
    update({ version: 1, phase: 'taking', config, questions, answers: {}, overrides: {} })
    window.scrollTo({ top: 0 })
  }

  if (!ready) return null

  const answeredCount = state
    ? state.questions.filter((q) => isAnswered(q, state.answers)).length
    : 0

  return (
    <StudyShell
      onClose={back}
      progress={
        state ? (state.phase === 'results' ? 1 : answeredCount / state.questions.length) : undefined
      }
      label={
        state?.phase === 'taking'
          ? t.study.progress(answeredCount, state.questions.length)
          : undefined
      }
    >
      {!state && <TestSetup cards={cards} progress={progress} onStart={start} />}
      {state?.phase === 'taking' && (
        <TestForm
          deck={deck}
          state={state}
          onChange={(answers) => update({ ...state, answers })}
          onSubmit={() => {
            const result = gradeTest(
              state.questions,
              state.answers,
              langOf(deck, state.config.answerWith),
            )
            for (const item of result.items) {
              const q = state.questions.find((x) => x.id === item.questionId)
              if (q) recordAnswer(q.cardId, deck.id, item.correct)
            }
            update({ ...state, phase: 'results' })
            window.scrollTo({ top: 0 })
          }}
        />
      )}
      {state?.phase === 'results' && (
        <TestResults
          deck={deck}
          state={state}
          onOverride={(id) => {
            if (state.overrides[id]) return
            const q = state.questions.find((x) => x.id === id)
            if (q) overrideWrong(q.cardId, deck.id)
            setState({ ...state, overrides: { ...state.overrides, [id]: true } })
          }}
          onRetakeMistakes={(cardIds) => {
            start({ ...state.config, count: cardIds.length }, cardIds)
          }}
          onNew={() => update(null)}
        />
      )}
    </StudyShell>
  )
}
