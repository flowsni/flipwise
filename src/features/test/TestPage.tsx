import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { NotFound } from '../../app/RouteError'
import { recordAnswer } from '../../db/progress'
import { clearSession, loadSession, saveSession } from '../../db/sessions'
import type { AnswerSide, Card, Deck } from '../../db/types'
import { Button } from '../../design/Button'
import { cx } from '../../design/cx'
import { Checkbox, Input, Segmented } from '../../design/Field'
import { IconCheck, IconX } from '../../design/icons'
import { CountUp, Ring } from '../../design/Progress'
import { StudyBar } from '../../design/StudyBar'
import { t } from '../../i18n/ru'
import { useSetting } from '../../lib/storage'
import { MIN_CARDS } from '../learn/learnEngine'
import { AnswerFeedback } from '../study/AnswerFeedback'
import { useStudyDeck } from '../study/useStudyDeck'
import { SpeakButton } from '../tts/SpeakButton'
import {
  defaultQuestionCount,
  generateTest,
  gradeTest,
  isAnswered,
  QUESTION_TYPES,
  type QuestionType,
  type TestConfig,
  type TestQuestion,
} from './testGenerator'

interface TestState {
  version: 1
  phase: 'taking' | 'results'
  config: TestConfig
  questions: TestQuestion[]
  answers: Record<string, string>
  overrides: Record<string, boolean>
}

export function TestPage() {
  const { deckId } = useParams()
  const { deck, cards, loading } = useStudyDeck(deckId)
  if (!loading && (!deck || (cards?.length ?? 0) < MIN_CARDS)) return <NotFound />
  if (loading || !deck || !cards) return null
  return <TestRunner key={deck.id} deck={deck} cards={cards} />
}

function TestRunner({ deck, cards }: { deck: Deck; cards: Card[] }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [state, setState] = useState<TestState | null>(null)
  const [ready, setReady] = useState(false)

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once per deck
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const fresh = params.get('fresh') === '1'
      if (fresh) {
        setParams({}, { replace: true })
        await clearSession(deck.id, 'test')
      }
      const saved = fresh ? undefined : await loadSession<TestState>(deck.id, 'test')
      if (cancelled) return
      if (saved?.version === 1 && saved.phase === 'taking' && saved.questions?.length)
        setState(saved)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [deck.id])

  const update = (s: TestState | null) => {
    setState(s)
    if (s?.phase === 'taking') saveSession(deck.id, 'test', s)
    else clearSession(deck.id, 'test')
  }

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
        onClose={() => navigate(`/deck/${deck.id}`)}
        progress={
          state ? (state.phase === 'results' ? 1 : answeredCount / state.questions.length) : 0
        }
        label={
          state?.phase === 'taking'
            ? t.study.progress(answeredCount, state.questions.length)
            : undefined
        }
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-safe sm:pt-8">
        {!state && <Setup cardCount={cards.length} onStart={(c) => start(c)} />}
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
          <Results
            deck={deck}
            state={state}
            onOverride={(id) =>
              setState({ ...state, overrides: { ...state.overrides, [id]: true } })
            }
            onRetakeMistakes={(cardIds) => {
              start({ ...state.config, count: cardIds.length }, cardIds)
            }}
            onNew={() => update(null)}
            onDeck={() => navigate(`/deck/${deck.id}`)}
          />
        )}
      </main>
    </div>
  )
}

function langOf(deck: Deck, side: AnswerSide) {
  return side === 'term' ? deck.termLang : deck.defLang
}

