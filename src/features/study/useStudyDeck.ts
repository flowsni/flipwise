import { useMemo } from 'react'
import { useDeck, useDeckCards } from '@/db/hooks'

/** Deck + cards for study screens. `cardsById` stays live (e.g. new AI examples). */
export function useStudyDeck(deckId: string | undefined) {
  const deck = useDeck(deckId)
  const cards = useDeckCards(deckId)
  const cardsById = useMemo(() => new Map((cards ?? []).map((c) => [c.id, c])), [cards])
  return { deck, cards, cardsById, loading: deck === undefined || cards === undefined }
}
