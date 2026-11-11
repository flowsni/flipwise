import { useNavigate, useSearchParams } from 'react-router'
import { useDeck, useHardCards } from '../../db/hooks'
import { IconButton } from '../../design/Button'
import { IconChevronLeft } from '../../design/icons'
import { TopBar } from '../../design/TopBar'
import { t } from '../../i18n/ru'
import { HardList } from './HardList'

/** «Трудные слова» across all decks, or of one deck with `?deck=<id>`. */
export function HardWordsPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const deckId = params.get('deck') ?? undefined
  const deck = useDeck(deckId)
  const hard = useHardCards(deckId)

  return (
    <>
      <TopBar
        left={
          <IconButton label={t.app.back} onClick={() => navigate(deckId ? `/deck/${deckId}` : '/')}>
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
