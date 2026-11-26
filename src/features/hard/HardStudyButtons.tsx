import type { ReactNode } from 'react'
import { cx, IconBrain, IconCards, MotionLink, pressProps, tones } from '@/design'
import { t } from '@/i18n/ru'

/** Flashcards and Learn over the deck's hard words only; `cardCount` hides Learn below 2 cards. */
export function HardStudyButtons({ deckId, cardCount }: { deckId: string; cardCount?: number }) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      <Pill to={`/deck/${deckId}/flashcards?scope=hard`} tone="coral" icon={<IconCards />}>
        {t.deck.flashcards}
      </Pill>
      {(cardCount === undefined || cardCount >= 2) && (
        <Pill to={`/deck/${deckId}/learn?fresh=1&scope=hard`} tone="plum" icon={<IconBrain />}>
          {t.deck.learn}
        </Pill>
      )}
    </div>
  )
}

function Pill({
  to,
  tone,
  icon,
  children,
}: {
  to: string
  tone: keyof typeof tones
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <MotionLink
      to={to}
      {...pressProps}
      className="raised inline-flex min-h-11 items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-[0.9375rem] font-semibold outline-offset-4"
    >
      <span
        className={cx(
          'grid size-8 place-items-center rounded-full [&>svg]:size-[1.1rem]',
          tones[tone],
        )}
      >
        {icon}
      </span>
      {children}
    </MotionLink>
  )
}
