import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import { NotFound } from '@/app/RouteError'
import { useBack } from '@/app/useBack'
import {
  appendCards,
  type Card,
  deleteCard,
  isMastered,
  useDeck,
  useDeckCards,
  useDeckProgress,
  useHardCards,
} from '@/db'
import { IconButton, IconChevronLeft, SectionHeader, TopBar, useToast } from '@/design'
import { BulkExamplesSheet } from '@/features/ai/BulkExamplesSheet'
import { ExamplesSheet } from '@/features/ai/ExamplesSheet'
import { ImportSheet } from '@/features/decks/ImportSheet'
import { HardList } from '@/features/hard/HardList'
import { useSessionProgress } from '@/features/study/useSessionProgress'
import { t } from '@/i18n/ru'
import { MAX_CARDS } from '@/lib'
import { CardList } from './CardList'
import { DeckHeader } from './DeckHeader'
import { DeckMenu } from './DeckMenu'
import { ModeTiles } from './ModeTiles'
import { useCardHighlight } from './useCardHighlight'
import { useUndoableDelete } from './useUndoableDelete'

/** Hard cards shown on the deck page; the rest are one tap away. */
const HARD_PREVIEW = 5

export function DeckPage() {
  const { deckId } = useParams()
  const deck = useDeck(deckId)
  const cards = useDeckCards(deckId)
  const progress = useDeckProgress(deckId)
  const back = useBack('/')
  const toast = useToast()
  const [importOpen, setImportOpen] = useState(false)
  const [examplesFor, setExamplesFor] = useState<Card | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const learnSession = useSessionProgress(deckId, 'learn')
  const testSession = useSessionProgress(deckId, 'test')
  const hard = useHardCards(deckId)
  // The page renders nothing until all of this has loaded: blocks that arrive one by one shift
  // the list down.
  const ready =
    !!deck &&
    !!cards &&
    !!progress &&
    hard !== undefined &&
    learnSession !== undefined &&
    testSession !== undefined
  const highlight = useCardHighlight(cards, ready)

  const deleteWithUndo = useUndoableDelete()
  const onDeleteCard = useCallback(
    (card: Card) => deleteWithUndo(() => deleteCard(card.id), t.deck.cardDeleted),
    [deleteWithUndo],
  )

  if (deck === null) return <NotFound />
  if (!ready || !deck || !cards || !progress || !hard) return null

  const mastered = cards.filter((c) => isMastered(progress.get(c.id))).length

  return (
    <>
      <TopBar
        left={
          <IconButton label={t.app.back} onClick={back}>
            <IconChevronLeft />
          </IconButton>
        }
        right={
          <DeckMenu
            deck={deck}
            hasCards={cards.length > 0}
            onImport={() => setImportOpen(true)}
            onBulk={() => setBulkOpen(true)}
          />
        }
      />

      <main className="mx-auto max-w-3xl px-4 pt-2 pb-16 sm:px-6">
        <DeckHeader deck={deck} cardCount={cards.length} mastered={mastered} />
        <ModeTiles
          deckId={deck.id}
          cardCount={cards.length}
          learnSession={learnSession}
          testSession={testSession}
        />

        {!!hard.length && (
          <section className="mt-10" aria-labelledby="hard-title">
            <SectionHeader
              id="hard-title"
              className="mb-3"
              title={t.hard.title}
              action={
                hard.length > HARD_PREVIEW && (
                  <Link
                    to={`/hard?deck=${deck.id}`}
                    className="inline-flex min-h-11 items-center rounded-xl px-3 text-[0.9375rem] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
                  >
                    {t.hard.showAll(hard.length)}
                  </Link>
                )
              }
            />
            <HardList items={hard.slice(0, HARD_PREVIEW)} />
          </section>
        )}

        <CardList
          deck={deck}
          cards={cards}
          progress={progress}
          highlight={highlight}
          onImport={() => setImportOpen(true)}
          onExamples={setExamplesFor}
          onDelete={onDeleteCard}
        />
      </main>

      <ImportSheet
        open={importOpen}
        existingTerms={cards.map((c) => c.term)}
        lang={deck.termLang}
        room={MAX_CARDS - cards.length}
        onClose={() => setImportOpen(false)}
        onImport={async (parsed) => {
          await appendCards(deck.id, parsed)
          toast.show({ message: t.import.added(parsed.length) })
        }}
      />
      <ExamplesSheet card={examplesFor} deck={deck} onClose={() => setExamplesFor(null)} />
      <BulkExamplesSheet
        open={bulkOpen}
        deck={deck}
        cards={cards}
        onClose={() => setBulkOpen(false)}
      />
    </>
  )
}
