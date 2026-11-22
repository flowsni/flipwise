import { AnimatePresence } from 'motion/react'
import { useCallback, useState } from 'react'
import { NotFound } from '@/app/RouteError'
import { useBack } from '@/app/useBack'
import {
  type AnswerSide,
  type Card,
  type Deck,
  overrideWrong,
  type Progress,
  recordAnswer,
} from '@/db'
import { IconRefresh, Menu } from '@/design'
import { StudyShell } from '@/features/study/StudyShell'
import { type ScopeOptions, selectStudyCards } from '@/features/study/scope'
import { useRestartUndo } from '@/features/study/useSavedSession'
import { useStudyRoute } from '@/features/study/useStudyRoute'
import { useStudySession } from '@/features/study/useStudySession'
import { langOf } from '@/features/test/testState'
import { t } from '@/i18n/ru'
import { useSetting } from '@/lib'
import { LearnSetup } from './LearnSetup'
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
  roundProgress,
  startRound,
  submitAnswer,
} from './learnEngine'
import { QuestionView } from './QuestionView'
import type { Feedback } from './QuestionView/types'

export function LearnPage() {
  // MIN_CARDS is about distractors, so it is checked on the deck; a scope may hold one card.
  const route = useStudyRoute({ minCards: MIN_CARDS })
  if (route.status === 'missing') return <NotFound />
  if (route.status === 'loading') return null
  const { deck, cards, progress } = route
  return <Learn key={deck.id} deck={deck} cards={cards} progress={progress} />
}

const learnUnfinished = (s: LearnState | null) => !!s && !isFinished(s)

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
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const answerLang = langOf(deck, answerWith)
  const promptLang = answerWith === 'term' ? deck.defLang : deck.termLang

  /** A stored session, made ready to continue. */
  const revive = (saved: LearnState): LearnState => {
    if (saved.answerWith !== answerWith) setAnswerWith(saved.answerWith)
    // A session saved while feedback was showing already counted that answer: move on.
    // Also re-ask when the pending card was deleted while the session was paused.
    const pendingOk =
      saved.current && !saved.answered && cards.some((c) => c.id === saved.current?.cardId)
    return pendingOk || saved.roundOver ? saved : nextQuestion(saved, cards)
  }
  const { state, persist, ready, discarded } = useStudySession<LearnState>(deck.id, 'learn', {
    accept: acceptLearnSession,
    unfinished: learnUnfinished,
    revive,
  })
  const offerUndo = useRestartUndo(discarded, (s) => {
    setFeedback(null)
    persist(revive(s))
  })

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
  if (!ready) return null
  if (!state) {
    return (
      <StudyShell onClose={back}>
        <LearnSetup
          cards={cards}
          progress={progress}
          answerWith={answerWith}
          onAnswerWith={setAnswerWith}
          onStart={start}
        />
      </StudyShell>
    )
  }

  const finished = isFinished(state)
  const round = roundProgress(state)
  const phase = finished ? 'done' : state.roundOver && !feedback ? 'round' : 'question'
  const byId = new Map(cards.map((c) => [c.id, c]))
  // The other side of a card, looked up by the answer text of an option that was picked.
  const translate = (option: string) => {
    const card = cards.find((c) => (answerWith === 'term' ? c.term : c.definition) === option)
    return card && (answerWith === 'term' ? card.definition : card.term)
  }

  return (
    <StudyShell
      roomy
      onClose={back}
      progress={overallProgress(state)}
      label={t.study.roundProgress(state.round.number, round.done, round.total)}
      menu={
        <Menu
          label={t.study.options}
          sections={[
            {
              title: t.study.answerWith,
              items: (['definition', 'term'] as const).map((side) => ({
                label: side === 'definition' ? t.study.withDefinition : t.study.withTerm,
                checked: answerWith === side,
                onSelect: () => {
                  if (answerWith === side) return
                  setAnswerWith(side)
                  restart(side)
                },
              })),
            },
            {
              items: [{ label: t.deck.restart, icon: <IconRefresh />, onSelect: () => restart() }],
            },
          ]}
        />
      }
    >
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
          <Finished key="done" count={state.order.length} onAgain={() => restart()} onDeck={back} />
        )}
      </AnimatePresence>
    </StudyShell>
  )
}
