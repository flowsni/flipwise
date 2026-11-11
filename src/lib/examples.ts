import type { Card } from '../db/types'

/** Whether a card has cached AI example sentences. */
export function hasExamples(card: Pick<Card, 'examples'> | undefined): boolean {
  return !!card?.examples?.items.length
}
