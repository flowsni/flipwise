import { motion } from 'motion/react'
import { cx } from '../../design/cx'
import { t } from '../../i18n/ru'
import type { MatchResult } from '../../lib/answerMatch'
import { typoSegments } from '../../lib/answerMatch'

/** Shows the verdict for a typed answer, highlighting a typo when it was "almost" right. */
export function AnswerFeedback({
  match,
  response,
  answer,
  lang,
}: {
  match: MatchResult
  response: string
  answer: string
  lang: string
}) {
  const verdict = match.verdict
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cx(
        'rounded-2xl p-4',
        verdict === 'correct' && 'bg-good-soft',
        verdict === 'almost' && 'bg-sun-soft',
        verdict === 'wrong' && 'bg-bad-soft',
      )}
    >
      <p
        className={cx(
          'font-semibold',
          verdict === 'correct' && 'text-good',
          verdict === 'almost' && 'text-[#7a5400] dark:text-sun',
          verdict === 'wrong' && 'text-bad',
        )}
      >
        {verdict === 'correct'
          ? t.learn.correct
          : verdict === 'almost'
            ? t.learn.almost
            : t.learn.wrong}
      </p>
      {verdict === 'almost' && (
        <>
          <p className="mt-1 text-sm text-ink-2">{t.learn.almostHint}</p>
          <p className="mt-2" lang={lang}>
            <span className="text-sm text-ink-2">{t.learn.yourAnswer}: </span>
            {typoSegments(response, match.matched ?? answer).map((seg, i) =>
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
          </p>
        </>
      )}
      {verdict !== 'correct' && (
        <p className="mt-2" lang={lang}>
          <span className="text-sm text-ink-2">{t.learn.correctAnswer}: </span>
          <span className="font-semibold">{answer}</span>
        </p>
      )}
      {verdict === 'wrong' && response.trim() && (
        <p className="mt-1 text-sm text-ink-2" lang={lang}>
          {t.learn.yourAnswer}: <s>{response}</s>
        </p>
      )}
    </motion.div>
  )
}
