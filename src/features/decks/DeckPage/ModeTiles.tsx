import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { StudyMode } from '@/db'
import { cx, IconBrain, IconCards, IconChevronRight, IconClipboard, pressSpring } from '@/design'
import type { SessionProgress } from '@/features/study/sessionProgress'
import { t } from '@/i18n/ru'

export const MotionLink = motion.create(Link)
/** CSS `translate` is its own property, so it doesn't fight motion's transform from `whileTap`. */
const hoverLift = 'transition-[translate] hover:-translate-y-[3px]'

export const tones = {
  coral: 'bg-coral/15 text-primary',
  plum: 'bg-plum-soft text-plum-ink',
  sun: 'bg-sun-soft text-sun-ink',
}

export const pressProps = {
  whileTap: { scale: 0.97, boxShadow: 'var(--fw-shadow-pressed)' },
  transition: pressSpring,
}

export function ModeTiles({
  deckId,
  cardCount,
  learnSession,
  testSession,
}: {
  deckId: string
  cardCount: number
  learnSession: SessionProgress | null
  testSession: SessionProgress | null
}) {
  const enough = cardCount >= 2
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <ModeTile
        to="flashcards"
        deckId={deckId}
        icon={<IconCards />}
        title={t.deck.flashcards}
        hint={t.deck.flashcardsHint}
        tone="coral"
        disabled={!cardCount}
      />
      <ModeTile
        to="learn"
        deckId={deckId}
        icon={<IconBrain />}
        title={t.deck.learn}
        hint={enough ? t.deck.learnHint : t.deck.needCards(2)}
        tone="plum"
        disabled={!enough}
        session={learnSession}
        sessionText={(s) => t.deck.learnProgress(s.round ?? 1, s.done, s.total)}
        restartLabel={t.deck.restartLearn}
      />
      <ModeTile
        to="test"
        deckId={deckId}
        icon={<IconClipboard />}
        title={t.deck.test}
        hint={enough ? t.deck.testHint : t.deck.needCards(2)}
        tone="sun"
        disabled={!enough}
        session={testSession}
        sessionText={(s) => t.deck.testProgress(s.done, s.total)}
        restartLabel={t.deck.restartTest}
      />
    </div>
  )
}

/**
 * Motion starts the tile's press animation from a native `pointerdown` on the tile. Stopping the
 * event on the «Заново» link (natively, before it bubbles up: React's handlers run too late) keeps
 * pressing it from playing the animation of the main «Продолжить» action. Clicks are unaffected.
 */
const stopPress = (e: Event) => e.stopPropagation()
const keepOutOfPress = (el: HTMLAnchorElement | null) =>
  el?.addEventListener('pointerdown', stopPress)

function TileIcon({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return (
    <span
      className={cx(
        'grid size-12 shrink-0 place-items-center rounded-2xl [&>svg]:size-6',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

function TileText({ title, hint }: { title: string; hint: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-[1.1rem] font-semibold tracking-tight">{title}</span>
      <span className="block text-[0.9375rem] text-ink-2">{hint}</span>
    </span>
  )
}

function ModeTile({
  to,
  deckId,
  icon,
  title,
  hint,
  tone,
  disabled,
  session,
  sessionText,
  restartLabel,
}: {
  to: StudyMode | 'flashcards'
  deckId: string
  icon: ReactNode
  title: string
  hint: string
  tone: keyof typeof tones
  disabled?: boolean
  /** Unfinished session of this mode (see `useSessionProgress`); `null`/`undefined` — none. */
  session?: SessionProgress | null
  sessionText?: (progress: SessionProgress) => string | undefined
  restartLabel?: string
}) {
  const base =
    'raised flex items-center gap-3 rounded-card p-4 sm:min-h-36 sm:flex-col sm:items-start sm:justify-between'
  if (disabled) {
    return (
      <div className={cx(base, 'opacity-55')} aria-disabled="true">
        <TileIcon tone={tone}>{icon}</TileIcon>
        <TileText title={title} hint={hint} />
      </div>
    )
  }
  if (!session) {
    return (
      <MotionLink
        to={`/deck/${deckId}/${to}`}
        {...pressProps}
        className={cx(base, hoverLift, 'outline-offset-4')}
      >
        <TileIcon tone={tone}>{icon}</TileIcon>
        <TileText title={title} hint={hint} />
        <IconChevronRight className="text-ink-3 sm:hidden" />
      </MotionLink>
    )
  }
  // Unfinished session: the tile is a container so «Продолжить» and «Заново» are sibling links
  // (no nested anchors). The first link is stretched over the whole tile; the second sits above it.
  return (
    <motion.div
      // Motion makes press targets tabbable unless they have a tabindex; the links inside are
      // the real tab stops, the tile itself must not be a dead one.
      tabIndex={-1}
      {...pressProps}
      className={cx(base, hoverLift, 'relative flex-wrap sm:flex-nowrap')}
    >
      <TileIcon tone={tone}>{icon}</TileIcon>
      <TileText title={title} hint={sessionText?.(session) ?? t.deck.sessionSaved} />
      <span className="flex basis-full flex-wrap items-center gap-2 sm:basis-auto">
        <Link
          to={`/deck/${deckId}/${to}`}
          className="rounded-full bg-primary px-3.5 py-2 text-[0.9375rem] font-semibold text-primary-ink outline-offset-4 after:absolute after:inset-0 after:rounded-card"
        >
          {t.deck.continue}
        </Link>
        <Link
          to={`/deck/${deckId}/${to}?fresh=1`}
          aria-label={restartLabel}
          ref={keepOutOfPress}
          className="relative z-10 rounded-full px-3.5 py-2 text-[0.9375rem] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
        >
          {t.deck.restartShort}
        </Link>
      </span>
    </motion.div>
  )
}
