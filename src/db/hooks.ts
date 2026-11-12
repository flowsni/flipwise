import { useLiveQuery } from 'dexie-react-hooks'
import { hardestCards } from '../lib/hardWords'
import { db } from './db'
import { getDeckCards } from './decks'
import { isMastered } from './progress'
import type { Card, Deck, Progress } from './types'

export interface DeckSummary {
  deck: Deck
  cardCount: number
  mastered: number
}

export function useDeckSummaries(): DeckSummary[] | undefined {
  return useLiveQuery(async () => {
    const decks = await db.decks.orderBy('updatedAt').reverse().toArray()
    return Promise.all(
      decks.map(async (deck) => {
        const [cardCount, progress] = await Promise.all([
          db.cards.where('deckId').equals(deck.id).count(),
          db.progress.where('deckId').equals(deck.id).toArray(),
        ])
        return {
          deck,
          cardCount,
          mastered: Math.min(cardCount, progress.filter(isMastered).length),
        }
      }),
    )
  }, [])
}

/** `null` when the deck does not exist, `undefined` while loading. */
export function useDeck(deckId: string | undefined): Deck | null | undefined {
  return useLiveQuery(
    async () => (deckId ? ((await db.decks.get(deckId)) ?? null) : null),
    [deckId],
  )
}

export function useDeckCards(deckId: string | undefined) {
  return useLiveQuery(() => (deckId ? getDeckCards(deckId) : []), [deckId])
}

export function useDeckProgress(deckId: string | undefined): Map<string, Progress> | undefined {
  return useLiveQuery(async () => {
    if (!deckId) return new Map()
    const rows = await db.progress.where('deckId').equals(deckId).toArray()
    return new Map(rows.map((p) => [p.cardId, p]))
  }, [deckId])
}

export function useDeckLanguages(): string[] {
  return (
    useLiveQuery(async () => {
      const decks = await db.decks.toArray()
      return [...new Set(decks.flatMap((d) => [d.termLang, d.defLang]))]
    }, []) ?? []
  )
}

export interface HardCard {
  card: Card
  deck: Deck
  progress: Progress
}

/** «Трудные слова» of one deck, or of all decks when `deckId` is omitted. */
export function useHardCards(deckId?: string): HardCard[] | undefined {
  return useLiveQuery(async () => {
    const rows = deckId
      ? await db.progress.where('deckId').equals(deckId).toArray()
      : await db.progress.toArray()
    const hard = hardestCards(rows)
    const [cards, decks] = await Promise.all([
      db.cards.bulkGet(hard.map((p) => p.cardId)),
      db.decks.bulkGet([...new Set(hard.map((p) => p.deckId))]),
    ])
    const deckById = new Map(decks.filter((d): d is Deck => !!d).map((d) => [d.id, d]))
    return hard.flatMap((progress, i) => {
      const card = cards[i]
      const deck = deckById.get(progress.deckId)
      return card && deck ? [{ card, deck, progress }] : []
    })
  }, [deckId])
}
