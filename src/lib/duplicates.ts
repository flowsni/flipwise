import { normalize } from './answerMatch'

/**
 * For every term, the index of the first earlier term that matches it, or -1. Blank terms
 * never match. Uses the answer normalization, so case, ё/е, punctuation, Latin diacritics and
 * leading articles are ignored: «der See» and «die See» collide. That is fine for a warning —
 * the hint shows the other card and the user decides.
 */
export function findDuplicates(terms: readonly string[], lang?: string): number[] {
  const first = new Map<string, number>()
  return terms.map((term, i) => {
    const key = normalize(term, lang)
    if (!key) return -1
    const seen = first.get(key)
    if (seen !== undefined) return seen
    first.set(key, i)
    return -1
  })
}