function Setup({ cardCount, onStart }: { cardCount: number; onStart: (c: TestConfig) => void }) {
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

function TestForm({
  deck,
  state,
  onChange,
  onSubmit,
}: {
  deck: Deck
  state: TestState
  onChange: (answers: Record<string, string>) => void
  onSubmit: () => void
}) {
  const answerLang = langOf(deck, state.config.answerWith)
  const promptLang = state.config.answerWith === 'term' ? deck.defLang : deck.termLang
  const set = (id: string, value: string) => onChange({ ...state.answers, [id]: value })
  const unanswered = state.questions.filter((q) => !isAnswered(q, state.answers)).length

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (unanswered && !window.confirm(t.test.unanswered(unanswered))) return
        onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      {state.questions.map((q, i) => (
        <motion.fieldset
          key={q.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 6) * 0.04 } }}
          className="raised flex flex-col gap-4 rounded-[1.5rem] p-5"
        >
          <legend className="sr-only">{t.test.questionN(i + 1, state.questions.length)}</legend>
          <div className="flex items-center justify-between text-[0.8125rem] font-semibold tracking-wider text-ink-3 uppercase">
            <span aria-hidden="true">{t.test.questionN(i + 1, state.questions.length)}</span>
            <SpeakButton text={q.prompt} lang={promptLang} className="-my-2 -mr-2" />
          </div>
          <p
            lang={promptLang}
            className="text-xl leading-snug font-semibold break-words sm:text-2xl"
          >
            {q.prompt}
          </p>

          {q.type === 'choice' && (
            <div className="grid gap-2 sm:grid-cols-2">
              {q.options?.map((option) => (
                <OptionRadio
                  key={option}
                  name={q.id}
                  value={option}
                  checked={state.answers[q.id] === option}
                  onChange={() => set(q.id, option)}
                  lang={answerLang}
                >
                  {option}
                </OptionRadio>
              ))}
            </div>
          )}

          {q.type === 'truefalse' && (
            <>
              <p
                lang={answerLang}
                className="-mt-2 rounded-xl bg-surface-2 px-4 py-3 text-lg break-words"
              >
                {q.shown}
              </p>
              <p className="text-[0.9375rem] text-ink-2">{t.test.isThisRight}</p>
              <div className="grid grid-cols-2 gap-2">
                <OptionRadio
                  name={q.id}
                  value="true"
                  checked={state.answers[q.id] === 'true'}
                  onChange={() => set(q.id, 'true')}
                >
                  {t.test.true}
                </OptionRadio>
                <OptionRadio
                  name={q.id}
                  value="false"
                  checked={state.answers[q.id] === 'false'}
                  onChange={() => set(q.id, 'false')}
                >
                  {t.test.false}
                </OptionRadio>
              </div>
            </>
          )}

          {q.type === 'written' && (
            <Input
              value={state.answers[q.id] ?? ''}
              onChange={(e) => set(q.id, e.target.value)}
              lang={answerLang}
              placeholder={t.learn.answerPlaceholder}
              aria-label={`${t.test.questionN(i + 1, state.questions.length)}: ${q.prompt}`}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onKeyDown={(e) => {
                // Enter moves on instead of submitting the whole test.
                if (e.key !== 'Enter') return
                e.preventDefault()
                const current = e.currentTarget
                const fields = [
                  ...(current.form?.querySelectorAll<HTMLInputElement>('input') ?? []),
                ]
                // First field after this one in document order.
                fields
                  .find(
                    (el) => current.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING,
                  )
                  ?.focus()
              }}
              className="h-12"
            />
          )}
        </motion.fieldset>
      ))}
      <Button type="submit" variant="primary" size="lg" block className="my-4">
        {t.test.submit}
      </Button>
    </form>
  )
}

