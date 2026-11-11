import { useLiveQuery } from 'dexie-react-hooks'
import { useDeferredValue, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { db } from '../../db/db'
import { IconButton } from '../../design/Button'
import { inputClass } from '../../design/Field'
import { IconChevronLeft, IconSearch, IconX } from '../../design/icons'
import { TopBar } from '../../design/TopBar'
import { t } from '../../i18n/ru'
import { groupByDeck, searchCards } from '../../lib/search'
import { CardRow } from '../decks/CardRow'

export function SearchPage() {
  const navigate = useNavigate()
  // The query lives in the URL so «Назад» from a found card returns to the same results.
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const deferred = useDeferredValue(query)
  const data = useLiveQuery(async () => {
    const [decks, cards] = await Promise.all([
      db.decks.orderBy('updatedAt').reverse().toArray(),
      db.cards.toArray(),
    ])
    return { decks, cards }
  }, [])
  const hits = useMemo(
    () => (data ? searchCards(data.cards, data.decks, deferred) : []),
    [data, deferred],
  )
  const groups = groupByDeck(hits)
  const setQuery = (q: string) => setParams(q ? { q } : {}, { replace: true })

  return (
    <>
      <TopBar
        left={
          <IconButton label={t.app.back} onClick={() => navigate('/')}>
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${inputClass} min-h-11 rounded-full py-2 pr-11 pl-10 [&::-webkit-search-cancel-button]:hidden`}
            />
            {query && (
              <IconButton
                size="sm"
                label={t.search.clear}
                onClick={() => setQuery('')}
                className="absolute top-1/2 right-0 -translate-y-1/2"
              >
                <IconX size={16} />
              </IconButton>
            )}
          </div>
        }
      />
      <main className="mx-auto max-w-3xl px-4 pt-3 pb-16 sm:px-6">
        {!deferred.trim() && <p className="mt-6 text-center text-ink-2">{t.search.hint}</p>}
        {deferred.trim() && data && (
          <p className="mb-4 text-[0.9375rem] text-ink-2" aria-live="polite">
            {hits.length ? t.search.found(hits.length) : t.search.empty(deferred.trim())}
          </p>
        )}
        {groups.map(({ deck, hits }) => (
          <section key={deck.id} className="mb-8" aria-label={deck.title}>
            <h2 className="mb-2 truncate text-[0.9375rem] font-semibold tracking-tight text-ink-2">
              {deck.title}
            </h2>
            <ul className="flex flex-col gap-2">
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
