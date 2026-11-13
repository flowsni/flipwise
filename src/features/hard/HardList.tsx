import type { HardCard } from '../../db/hooks'
import { t } from '../../i18n/ru'
import { CardRow, cardListClass } from '../decks/CardRow'

/** Hard cards with their mistakes; each row opens the card in its deck. */
export function HardList({ items, showDeck }: { items: HardCard[]; showDeck?: boolean }) {
  return (
    <ul className={cardListClass}>
      {items.map(({ card, deck, progress }) => (
        <CardRow
          key={card.id}
          card={card}
          deck={deck}
          to={`/deck/${deck.id}?card=${encodeURIComponent(card.id)}`}
          meta={
            <>
              <span className="font-medium text-bad">
                {t.hard.mistakes(progress.wrong, progress.wrong + progress.correct)}
              </span>
              {showDeck && <> · {deck.title}</>}
            </>
          }
        />
      ))}
    </ul>
  )
}