function OptionRadio({
  name,
  value,
  checked,
  onChange,
  lang,
  children,
}: {
  name: string
  value: string
  checked: boolean
  onChange: () => void
  lang?: string
  children: React.ReactNode
}) {
  return (
    <label
      lang={lang}
      className={cx(
        'flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-2.5 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-plum',
        checked ? 'border-plum bg-plum-soft dark:border-sun' : 'border-line hover:bg-surface-2',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={cx(
          'grid size-5 shrink-0 place-items-center rounded-full border-2',
          checked ? 'border-plum bg-plum dark:border-sun dark:bg-sun' : 'border-ink-3',
        )}
      >
        {checked && <span className="size-2 rounded-full bg-surface" />}
      </span>
      <span className="break-words">{children}</span>
    </label>
  )
}

function Results({
  deck,
  state,
  onOverride,
  onRetakeMistakes,
  onNew,
  onDeck,
}: {
  deck: Deck
  state: TestState
  onOverride: (questionId: string) => void
  onRetakeMistakes: (cardIds: string[]) => void
  onNew: () => void
  onDeck: () => void
}) {
  const answerLang = langOf(deck, state.config.answerWith)
  const result = useMemo(
    () => gradeTest(state.questions, state.answers, answerLang, state.overrides),
    [state, answerLang],
  )
  const mistakes = state.questions.filter(
    (q) => !result.items.find((r) => r.questionId === q.id)?.correct,
  )
  const almost = result.items.filter((r) => r.match?.verdict === 'almost').map((r) => r.questionId)
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6 pb-6"
    >
      <div className="raised flex flex-col items-center gap-3 rounded-[1.75rem] p-6 text-center">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold text-ink-2 outline-none"
        >
          {t.test.resultsTitle}
        </h1>
        <Ring
          value={result.percent / 100}
          size={150}
          stroke={13}
          color={result.percent >= 80 ? 'var(--fw-good)' : 'var(--fw-coral)'}
          animateFromZero
        >
          <span className="text-4xl font-bold">
            <CountUp to={result.percent} suffix="%" />
          </span>
        </Ring>
        <p className="font-semibold">{t.test.correctOf(result.correct, result.total)}</p>
        <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
          {mistakes.length > 0 && (
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              onClick={() => onRetakeMistakes([...new Set(mistakes.map((q) => q.cardId))])}
            >
              {t.test.retakeMistakes}
            </Button>
          )}
          <Button
            variant={mistakes.length ? 'raised' : 'primary'}
            size="lg"
            className="flex-1"
            onClick={onNew}
          >
            {t.test.newTest}
          </Button>
          <Button variant="ghost" size="lg" onClick={onDeck}>
            {t.test.toDeck}
          </Button>
        </div>
      </div>

      <section aria-labelledby="mistakes-title" className="flex flex-col gap-3">
        <h2 id="mistakes-title" className="text-lg font-semibold tracking-tight">
          {t.test.mistakes}
        </h2>
        {mistakes.length === 0 && <p className="text-ink-2">{t.test.noMistakes}</p>}
        {mistakes.map((q) => {
          const given = state.answers[q.id] ?? ''
          const shownGiven =
            q.type === 'truefalse'
              ? given === 'true'
                ? t.test.true
                : given === 'false'
                  ? t.test.false
                  : ''
              : given
          return (
            <div
              key={q.id}
              className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4"
            >
              <p className="font-semibold break-words">
                {q.prompt}
                {q.type === 'truefalse' && (
                  <span className="font-normal text-ink-2"> — {q.shown}</span>
                )}
              </p>
              <p className="flex items-start gap-2 text-[0.9375rem]">
                <IconX size={18} className="mt-0.5 shrink-0 text-bad" />
                <span>
                  <span className="text-ink-2">{t.test.yourAnswer}: </span>
                  {shownGiven || <span className="text-ink-3 italic">{t.test.noAnswer}</span>}
                </span>
              </p>
              <p className="flex items-start gap-2 text-[0.9375rem]">
                <IconCheck size={18} className="mt-0.5 shrink-0 text-good" />
                <span>
                  <span className="text-ink-2">{t.test.correctAnswer}: </span>
                  <span className="font-semibold" lang={answerLang}>
                    {q.type === 'truefalse'
                      ? `${q.isTrue ? t.test.true : t.test.false} (${q.answer})`
                      : q.answer}
                  </span>
                </span>
              </p>
              {q.type === 'written' && given.trim() && (
                <Button
                  size="sm"
                  variant="soft"
                  className="self-start"
                  onClick={() => onOverride(q.id)}
                >
                  {t.test.iWasRight}
                </Button>
              )}
            </div>
          )
        })}
        {almost.length > 0 &&
          state.questions
            .filter((q) => almost.includes(q.id))
            .map((q) => (
              <AnswerFeedback
                key={`almost-${q.id}`}
                match={result.items.find((r) => r.questionId === q.id)!.match!}
                response={state.answers[q.id] ?? ''}
                answer={q.answer}
                lang={answerLang}
              />
            ))}
      </section>
    </motion.section>
  )
}
