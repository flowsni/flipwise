import { AnimatePresence, motion, useAnimate, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { NotFound } from '../../app/RouteError'
import { recordAnswer } from '../../db/progress'
import { clearSession, loadSession, saveSession } from '../../db/sessions'
import type { AnswerSide, Card, Deck } from '../../db/types'
import { Button } from '../../design/Button'
import { Confetti } from '../../design/Confetti'
import { cx } from '../../design/cx'
import { Input } from '../../design/Field'
import { IconCheck, IconRefresh } from '../../design/icons'
import { Menu } from '../../design/Menu'
import { StudyBar, shortcutsBlocked } from '../../design/StudyBar'
import { t } from '../../i18n/ru'
import type { MatchResult } from '../../lib/answerMatch'
import { useSetting } from '../../lib/storage'
import { fitClass } from '../flashcards/SwipeCard'
import { AnswerFeedback } from '../study/AnswerFeedback'
import { useStudyDeck } from '../study/useStudyDeck'
import { SpeakButton } from '../tts/SpeakButton'
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

interface Feedback {
  correct: boolean
  match: MatchResult
  response: string
  /** State before the answer, for «Я был прав». */
  before: LearnState
}

export function LearnPage() {
  const { deckId } = useParams()
  const { deck, cards, loading } = useStudyDeck(deckId)
  if (!loading && (!deck || (cards?.length ?? 0) < MIN_CARDS)) return <NotFound />
  if (loading || !deck || !cards) return null
  return <Learn key={deck.id} deck={deck} cards={cards} />
}

function Learn({ deck, cards }: { deck: Deck; cards: Card[] }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [answerWith, setAnswerWith] = useSetting<AnswerSide>('learn.answerWith', 'definition')
  const [state, setState] = useState<LearnState | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const answerLang = answerWith === 'term' ? deck.termLang : deck.defLang
  const promptLang = answerWith === 'term' ? deck.defLang : deck.termLang

  // Resume a saved session unless "?fresh=1" asks for a new one.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once per deck
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const fresh = params.get('fresh') === '1'
      const saved = fresh ? undefined : await loadSession<LearnState>(deck.id, 'learn')
      if (cancelled) return
      if (fresh) setParams({}, { replace: true })
      if (saved?.version === 1 && saved.order?.length) {
        if (saved.answerWith !== answerWith) setAnswerWith(saved.answerWith)
        // A session saved while feedback was showing already counted that answer: move on.
        const pending = saved.current && saved.round.queue[0] === saved.current.cardId
        setState(pending || saved.roundOver ? saved : nextQuestion(saved, cards))
      } else {
        const s = createLearnState(cards, answerWith)
        setState(s)
        saveSession(deck.id, 'learn', s)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [deck.id])

  const persist = useCallback(
    (s: LearnState) => {
      setState(s)
      if (isFinished(s)) clearSession(deck.id, 'learn')
      else saveSession(deck.id, 'learn', s)
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
                      setAnswerWith('definition')
                      restart('definition')
                    },
                  },
                  {
                    label: t.study.withTerm,
                    checked: answerWith === 'term',
                    onSelect: () => {
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

function QuestionView({
  question,
  promptLang,
  answerLang,
  feedback,
  onAnswer,
  onContinue,
  onIWasRight,
}: {
  question: NonNullable<LearnState['current']>
  promptLang: string
  answerLang: string
  feedback: Feedback | null
  onAnswer: (response: string) => void
  onContinue: () => void
  onIWasRight: () => void
}) {
  const [scope, animate] = useAnimate()
  const reduce = useReducedMotion()
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const continueRef = useRef<HTMLButtonElement>(null)

  // Wrong → shake; correct choice → quick auto-advance.
  useEffect(() => {
    if (!feedback) return
    if (!feedback.correct && !reduce && scope.current) {
      animate(scope.current, { x: [0, -12, 12, -8, 8, -3, 0] }, { duration: 0.45 })
    }
    if (feedback.correct && feedback.match.verdict === 'correct') {
      const timer = setTimeout(onContinue, question.kind === 'choice' ? 750 : 950)
      return () => clearTimeout(timer)
    }
    continueRef.current?.focus()
  }, [feedback, animate, scope, reduce, onContinue, question.kind])

  useEffect(() => {
    if (question.kind === 'written') inputRef.current?.focus()
  }, [question.kind])

  // 1–4 pick an option; Enter continues after feedback.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (feedback && e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        onContinue()
        return
      }
      if (shortcutsBlocked(e) || feedback || question.kind !== 'choice') return
      const n = Number(e.key)
      const option = question.options?.[n - 1]
      if (option) onAnswer(option)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [feedback, question, onAnswer, onContinue])

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.14 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="flex flex-1 flex-col gap-6"
    >
      <div className="raised relative flex min-h-44 flex-col rounded-[1.75rem] p-5 sm:min-h-52 sm:p-7">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-ink-3 uppercase">
            {question.kind === 'choice' ? t.learn.chooseAnswer : t.learn.typeAnswer}
          </span>
          <SpeakButton text={question.prompt} lang={promptLang} className="-mr-2" />
        </div>
        <p
          lang={promptLang}
          className={cx(
            'flex flex-1 items-center justify-center py-4 text-center leading-tight font-semibold tracking-tight break-words',
            fitClass(question.prompt),
          )}
        >
          {question.prompt}
        </p>
      </div>

      <div ref={scope}>
        {question.kind === 'choice' ? (
          <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <legend className="sr-only">{t.learn.chooseAnswer}</legend>
            {question.options?.map((option, i) => {
              const isAnswer = option === question.answer
              const chosen = feedback?.response === option
              const state = !feedback ? 'idle' : isAnswer ? 'right' : chosen ? 'wrong' : 'dim'
              return (
                <motion.button
                  key={option}
                  type="button"
                  disabled={!!feedback}
                  onClick={() => onAnswer(option)}
                  whileTap={{ scale: 0.97 }}
                  animate={
                    state === 'right' && chosen && !reduce ? { scale: [1, 1.04, 1] } : { scale: 1 }
                  }
                  transition={{ duration: 0.35 }}
                  lang={answerLang}
                  className={cx(
                    'flex min-h-16 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[1.05rem] font-medium transition-colors',
                    state === 'idle' && 'raised border-transparent hover:border-line',
                    state === 'right' && 'border-good bg-good-soft',
                    state === 'wrong' && 'border-bad bg-bad-soft',
                    state === 'dim' && 'border-transparent bg-surface opacity-50',
                  )}
                >
                  <span
                    className={cx(
                      'grid size-7 shrink-0 place-items-center rounded-lg text-sm font-semibold',
                      state === 'right' ? 'bg-good text-white' : 'bg-surface-2 text-ink-2',
                    )}
                  >
                    {state === 'right' ? <IconCheck size={16} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="break-words">{option}</span>
                </motion.button>
              )
            })}
          </fieldset>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!feedback && text.trim()) onAnswer(text)
            }}
            className="flex flex-col gap-3"
          >
            <Input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={!!feedback}
              lang={answerLang}
              placeholder={t.learn.answerPlaceholder}
              aria-label={t.learn.typeAnswer}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className={cx(
                'h-14 text-lg',
                feedback?.correct && 'border-good bg-good-soft',
                feedback && !feedback.correct && 'border-bad bg-bad-soft',
              )}
            />
            {!feedback && (
              <div className="flex gap-3">
                <Button variant="ghost" size="lg" onClick={() => onAnswer('')}>
                  {t.learn.dontKnow}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  disabled={!text.trim()}
                >
                  {t.learn.check}
                </Button>
              </div>
            )}
          </form>
        )}
      </div>

      <div aria-live="assertive" className="flex flex-col gap-3">
        {feedback && question.kind === 'written' && (
          <AnswerFeedback
            match={feedback.match}
            response={feedback.response}
            answer={question.answer}
            lang={answerLang}
          />
        )}
        {feedback && question.kind === 'choice' && (
          <p
            className={cx('text-center font-semibold', feedback.correct ? 'text-good' : 'text-bad')}
          >
            {feedback.correct ? t.learn.correct : t.learn.wrong}
          </p>
        )}
        {feedback && !(feedback.correct && feedback.match.verdict === 'correct') && (
          <div className="flex flex-wrap gap-3">
            {!feedback.correct && question.kind === 'written' && feedback.response.trim() && (
              <Button variant="soft" size="lg" onClick={onIWasRight}>
                {t.learn.iWasRight}
              </Button>
            )}
            <Button
              ref={continueRef}
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={onContinue}
            >
              {t.learn.continue}
            </Button>
          </div>
        )}
        {feedback && (
          <p className="hidden text-center text-xs text-ink-3 md:block">{t.learn.pressEnter}</p>
        )}
      </div>
    </motion.section>
  )
}

