import { useState } from 'react'
import { useParams } from 'react-router'
import { NotFound } from '@/app/RouteError'
import { useBack } from '@/app/useBack'
import {
  type Card,
  type Deck,
  overrideWrong,
  type Progress,
  recordAnswer,
  useDeckProgress,
} from '@/db'
import { StudyBar } from '@/design'
import { MIN_CARDS } from '@/features/learn/learnEngine'
import { persistSession, useRestartUndo, useSavedSession } from '@/features/study/useSavedSession'
import { useStudyDeck } from '@/features/study/useStudyDeck'
import { t } from '@/i18n/ru'
import { TestForm } from './TestForm'
import { TestResults } from './TestResults'
import { TestSetup } from './TestSetup'
import { generateTest, gradeTest, isAnswered, type TestConfig } from './testGenerator'
import { acceptTestSession, langOf, type TestState } from './testState'

export function TestPage() {
  const { deckId } = useParams()
  const { deck, cards, loading } = useStudyDeck(deckId)
  const progress = useDeckProgress(deckId)
  if (!loading && (!deck || (cards?.length ?? 0) < MIN_CARDS)) return <NotFound />
  if (loading || !deck || !cards || !progress) return null
  return <TestRunner key={deck.id} deck={deck} cards={cards} progress={progress} />
}

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
  const [state, setState] = useState<TestState | null>(null)

  const session = useSavedSession<TestState>(deck.id, 'test', acceptTestSession)
  const [restored, setRestored] = useState(false)
  // Show a saved unfinished test once it has been loaded.
  if (session.ready && !restored) {
    setRestored(true)
    if (session.saved) setState(session.saved)
  }
  const ready = session.ready && restored

  const update = (s: TestState | null) => {
    setState(s)
    persistSession(deck.id, 'test', s, s?.phase === 'taking')
  }

  useRestartUndo(session.discarded, (s) => update(s))

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
    <div className="flex min-h-dvh flex-col">
      <StudyBar
        onClose={back}
        progress={
          state
            ? state.phase === 'results'
              ? 1
              : answeredCount / state.questions.length
            : undefined
        }
        label={
          state?.phase === 'taking'
            ? t.study.progress(answeredCount, state.questions.length)
            : undefined
        }
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-safe sm:pt-8">
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
            onDeck={back}
          />
        )}
      </main>
    </div>
  )
}
