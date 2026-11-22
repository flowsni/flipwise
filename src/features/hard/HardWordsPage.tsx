import { Link, useSearchParams } from 'react-router'
import { useBack } from '@/app/useBack'
import { type Deck, type HardCard, useDeck, useHardCards } from '@/db'
import { EmptyState, IconButton, IconChevronLeft, TopBar } from '@/design'
import { t } from '@/i18n/ru'
import { HardList } from './HardList'
import { HardStudyButtons } from './HardStudyButtons'

function byDeck(hard: HardCard[]) {
  const groups = new Map<string, { deck: Deck; items: HardCard[] }>()
  for (const h of hard) {
    const group = groups.get(h.deck.id)
    if (group) group.items.push(h)
    else groups.set(h.deck.id, { deck: h.deck, items: [h] })
  }
  return [...groups.values()].sort((a, b) => b.items.length - a.items.length)
}

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
        {hard.length === 0 && <EmptyState boxed text={t.hard.empty} />}
        {hard.length > 0 && deck && (
          <>
            <HardStudyButtons deckId={deck.id} />
            <HardList items={hard} />
          </>
        )}
        {hard.length > 0 && !deck && (
          <div className="flex flex-col gap-10">
            {byDeck(hard).map(({ deck: { id, title }, items }) => (
              <section key={id} aria-labelledby={`hard-${id}`}>
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h2 id={`hard-${id}`} className="min-w-0 text-lg font-semibold tracking-tight">
                    <Link to={`/deck/${id}`} className="hover:underline">
                      {title}
                    </Link>
                  </h2>
                  <span className="shrink-0 text-[0.9375rem] text-ink-3">
                    {t.plural.cards(items.length)}
                  </span>
                </div>
                <HardStudyButtons deckId={id} />
                <HardList items={items} />
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
