import { useSearchParams } from 'react-router'
import { useBack } from '@/app/useBack'
import { useDeck, useHardCards } from '@/db'
import { IconButton, IconChevronLeft, TopBar } from '@/design'
import { t } from '@/i18n/ru'
import { HardList } from './HardList'

/** «Трудные слова» across all decks, or of one deck with `?deck=<id>`. */
export function HardWordsPage() {
  const [params] = useSearchParams()
  const deckId = params.get('deck') ?? undefined
  const back = useBack(deckId ? `/deck/${deckId}` : '/')
  const deck = useDeck(deckId)
  const hard = useHardCards(deckId)

  // Wait for both, so the subtitle doesn't change from the hint to the deck title.
  if (deck === undefined || !hard) return null

  return (
    <>
      <TopBar
        left={
          <IconButton label={t.app.back} onClick={back}>
            <IconChevronLeft />
          </IconButton>
        }
      />
      <main className="mx-auto max-w-3xl px-4 pt-2 pb-16 sm:px-6">
        <h1 className="text-[1.9rem] leading-tight font-[750] tracking-[-0.03em] sm:text-[2.2rem]">
          {t.hard.title}
        </h1>
        <p className="mt-1 mb-6 text-ink-2">{deck ? deck.title : t.hard.hint}</p>
        {hard && hard.length === 0 && (
          <p className="rounded-card border border-dashed border-line p-8 text-center text-ink-2">
            {t.hard.empty}
          </p>
        )}
        {hard && hard.length > 0 && <HardList items={hard} showDeck={!deckId} />}
      </main>
    </>
  )
}
