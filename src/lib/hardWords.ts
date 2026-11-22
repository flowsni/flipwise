import type { Progress } from '@/db/types'

const MIN_WRONG = 2
const MIN_RATE = 0.3

export function errorRate(p: Pick<Progress, 'correct' | 'wrong'>): number {
  const total = p.correct + p.wrong
  return total ? p.wrong / total : 0
}

/**
 * The learner struggles with the card: at least two mistakes and at least 30% of answers wrong.
 * Counters never decay, so the rate keeps a word that was later learned well off the list.
 */
export function isHard(p: Pick<Progress, 'correct' | 'wrong'> | undefined): boolean {
  return !!p && p.wrong >= MIN_WRONG && errorRate(p) >= MIN_RATE
}

/** Hard cards, most mistakes first, then the higher error rate. */
export function hardestCards(progress: readonly Progress[]): Progress[] {
  return progress.filter(isHard).sort((a, b) => b.wrong - a.wrong || errorRate(b) - errorRate(a))
}
