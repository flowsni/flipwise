import { useEffect, useRef, useState } from 'react'
import { Button, cx, Input } from '@/design'
import { t } from '@/i18n/ru'
import type { Feedback } from './types'

export function WrittenAnswer({
  feedback,
  answerLang,
  onAnswer,
}: {
  feedback: Feedback | null
  answerLang: string
  onAnswer: (response: string) => void
}) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  return (
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
  )
}
