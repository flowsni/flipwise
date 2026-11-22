import { motion, useAnimate, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/design/Button'
import { cx } from '@/design/cx'
import { Input } from '@/design/Field'
import { IconCheck } from '@/design/icons'
import { enterSpring } from '@/design/motion'
import { shortcutsBlocked } from '@/design/StudyBar'
import { AnswerFeedback } from '@/features/study/AnswerFeedback'
import { SpeakButton } from '@/features/tts/SpeakButton'
import { t } from '@/i18n/ru'
import type { MatchResult } from '@/lib/answerMatch'
import { fitClass } from '@/lib/textFit'
import type { LearnState } from './learnEngine'

export interface Feedback {
  correct: boolean
  match: MatchResult
  response: string
  /** State before the answer, for «Я был прав». */
  before: LearnState
}

export function QuestionView({
  question,
  promptLang,
  answerLang,
  feedback,
  translate,
  onAnswer,
  onContinue,
  onIWasRight,
}: {
  question: NonNullable<LearnState['current']>
  promptLang: string
  answerLang: string
  feedback: Feedback | null
  /** The other side of the card whose answer text is `option` (to explain a wrong pick). */
  translate: (option: string) => string | undefined
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
      transition={enterSpring}
      className="flex flex-1 flex-col gap-6"
    >
      <div
        className={cx(
          'raised relative flex min-h-44 flex-col rounded-[1.75rem] p-5 sm:min-h-52 sm:p-7',
          // Phones: the question takes the top, the options sit in the thumb zone below.
          question.kind === 'choice' && 'flex-1 sm:flex-none',
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-[0.8125rem] font-semibold tracking-wider text-ink-3 uppercase">
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
        {/* The verdict lives in the card, in a fixed slot: the options below never move. */}
        {question.kind === 'choice' && (
          <div className="flex min-h-16 flex-col items-center gap-1 text-center">
            {feedback && (
              <p
                role="status"
                className={cx('font-semibold', feedback.correct ? 'text-good' : 'text-bad')}
              >
                {feedback.correct ? t.learn.correct : t.learn.wrong}
              </p>
            )}
            {feedback && !feedback.correct && (
              <PickedMeaning picked={feedback.response} translate={translate} lang={answerLang} />
            )}
          </div>
        )}
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
                      'size-7 shrink-0 place-items-center rounded-lg text-[0.9375rem] font-semibold',
                      // The 1–4 hints only make sense where there is a keyboard.
                      state === 'right'
                        ? 'grid bg-good text-white'
                        : 'hidden bg-surface-2 text-ink-2 fine:grid',
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

      {/* Choice: room for «Продолжить» is reserved, so the options above don't jump up. */}
      <div className={cx('flex flex-col gap-3', question.kind === 'choice' && 'min-h-14')}>
        {feedback && question.kind === 'written' && (
          <AnswerFeedback
            match={feedback.match}
            response={feedback.response}
            answer={question.answer}
            lang={answerLang}
          />
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
          <p className="hidden text-center text-[0.8125rem] text-ink-3 md:block">
            {t.learn.pressEnter}
          </p>
        )}
      </div>
    </motion.section>
  )
}

/** «отправление, вылет — departure»: what the wrongly picked option actually means. */
function PickedMeaning({
  picked,
  translate,
  lang,
}: {
  picked: string
  translate: (option: string) => string | undefined
  lang: string
}) {
  const meaning = translate(picked)
  if (!picked || !meaning) return null
  return (
    <p className="text-ink-2">
      <span lang={lang}>{picked}</span> — {meaning}
    </p>
  )
}
