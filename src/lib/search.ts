import type { Card, Deck } from '../db/types'
import { normalize } from './answerMatch'

export interface SearchHit {
  card: Card
  deck: Deck
  /** Lower is better: 0 exact, 1 term prefix, 2 definition prefix, 3 term substring, 4 definition substring. */
  rank: number
}

export interface SearchGroup {
  deck: Deck
  hits: SearchHit[]
}

function rankOf(q: string, term: string, definition: string): number {
  if (term === q || definition === q) return 0
  if (term.startsWith(q)) return 1
  if (definition.startsWith(q)) return 2
  if (term.includes(q)) return 3
  if (definition.includes(q)) return 4
  return -1
}

/**
 * Finds cards across all decks by term or definition. Case, ё/е, punctuation and Latin
 * diacritics are ignored. Results are ranked, then kept in deck and card order.
 */
export function searchCards(
  cards: readonly Card[],
  decks: readonly Deck[],
  query: string,
): SearchHit[] {
  // No language: query and text are normalized alike, so articles aren't stripped on one side only.
  const q = normalize(query)
  if (!q) return []
  const deckById = new Map(decks.map((d) => [d.id, d]))
  const deckOrder = new Map(decks.map((d, i) => [d.id, i]))
  const hits: SearchHit[] = []
  for (const card of cards) {
    const deck = deckById.get(card.deckId)
    if (!deck) continue
    const rank = rankOf(q, normalize(card.term), normalize(card.definition))
    if (rank >= 0) hits.push({ card, deck, rank })
  }
  return hits.sort(
    (a, b) =>
      a.rank - b.rank ||
      deckOrder.get(a.deck.id)! - deckOrder.get(b.deck.id)! ||
      a.card.position - b.card.position,
  )
}

/** Groups ranked hits by deck; the deck with the best hit comes first. */
export function groupByDeck(hits: readonly SearchHit[]): SearchGroup[] {
  const groups = new Map<string, SearchGroup>()
  for (const hit of hits) {
    const group = groups.get(hit.deck.id) ?? { deck: hit.deck, hits: [] }
    group.hits.push(hit)
    groups.set(hit.deck.id, group)
  }
  return [...groups.values()]
}

/** Whether a card's term or definition contains the query (same normalization as `searchCards`). */
export function matchesQuery(term: string, definition: string, query: string): boolean {
  const q = normalize(query)
  if (!q) return true
  return normalize(term).includes(q) || normalize(definition).includes(q)
}
