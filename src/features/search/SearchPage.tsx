import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useBack } from '@/app/useBack'
import { db } from '@/db/db'
import { useCachedLiveQuery } from '@/db/useCachedLiveQuery'
import { IconButton } from '@/design/Button'
import { inputClass } from '@/design/Field'
import { IconChevronLeft, IconSearch, IconX } from '@/design/icons'
import { TopBar } from '@/design/TopBar'
import { CardRow, cardListClass } from '@/features/decks/CardRow'
import { t } from '@/i18n/ru'
import { groupByDeck, searchCards } from '@/lib/search'

export function SearchPage() {
  const back = useBack('/')
  // The query lives in the URL so «Назад» from a found card returns to the same results.
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  // The field is local and the URL follows after a pause: typing must not re-run the search
  // (and re-mount every row) on each keystroke.
  const [text, setText] = useState(query)
  const data = useCachedLiveQuery('search', async () => {
    const [decks, cards] = await Promise.all([
      db.decks.orderBy('updatedAt').reverse().toArray(),
      db.cards.toArray(),
    ])
    return { decks, cards }
  }, [])
  const hits = useMemo(
    () => (data ? searchCards(data.cards, data.decks, query) : []),
    [data, query],
  )
  const groups = groupByDeck(hits)
  const setQuery = (q: string) =>
    setParams(q ? { q } : {}, { replace: true, preventScrollReset: true })
  // Cleanup cancels the pending update if the user taps a result first.
  // biome-ignore lint/correctness/useExhaustiveDependencies: setParams changes with the URL
  useEffect(() => {
    if (text === query) return
    const timer = setTimeout(() => setQuery(text), 250)
    return () => clearTimeout(timer)
  }, [text, query])

  return (
    <>
      <TopBar
        left={
          <IconButton label={t.app.back} onClick={back}>
            <IconChevronLeft />
          </IconButton>
        }
        center={
          <div className="relative">
            <IconSearch
              size={18}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3"
            />
            <input
              type="search"
              autoFocus
              enterKeyHint="search"
              aria-label={t.search.label}
              placeholder={t.search.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={`${inputClass} min-h-11 rounded-full py-2 pr-11 pl-10 [&::-webkit-search-cancel-button]:hidden`}
            />
            {text && (
              <IconButton
                size="sm"
                label={t.search.clear}
                onClick={() => {
                  setText('')
                  setQuery('')
                }}
                className="absolute top-1/2 right-0 -translate-y-1/2"
              >
                <IconX size={16} />
              </IconButton>
            )}
          </div>
        }
      />
      <main className="mx-auto max-w-3xl px-4 pt-3 pb-16 sm:px-6">
        {!query.trim() && <p className="mt-6 text-center text-ink-2">{t.search.hint}</p>}
        {query.trim() && data && (
          <p className="mb-4 text-[0.9375rem] text-ink-2" aria-live="polite">
            {hits.length ? t.search.found(hits.length) : t.search.empty(query.trim())}
          </p>
        )}
        {groups.map(({ deck, hits }) => (
          <section key={deck.id} className="mb-8" aria-label={deck.title}>
            <h2 className="mb-2 truncate text-[0.9375rem] font-semibold tracking-tight text-ink-2">
              {deck.title}
            </h2>
            <ul className={cardListClass}>
              {hits.map(({ card }) => (
                <CardRow
                  key={card.id}
                  card={card}
                  deck={deck}
                  to={`/deck/${deck.id}?card=${encodeURIComponent(card.id)}`}
                />
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  )
}
