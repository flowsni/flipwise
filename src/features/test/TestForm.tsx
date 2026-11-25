import { motion } from 'motion/react'
import { useState } from 'react'
import type { Deck } from '@/db'
import { Button, cx, Input } from '@/design'
import { SpeakButton } from '@/features/tts/SpeakButton'
import { t } from '@/i18n/ru'
import { isAnswered } from './testGenerator'
import { langOf, type TestState } from './testState'

export function TestForm({
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
  const lastWrittenId = state.questions.findLast((q) => q.type === 'written')?.id
  const unanswered = state.questions.filter((q) => !isAnswered(q, state.answers)).length
  // The first press only warns; it is armed for this exact number of unanswered questions.
  const [armedFor, setArmedFor] = useState<number | null>(null)
  const armed = unanswered > 0 && armedFor === unanswered

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (unanswered && !armed) return setArmedFor(unanswered)
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
            className="text-xl leading-snug font-semibold wrap-anywhere sm:text-2xl"
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
                className="-mt-2 rounded-xl bg-surface-2 px-4 py-3 text-lg wrap-anywhere"
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
              enterKeyHint={q.id === lastWrittenId ? 'done' : 'next'}
              spellCheck={false}
              onKeyDown={(e) => {
                // Enter moves on instead of submitting the whole test.
                if (e.key !== 'Enter') return
                e.preventDefault()
                const current = e.currentTarget
                const fields = [
                  ...(current.form?.querySelectorAll<HTMLInputElement>(
                    'input:not([type="radio"])',
                  ) ?? []),
                ]
                // First text field after this one in document order.
                const next = fields.find(
                  (el) => current.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING,
                )
                if (!next) return current.blur()
                // Plain focus() scrolls the field to the keyboard edge; centre it ourselves.
                next.focus({ preventScroll: true })
                next.scrollIntoView({ block: 'center' })
              }}
              className="h-12"
            />
          )}
        </motion.fieldset>
      ))}
      <div className="my-4 flex flex-col gap-2">
        {unanswered > 0 && (
          <p
            role="status"
            className={cx('text-center text-[0.9375rem]', armed ? 'text-bad' : 'text-ink-2')}
          >
            {t.test.unanswered(unanswered)}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" block>
          {armed ? t.test.submitAnyway : t.test.submit}
        </Button>
      </div>
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
      <span className="wrap-anywhere">{children}</span>
    </label>
  )
}
