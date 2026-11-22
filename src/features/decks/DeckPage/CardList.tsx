import { AnimatePresence } from 'motion/react'
import { memo } from 'react'
import { useNavigate } from 'react-router'
import { type Card, type Deck, type Progress, toggleStar } from '@/db'
import {
  Button,
  EmptyState,
  IconEdit,
  IconSparkles,
  IconTrash,
  Menu,
  SectionHeader,
} from '@/design'
import { CardRow, cardListClass } from '@/features/decks/CardRow'
import { StarButton } from '@/features/decks/StarButton'
import { SpeakButton } from '@/features/tts/SpeakButton'
import { t } from '@/i18n/ru'

export function CardList({
  deck,
  cards,
  progress,
  highlight,
  onImport,
  onExamples,
  onDelete,
}: {
  deck: Deck
  cards: Card[]
  progress: Map<string, Progress>
  highlight: string | null
  onImport: () => void
  onExamples: (card: Card) => void
  onDelete: (card: Card) => void
}) {
  const navigate = useNavigate()
  const edit = () => navigate(`/deck/${deck.id}/edit`)
  return (
    <section className="mt-10" aria-labelledby="cards-title">
      <SectionHeader
        id="cards-title"
        className="mb-3"
        title={t.deck.cardsTitle}
        action={
          <Button size="sm" variant="ghost" onClick={edit}>
            <IconEdit size={16} />
            {t.deck.edit}
          </Button>
        }
      />
      {cards.length === 0 ? (
        <EmptyState
          boxed
          text={t.deck.noCards}
          actions={
            <>
              <Button variant="primary" onClick={edit}>
                {t.deck.addCards}
              </Button>
              <Button variant="soft" onClick={onImport}>
                {t.deck.import}
              </Button>
            </>
          }
        />
      ) : (
        <ul id="deck-cards" className={cardListClass}>
          {/* Rows no longer use `layout`, so presence needn't re-render all of them on every update. */}
          <AnimatePresence initial={false} presenceAffectsLayout={false}>
            {cards.map((card) => (
              <DeckCardItem
                key={card.id}
                card={card}
                deck={deck}
                starred={!!progress.get(card.id)?.starred}
                highlighted={highlight === card.id}
                onExamples={onExamples}
                onDelete={onDelete}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}

/** Memoized: starring one card re-renders one row, not the whole list. */
const DeckCardItem = memo(function DeckCardItem({
  card,
  deck,
  starred,
  highlighted,
  onExamples,
  onDelete,
}: {
  card: Card
  deck: Deck
  starred: boolean
  highlighted: boolean
  onExamples: (card: Card) => void
  onDelete: (card: Card) => void
}) {
  return (
    <CardRow card={card} deck={deck} onSelect={() => onExamples(card)} highlighted={highlighted}>
      <StarButton
        term={card.term}
        starred={starred}
        onToggle={() => toggleStar(card.id, deck.id)}
      />
      <SpeakButton text={card.term} lang={deck.termLang} />
      <Menu
        label={`${t.app.more}: ${card.term}`}
        sections={[
          {
            items: [
              {
                label: t.examples.button,
                icon: <IconSparkles />,
                onSelect: () => onExamples(card),
              },
              {
                label: t.deck.deleteCard,
                icon: <IconTrash />,
                danger: true,
                onSelect: () => onDelete(card),
              },
            ],
          },
        ]}
      />
    </CardRow>
  )
})
