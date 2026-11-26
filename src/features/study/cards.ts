import type { AnswerSide, Deck } from '@/db'
import type { Rng } from '@/lib'

export const MIN_CARDS = 2

export interface LearnCard {
  id: string
  term: string
  definition: string
}

export function answerOf(card: LearnCard, side: AnswerSide): string {
  return side === 'term' ? card.term : card.definition
}

export function promptOf(card: LearnCard, side: AnswerSide): string {
  return side === 'term' ? card.definition : card.term
}

export function langOf(deck: Deck, side: AnswerSide) {
  return side === 'term' ? deck.termLang : deck.defLang
}

export function promptLangOf(deck: Deck, side: AnswerSide) {
  return side === 'term' ? deck.defLang : deck.termLang
}

/**
 * Picks wrong options from the same deck: unique answers that differ from the correct one,
 * preferring similar length.
 */
export function pickDistractors(
  correct: string,
  pool: readonly string[],
  count: number,
  rng: Rng,
): string[] {
  const key = (s: string) => s.trim().toLowerCase()
  const seen = new Set([key(correct)])
  const candidates: string[] = []
  for (const p of pool) {
    const k = key(p)
    if (!k || seen.has(k)) continue
    seen.add(k)
    candidates.push(p)
  }
  return candidates
    .map((c) => ({
      c,
      score: Math.abs(c.length - correct.length) / Math.max(correct.length, 1) + rng() * 0.6,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map((x) => x.c)
}
