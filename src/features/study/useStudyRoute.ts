import { useParams } from 'react-router'
import { useDeckProgress } from '@/db'
import { useStudyDeck } from './useStudyDeck'

/**
 * What a study route (`/deck/:deckId/<mode>`) can render: nothing yet, the 404 page, or the
 * loaded deck. `minCards` is checked on the deck, not on the chosen scope.
 */
export function useStudyRoute({ minCards }: { minCards: number }) {
  const { deckId } = useParams()
  const { deck, cards, cardsById, loading } = useStudyDeck(deckId)
  const progress = useDeckProgress(deckId)
  if (!loading && (!deck || (cards?.length ?? 0) < minCards)) return { status: 'missing' } as const
  if (loading || !deck || !cards || !progress) return { status: 'loading' } as const
  return { status: 'ready', deck, cards, cardsById, progress } as const
}
