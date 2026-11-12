import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { NotFound } from '../../app/RouteError'
import { useDeckProgress } from '../../db/hooks'
import { recordAnswer } from '../../db/progress'
import type { AnswerSide, Card, Deck, Progress } from '../../db/types'
import { Button } from '../../design/Button'
import { IconRefresh } from '../../design/icons'
import { Menu } from '../../design/Menu'
import { StudyBar } from '../../design/StudyBar'
import { t } from '../../i18n/ru'
import { useSetting } from '../../lib/storage'
import { StudyScopePicker, useStudyScope } from '../study/StudyScopePicker'
import { type ScopeOptions, scopeCounts, selectStudyCards, usableScope } from '../study/scope'
import { persistSession, useSavedSession } from '../study/useSavedSession'
import { useStudyDeck } from '../study/useStudyDeck'
import { Finished, RoundSummary } from './LearnSummaries'
import {
  acceptLearnSession,
  createLearnState,
  isFinished,
  type LearnState,
  MIN_CARDS,
  nextQuestion,
  overallProgress,
  overrideLastWrong,
  startRound,
  submitAnswer,
} from './learnEngine'
import { type Feedback, QuestionView } from './QuestionView'

export function LearnPage() {
  const { deckId } = useParams()
  const { deck, cards, loading } = useStudyDeck(deckId)
  const progress = useDeckProgress(deckId)
  // MIN_CARDS is about distractors, so it is checked on the deck; a scope may hold one card.
  if (!loading && (!deck || (cards?.length ?? 0) < MIN_CARDS)) return <NotFound />
  if (loading || !deck || !cards || !progress) return null
  return <Learn key={deck.id} deck={deck} cards={cards} progress={progress} />
}

