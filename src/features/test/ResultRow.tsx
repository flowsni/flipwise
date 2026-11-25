import { Button, cx, IconCheck, IconX } from '@/design'
import { t } from '@/i18n/ru'
import { typoSegments } from '@/lib'
import type { TestQuestion } from './testGenerator'

export type Status = 'right' | 'almost' | 'wrong'

const MARK = {
  right: <IconCheck size={20} className="text-good" />,
  almost: <span className="text-lg leading-5 font-bold text-sun-ink">≈</span>,
  wrong: <IconX size={20} className="text-bad" />,
}

export function ResultRow({
  q,
  given,
  status,
  matched,
  answerLang,
  onOverride,
}: {
  q: TestQuestion
  given: string
  status: Status
  /** The spelling the typed answer was matched to (almost verdicts). */
  matched?: string
  answerLang: string
  onOverride: () => void
}) {
  const shownGiven =
    q.type === 'truefalse'
      ? given === 'true'
        ? t.test.true
        : given === 'false'
          ? t.test.false
          : ''
      : given
  const correctText =
    q.type === 'truefalse' ? (
      <>
        {q.isTrue ? t.test.true : t.test.false} (<span lang={answerLang}>{q.answer}</span>)
      </>
    ) : (
      <span lang={answerLang}>{q.answer}</span>
    )
  return (
    <li className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
        {MARK[status]}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="font-semibold wrap-anywhere">
          {q.prompt}
          {q.type === 'truefalse' && <span className="font-normal text-ink-2"> — {q.shown}</span>}
        </p>
        <p
          className={cx(
            'text-[0.9375rem] wrap-anywhere',
            status === 'right' && 'text-good',
            status === 'almost' && 'text-sun-ink',
            status === 'wrong' && 'text-bad',
          )}
        >
          {status === 'almost' && matched ? (
            <span lang={answerLang}>
              {typoSegments(given, matched).map((seg, i) =>
                seg.typo ? (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static segments
                  <mark key={i} className="bg-bad-soft text-bad underline decoration-wavy">
                    {seg.text}
                  </mark>
                ) : (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static segments
                  <span key={i}>{seg.text}</span>
                ),
              )}
            </span>
          ) : q.type !== 'truefalse' && given ? (
            <span lang={answerLang}>{given}</span>
          ) : (
            shownGiven || <span className="text-ink-3 italic">{t.test.noAnswer}</span>
          )}
        </p>
        {status !== 'right' && (
          <p className="text-[0.9375rem]">
            <span className="text-ink-2">{t.test.correctAnswer}: </span>
            <span className="font-semibold">{correctText}</span>
          </p>
        )}
        {status === 'wrong' && q.type === 'written' && given.trim() && (
          <Button size="sm" variant="soft" className="mt-1 self-start" onClick={onOverride}>
            {t.test.iWasRight}
          </Button>
        )}
      </div>
    </li>
  )
}
