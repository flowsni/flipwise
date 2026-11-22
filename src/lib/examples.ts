import type { Card } from '@/db/types'

export function hasExamples(card: Pick<Card, 'examples'> | undefined): boolean {
  return !!card?.examples?.items.length
}