function Learn({
  deck,
  cards,
  progress,
}: {
  deck: Deck
  cards: Card[]
  progress: Map<string, Progress>
}) {
  const navigate = useNavigate()
  const [answerWith, setAnswerWith] = useSetting<AnswerSide>('learn.answerWith', 'definition')
  const [state, setState] = useState<LearnState | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const answerLang = answerWith === 'term' ? deck.termLang : deck.defLang
  const promptLang = answerWith === 'term' ? deck.defLang : deck.termLang

  const session = useSavedSession<LearnState>(deck.id, 'learn', acceptLearnSession)

  // Resume the saved session once it is loaded; otherwise the scope picker is shown first.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once when loading finishes
  useEffect(() => {
    if (!session.ready || state) return
    const saved = session.saved
    if (saved) {
      if (saved.answerWith !== answerWith) setAnswerWith(saved.answerWith)
      // A session saved while feedback was showing already counted that answer: move on.
      // Also re-ask when the pending card was deleted while the session was paused.
      const pendingOk =
        saved.current && !saved.answered && cards.some((c) => c.id === saved.current?.cardId)
      setState(pendingOk || saved.roundOver ? saved : nextQuestion(saved, cards))
    }
  }, [session.ready])

  const persist = useCallback(
    (s: LearnState) => {
      setState(s)
      persistSession(deck.id, 'learn', s, !isFinished(s))
    },
    [deck.id],
  )

  const start = (options: ScopeOptions) => {
    const ids = selectStudyCards(cards, progress, options)
    persist(createLearnState(cards, answerWith, Math.random, {}, ids))
  }

  /** Starts over with the same cards as the current session. */
  const restart = (side: AnswerSide = answerWith) => {
    if (!state) return
    setFeedback(null)
    persist(createLearnState(cards, side, Math.random, {}, state.order))
  }

  const answer = (response: string) => {
    if (!state?.current || feedback) return
    const outcome = submitAnswer(state, response, answerLang)
    const id = state.current.cardId
    recordAnswer(id, deck.id, outcome.correct, outcome.state.stage[id])
    setFeedback({ correct: outcome.correct, match: outcome.match, response, before: state })
    persist(outcome.state)
  }

  const iWasRight = () => {
    if (!feedback) return
    const s = overrideLastWrong(feedback.before)
    const id = feedback.before.current!.cardId
    recordAnswer(id, deck.id, true, s.stage[id])
    setFeedback({ ...feedback, correct: true, match: { verdict: 'correct' } })
    persist(s)
  }

  const advance = useCallback(() => {
    if (!state) return
    setFeedback(null)
    persist(nextQuestion(state, cards))
  }, [state, cards, persist])

  // Wait until a saved session is restored, so the setup screen doesn't flash before it.
  if (!session.ready || (!state && session.saved)) return null
  if (!state) {
    return (
      <div className="flex min-h-dvh flex-col">
        <StudyBar onClose={() => navigate(`/deck/${deck.id}`)} progress={0} />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-safe sm:pt-8">
          <LearnSetup cards={cards} progress={progress} onStart={start} />
        </main>
      </div>
    )
  }

  const finished = isFinished(state)
  const phase = finished ? 'done' : state.roundOver && !feedback ? 'round' : 'question'
  const byId = new Map(cards.map((c) => [c.id, c]))

  return (
    <div className="flex min-h-dvh flex-col">
      <StudyBar
        onClose={() => navigate(`/deck/${deck.id}`)}
        progress={overallProgress(state)}
        label={`${Math.round(overallProgress(state) * 100)}%`}
        menu={
          <Menu
            label={t.study.options}
            sections={[
              {
                title: t.study.answerWith,
                items: [
                  {
                    label: t.study.withDefinition,
                    checked: answerWith === 'definition',
                    onSelect: () => {
                      if (answerWith === 'definition') return
                      setAnswerWith('definition')
                      restart('definition')
                    },
                  },
                  {
                    label: t.study.withTerm,
                    checked: answerWith === 'term',
                    onSelect: () => {
                      if (answerWith === 'term') return
                      setAnswerWith('term')
                      restart('term')
                    },
                  },
                ],
              },
              {
                items: [
                  { label: t.deck.restart, icon: <IconRefresh />, onSelect: () => restart() },
                ],
              },
            ]}
          />
        }
      />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-4 pb-safe sm:pt-10">
        <AnimatePresence mode="wait">
          {phase === 'question' && state.current && (
            <QuestionView
              key={`${state.round.number}-${state.round.answered - (feedback ? 1 : 0)}-${state.current.cardId}`}
              question={state.current}
              promptLang={promptLang}
              answerLang={answerLang}
              feedback={feedback}
              onAnswer={answer}
              onContinue={advance}
              onIWasRight={iWasRight}
            />
          )}
          {phase === 'round' && (
            <RoundSummary
              key={`round-${state.round.number}`}
              number={state.round.number}
              learned={state.round.learned.map((id) => byId.get(id)).filter((c): c is Card => !!c)}
              answerWith={answerWith}
              onNext={() => persist(startRound(state, cards))}
            />
          )}
          {phase === 'done' && (
            <Finished
              key="done"
              count={state.order.length}
              onAgain={() => restart()}
              onDeck={() => navigate(`/deck/${deck.id}`)}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function LearnSetup({
  cards,
  progress,
  onStart,
}: {
  cards: Card[]
  progress: Map<string, Progress>
  onStart: (options: ScopeOptions) => void
}) {
  const { scope, setScope, limit, setLimit } = useStudyScope()
  const counts = scopeCounts(cards, progress)
  const shown = usableScope(scope, counts)
  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={(e) => {
        e.preventDefault()
        onStart({ scope: shown, limit })
      }}
      className="raised mx-auto flex max-w-lg flex-col gap-6 rounded-[1.75rem] p-6"
    >
      <h1 className="text-2xl font-bold tracking-tight">{t.deck.learn}</h1>
      <StudyScopePicker
        counts={counts}
        scope={shown}
        onScope={setScope}
        limit={limit}
        onLimit={setLimit}
      />
      <Button type="submit" variant="primary" size="lg" block>
        {t.scope.start}
      </Button>
    </motion.form>
  )
}
