import { AnimatePresence } from 'motion/react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { NotFound } from '../../app/RouteError'
import { recordAnswer } from '../../db/progress'
import type { AnswerSide, Card, Deck } from '../../db/types'
import { IconRefresh } from '../../design/icons'
import { Menu } from '../../design/Menu'
import { StudyBar } from '../../design/StudyBar'
import { t } from '../../i18n/ru'
import { useSetting } from '../../lib/storage'
import { persistSession, useSavedSession } from '../study/useSavedSession'
import { useStudyDeck } from '../study/useStudyDeck'
import { Finished, RoundSummary } from './LearnSummaries'
import {
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
  if (!loading && (!deck || (cards?.length ?? 0) < MIN_CARDS)) return <NotFound />
  if (loading || !deck || !cards) return null
  return <Learn key={deck.id} deck={deck} cards={cards} />
}

function Learn({ deck, cards }: { deck: Deck; cards: Card[] }) {
  const navigate = useNavigate()
  const [answerWith, setAnswerWith] = useSetting<AnswerSide>('learn.answerWith', 'definition')
  const [state, setState] = useState<LearnState | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const answerLang = answerWith === 'term' ? deck.termLang : deck.defLang
  const promptLang = answerWith === 'term' ? deck.defLang : deck.termLang

  const session = useSavedSession<LearnState>(
    deck.id,
    'learn',
    (s) => s.version === 1 && !!s.order?.length,
  )

  // Resume the saved session once it is loaded, or start a new one.
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
    } else {
      const s = createLearnState(cards, answerWith)
      setState(s)
      persistSession(deck.id, 'learn', s, true)
    }
  }, [session.ready])

  const persist = useCallback(
    (s: LearnState) => {
      setState(s)
      persistSession(deck.id, 'learn', s, !isFinished(s))
    },
    [deck.id],
  )

  const restart = (side: AnswerSide = answerWith) => {
    setFeedback(null)
    persist(createLearnState(cards, side))
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

  if (!state) return null

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
