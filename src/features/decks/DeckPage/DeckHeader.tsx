import type { Deck } from '@/db'
import { Ring } from '@/design'
import { t } from '@/i18n/ru'
import { languageName } from '@/lib'

export function DeckHeader({
  deck,
  cardCount,
  mastered,
}: {
  deck: Deck
  cardCount: number
  mastered: number
}) {
  return (
    <header className="mb-6 flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-[1.9rem] leading-tight font-[750] tracking-[-0.03em] break-words sm:text-[2.2rem]">
          {deck.title}
        </h1>
        {deck.description && <p className="mt-1 text-ink-2">{deck.description}</p>}
        <p className="mt-2 text-[0.9375rem] text-ink-2">
          {t.plural.cards(cardCount)} · {languageName(deck.termLang)} →{' '}
          {/* One unit: «· B1» must not wrap onto a line of its own. */}
          <span className="whitespace-nowrap">
            {languageName(deck.defLang)} · {deck.level}
          </span>
        </p>
      </div>
      <Ring value={cardCount ? mastered / cardCount : 0} size={60} stroke={6}>
        <span className="text-[0.8125rem] font-semibold">
          {mastered}/{cardCount}
        </span>
      </Ring>
    </header>
  )
}
