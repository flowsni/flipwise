import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { NotFound } from '../../app/RouteError'
import { useBack } from '../../app/useBack'
import { useDeckProgress } from '../../db/hooks'
import { overrideWrong, recordAnswer } from '../../db/progress'
import type { AnswerSide, Card, Deck, Progress } from '../../db/types'
import { Button } from '../../design/Button'
import { Segmented } from '../../design/Field'
import { IconRefresh } from '../../design/icons'
import { Menu } from '../../design/Menu'
import { StudyBar } from '../../design/StudyBar'
import { t } from '../../i18n/ru'
import { useSetting } from '../../lib/storage'
import { StudyScopePicker, useStudyScope } from '../study/StudyScopePicker'
import { type ScopeOptions, scopeCounts, selectStudyCards, usableScope } from '../study/scope'
import { persistSession, useRestartUndo, useSavedSession } from '../study/useSavedSession'
import { useStudyDeck } from '../study/useStudyDeck'
import { Finished, RoundSummary } from './LearnSummaries'
import {
  acceptLearnSession,
  createLearnState,
  isFinished,
  isLearned,
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
  const back = useBack(`/deck/${deck.id}`)
  const [answerWith, setAnswerWith] = useSetting<AnswerSide>('learn.answerWith', 'definition')
  const [state, setState] = useState<LearnState | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const answerLang = answerWith === 'term' ? deck.termLang : deck.defLang
  const promptLang = answerWith === 'term' ? deck.defLang : deck.termLang

  const session = useSavedSession<LearnState>(deck.id, 'learn', acceptLearnSession)

  const persist = useCallback(
    (s: LearnState) => {
      setState(s)
      persistSession(deck.id, 'learn', s, !isFinished(s))
    },
    [deck.id],
  )

  /** A stored session, made ready to continue. */
  const revive = (saved: LearnState): LearnState => {
    if (saved.answerWith !== answerWith) setAnswerWith(saved.answerWith)
    // A session saved while feedback was showing already counted that answer: move on.
    // Also re-ask when the pending card was deleted while the session was paused.
    const pendingOk =
      saved.current && !saved.answered && cards.some((c) => c.id === saved.current?.cardId)
    return pendingOk || saved.roundOver ? saved : nextQuestion(saved, cards)
  }
  const offerUndo = useRestartUndo(session.discarded, (s) => {
    setFeedback(null)
    persist(revive(s))
  })

  // Resume the saved session once it is loaded; otherwise the scope picker is shown first.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once when loading finishes
  useEffect(() => {
    if (!session.ready || state) return
    if (session.saved) setState(revive(session.saved))
  }, [session.ready])

  const start = (options: ScopeOptions) => {
    const ids = selectStudyCards(cards, progress, options)
    persist(createLearnState(cards, answerWith, Math.random, {}, ids))
  }

  /** Starts over with the same cards as the current session. */
  const restart = (side: AnswerSide = answerWith) => {
    if (!state) return
    if (!isFinished(state)) offerUndo(state)
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
    overrideWrong(id, deck.id, s.stage[id])
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
        <StudyBar onClose={back} />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-safe sm:pt-8">
          <LearnSetup
            cards={cards}
            progress={progress}
            answerWith={answerWith}
            onAnswerWith={setAnswerWith}
            onStart={start}
          />
        </main>
      </div>
    )
  }

  const finished = isFinished(state)
  const phase = finished ? 'done' : state.roundOver && !feedback ? 'round' : 'question'
  const byId = new Map(cards.map((c) => [c.id, c]))
  // The other side of a card, looked up by the answer text of an option that was picked.
  const translate = (option: string) => {
    const card = cards.find((c) => (answerWith === 'term' ? c.term : c.definition) === option)
    return card && (answerWith === 'term' ? card.definition : card.term)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <StudyBar
        onClose={back}
        progress={overallProgress(state)}
        label={t.study.progress(
          state.order.filter((id) => isLearned(state, id)).length,
          state.order.length,
        )}
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
              translate={translate}
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
              onDeck={back}
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
      <div className="flex flex-col gap-2">
        <span className="text-[0.9375rem] font-medium text-ink-2">{t.study.answerWith}</span>
        <Segmented
          label={t.study.answerWith}
          value={answerWith}
          onChange={onAnswerWith}
          options={[
            { value: 'definition', label: t.study.withDefinition },
            { value: 'term', label: t.study.withTerm },
          ]}
        />
      </div>
      <Button type="submit" variant="primary" size="lg" block>
        {t.scope.start}
      </Button>
    </motion.form>
  )
}