function RoundSummary({
  number,
  learned,
  answerWith,
  onNext,
}: {
  number: number
  learned: Card[]
  answerWith: AnswerSide
  onNext: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => ref.current?.focus(), [])
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      className="flex flex-1 flex-col gap-6"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t.learn.roundDone(number)}</h1>
        <p className="mt-1 text-ink-2">
          {learned.length ? t.learn.learnedInRound : t.learn.noneLearned}
        </p>
      </div>
      {learned.length > 0 && (
        <ul className="flex flex-col gap-2">
          {learned.map((c, i) => (
            <motion.li
              key={c.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0, transition: { delay: 0.05 * i } }}
              className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <span className="grid size-6 place-items-center rounded-full bg-good text-white">
                <IconCheck size={14} strokeWidth={3} />
              </span>
              <span className="font-semibold">{answerWith === 'term' ? c.definition : c.term}</span>
              <span className="text-ink-2">— {answerWith === 'term' ? c.term : c.definition}</span>
            </motion.li>
          ))}
        </ul>
      )}
      <div className="mt-auto pb-2">
        <Button ref={ref} variant="primary" size="lg" block onClick={onNext}>
          {t.learn.nextRound}
        </Button>
      </div>
    </motion.section>
  )
}

function Finished({
  count,
  onAgain,
  onDeck,
}: {
  count: number
  onAgain: () => void
  onDeck: () => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
    >
      <Confetti />
      <motion.div
        initial={{ rotate: -20, scale: 0.6 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 12, delay: 0.1 }}
        className="grid size-28 place-items-center rounded-full bg-sun-soft text-6xl"
        aria-hidden="true"
      >
        🎉
      </motion.div>
      <h1 className="text-3xl font-bold tracking-tight">{t.learn.finishedTitle}</h1>
      <p className="text-ink-2">{t.learn.finishedText(count)}</p>
      <div className="mt-2 flex w-full max-w-sm flex-col gap-3">
        <Button variant="primary" size="lg" block onClick={onAgain}>
          {t.learn.again}
        </Button>
        <Button variant="raised" size="lg" block onClick={onDeck}>
          {t.learn.toDeck}
        </Button>
      </div>
    </motion.section>
  )
}
