import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { Button, cx, flipSpring, shortcutsBlocked, useWindowKeydown } from '@/design'
import { SpeakButton } from '@/features/tts/SpeakButton'
import { t } from '@/i18n/ru'
import { fitClass } from '@/lib'
import type { Feedback } from './types'

export function FlashAnswer({
  prompt,
  promptLang,
  answer,
  answerLang,
  feedback,
  onAnswer,
}: {
  prompt: string
  promptLang: string
  answer: string
  answerLang: string
  feedback: Feedback | null
  onAnswer: (response: string) => void
}) {
  const reduce = useReducedMotion()
  const [flipped, setFlipped] = useState(false)
  const [seen, setSeen] = useState(false)
  const back = flipped || !!feedback
  const canAnswer = (seen || back) && !feedback

  const flip = () => {
    if (feedback) return
    setFlipped(!flipped)
    setSeen(true)
  }

  useWindowKeydown((e) => {
    if (shortcutsBlocked(e) || feedback) return
    // A focused button handles Space itself; reacting too would flip and answer at once.
    if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault()
      flip()
    } else if (canAnswer && (e.key === '1' || e.key === '2')) {
      onAnswer(e.key === '2' ? 'know' : 'dontknow')
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="relative h-64 [perspective:1600px] sm:h-72">
        <motion.div
          role="button"
          tabIndex={0}
          data-autofocus
          aria-label={`${t.flash.flip}. ${back ? answer : prompt}`}
          onClick={flip}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              flip()
            }
          }}
          className="relative size-full cursor-pointer rounded-[1.75rem] preserve-3d outline-offset-4"
          initial={false}
          animate={{ rotateY: back ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : flipSpring}
        >
          <Face
            text={prompt}
            lang={promptLang}
            label={t.learn.flashcardLabel}
            hint={t.flash.tapToFlip}
          />
          <Face back text={answer} lang={answerLang} label={t.learn.correctAnswer} />
        </motion.div>
        <SpeakButton
          text={back ? answer : prompt}
          lang={back ? answerLang : promptLang}
          className="absolute top-3 right-3"
        />
      </div>
      <div className="flex min-h-14 gap-3">
        {canAnswer && (
          <>
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              onClick={() => onAnswer('dontknow')}
            >
              {t.learn.dontKnow}
            </Button>
            <Button variant="primary" size="lg" className="flex-1" onClick={() => onAnswer('know')}>
              {t.learn.know}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function Face({
  text,
  lang,
  label,
  hint,
  back,
}: {
  text: string
  lang: string
  label: string
  hint?: string
  back?: boolean
}) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'raised absolute inset-0 flex flex-col overflow-hidden rounded-[1.75rem] p-5 backface-hidden sm:p-7',
        back && '[transform:rotateY(180deg)]',
      )}
    >
      <span className="text-[0.8125rem] font-semibold tracking-wider text-ink-3 uppercase">
        {label}
      </span>
      <span
        lang={lang}
        className={cx(
          'flex flex-1 items-center justify-center px-2 text-center leading-tight font-semibold tracking-tight break-words',
          fitClass(text),
        )}
      >
        {text}
      </span>
      {hint && <span className="text-center text-[0.8125rem] text-ink-3">{hint}</span>}
    </span>
  )
}
