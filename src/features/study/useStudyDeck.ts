import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { getDeckCards } from '../../db/decks'
import { useDeck } from '../../db/hooks'
import type { Card } from '../../db/types'

/** Deck + cards for study screens. `cardsById` stays live (e.g. new AI examples). */
export function useStudyDeck(deckId: string | undefined) {
  const deck = useDeck(deckId)
  const cards = useLiveQuery(
    () => (deckId ? getDeckCards(deckId) : Promise.resolve([] as Card[])),
    [deckId],
  )
  const cardsById = useMemo(() => new Map((cards ?? []).map((c) => [c.id, c])), [cards])
  return { deck, cards, cardsById, loading: deck === undefined || cards === undefined }
}
