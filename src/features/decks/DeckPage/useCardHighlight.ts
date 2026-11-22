import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Card } from '@/db'

/**
 * Arriving from search (?card=<id>): scroll to the card, flash it, and drop the parameter.
 * Only once the list is on screen (`ready`), otherwise there is nothing to scroll to.
 * Returns the id of the card to highlight.
 */
export function useCardHighlight(cards: Card[] | undefined, ready: boolean): string | null {
  const [params, setParams] = useSearchParams()
  const [highlight, setHighlight] = useState<string | null>(null)
  const target = params.get('card')

  useEffect(() => {
    if (!target || !ready || !cards) return
    setParams({}, { replace: true, preventScrollReset: true })
    if (!cards.some((c) => c.id === target)) return
    setHighlight(target)
    requestAnimationFrame(() =>
      document
        .querySelector(`#deck-cards [data-card="${CSS.escape(target)}"]`)
        ?.scrollIntoView({ block: 'center' }),
    )
  }, [target, ready, cards, setParams])

  // Its own effect: dropping the parameter above re-runs that one and would cancel the timer.
  useEffect(() => {
    if (!highlight) return
    const timer = setTimeout(() => setHighlight(null), 2200)
    return () => clearTimeout(timer)
  }, [highlight])

  return highlight
}
