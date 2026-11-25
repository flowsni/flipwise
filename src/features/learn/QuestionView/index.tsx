import { motion, useAnimate, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Button, cx, enterSpring, shortcutsBlocked, useWindowKeydown } from '@/design'
import type { LearnState } from '@/features/learn/learnEngine'
import { AnswerFeedback } from '@/features/study/AnswerFeedback'
import { SpeakButton } from '@/features/tts/SpeakButton'
import { t } from '@/i18n/ru'
import { fitClass } from '@/lib'
import { ChoiceOptions } from './ChoiceOptions'
import { FlashAnswer } from './FlashAnswer'
import type { Feedback } from './types'
import { WrittenAnswer } from './WrittenAnswer'

// A flashcard answer is the user's own call, so there is no verdict to read before moving on.
const CONTINUE_DELAY = { flashcard: 250, choice: 750, written: 950 }

const LABELS = {
  choice: t.learn.chooseAnswer,
  written: t.learn.typeAnswer,
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
  const continueRef = useRef<HTMLButtonElement>(null)

  // A flashcard is graded by the user, who has just seen the answer: no shake, nothing to read.
  const flashcard = question.kind === 'flashcard'
  const autoContinue =
    !!feedback && (flashcard || (feedback.correct && feedback.match.verdict === 'correct'))

  // Wrong → shake; correct choice or any flashcard answer → quick auto-advance.
  useEffect(() => {
    if (!feedback) return
    if (!feedback.correct && !flashcard && !reduce && scope.current) {
      animate(scope.current, { x: [0, -12, 12, -8, 8, -3, 0] }, { duration: 0.45 })
    }
    if (autoContinue) {
      const timer = setTimeout(onContinue, CONTINUE_DELAY[question.kind])
      return () => clearTimeout(timer)
    }
    continueRef.current?.focus()
  }, [feedback, autoContinue, flashcard, animate, scope, reduce, onContinue, question.kind])

  // 1–4 pick an option; Enter continues after feedback.
  useWindowKeydown((e) => {
    if (feedback && e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault()
      onContinue()
      return
    }
    if (shortcutsBlocked(e) || feedback || question.kind !== 'choice') return
    const n = Number(e.key)
    const option = question.options?.[n - 1]
    if (option) onAnswer(option)
  })

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, transition: { duration: 0.14 } }}
      transition={enterSpring}
      className="flex flex-1 flex-col gap-6"
    >
      {question.kind !== 'flashcard' && (
        <div
          className={cx(
            'raised relative flex min-h-44 flex-col rounded-[1.75rem] p-5 sm:min-h-52 sm:p-7',
            // Phones: the question takes the top, the options sit in the thumb zone below.
            question.kind === 'choice' && 'flex-1 sm:flex-none',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[0.8125rem] font-semibold tracking-wider text-ink-3 uppercase">
              {LABELS[question.kind]}
            </span>
            <SpeakButton text={question.prompt} lang={promptLang} className="-mr-2" />
          </div>
          <p
            lang={promptLang}
            className={cx(
              'flex flex-1 items-center justify-center py-4 text-center leading-tight font-semibold tracking-tight wrap-anywhere',
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
      )}

      <div ref={scope} className={cx(flashcard && 'flex flex-1 flex-col')}>
        {question.kind === 'flashcard' ? (
          <FlashAnswer
            prompt={question.prompt}
            promptLang={promptLang}
            answer={question.answer}
            answerLang={answerLang}
            feedback={feedback}
            onAnswer={onAnswer}
          />
        ) : question.kind === 'choice' ? (
          <ChoiceOptions
            question={question}
            feedback={feedback}
            answerLang={answerLang}
            onAnswer={onAnswer}
          />
        ) : (
          <WrittenAnswer feedback={feedback} answerLang={answerLang} onAnswer={onAnswer} />
        )}
      </div>

      {/* Choice: room for «Продолжить» is reserved, so the options above don't jump up. */}
      <div
        className={cx(
          'flex flex-col gap-3',
          question.kind === 'choice' && 'min-h-14',
          flashcard && 'hidden',
        )}
      >
        {feedback && question.kind === 'written' && (
          <AnswerFeedback
            match={feedback.match}
            response={feedback.response}
            answer={question.answer}
            lang={answerLang}
          />
        )}
        {feedback && !autoContinue && (
          <>
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
            <p className="hidden text-center text-[0.8125rem] text-ink-3 md:block">
              {t.learn.pressEnter}
            </p>
          </>
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
