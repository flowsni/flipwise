import type { Progress } from '../db/types'

export const HARD_MIN_WRONG = 2
export const HARD_MIN_RATE = 0.3
export const HARD_LIMIT = 50

/** Share of wrong answers, 0..1. */
export function errorRate(p: Pick<Progress, 'correct' | 'wrong'>): number {
  const total = p.correct + p.wrong
  return total ? p.wrong / total : 0
}

/**
 * Cards the learner struggles with: at least two mistakes and at least 30% of answers wrong.
 * Counters never decay, so the rate keeps a word that was later learned well off the list.
 * Most mistakes first, then the higher error rate.
 */
export function hardestCards(
  progress: readonly Progress[],
  { limit = HARD_LIMIT }: { limit?: number } = {},
): Progress[] {
  return progress
    .filter((p) => p.wrong >= HARD_MIN_WRONG && errorRate(p) >= HARD_MIN_RATE)
    .sort((a, b) => b.wrong - a.wrong || errorRate(b) - errorRate(a))
    .slice(0, limit)
}
