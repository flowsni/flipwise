/** «Предложения» mode of Flashcards: the cached AI examples become the cards' faces. */

import type { Card, ExampleItem } from '../../db/types'
import type { Rng } from '../../lib/shuffle'

export type FlashContent = 'words' | 'sentences'

/** Whether the card has cached example sentences to study. */
export function hasSentences(card: Pick<Card, 'examples'> | undefined): boolean {
  return !!card?.examples?.items.length
}

/**
 * One random example per card for a round. Cards without examples are left out, so callers
 * pass cards that were already filtered with `hasSentences`.
 */
export function pickSentences(
  cardIds: readonly string[],
  cardsById: ReadonlyMap<string, Pick<Card, 'examples'>>,
  rng: Rng = Math.random,
): Map<string, number> {
  const picked = new Map<string, number>()
  for (const id of cardIds) {
    const items = cardsById.get(id)?.examples?.items
    if (items?.length) picked.set(id, Math.floor(rng() * items.length))
  }
  return picked
}

/**
 * The picked example of a card. Examples regenerated mid-round may be fewer than before: an
 * index that is out of range (or missing) falls back to the first one.
 */
export function sentenceOf(
  card: Pick<Card, 'examples'> | undefined,
  index: number | undefined,
): ExampleItem | undefined {
  const items = card?.examples?.items
  if (!items?.length) return undefined
  return items[index ?? 0] ?? items[0]
}
