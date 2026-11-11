import { normalize } from './answerMatch'

/**
 * Duplicate detection for card terms. Uses the answer normalization, so case, ё/е,
 * punctuation, Latin diacritics and leading articles are ignored: «der See» and «die See»
 * collide. That is fine for a warning — the hint shows the other card and the user decides.
 */
export function termKey(term: string, lang?: string): string {
  return normalize(term, lang)
}

/**
 * For every item, the index of the first earlier item with the same term, or -1.
 * Blank terms are never duplicates.
 */
export function findDuplicates(items: readonly { term: string }[], lang?: string): number[] {
  const first = new Map<string, number>()
  return items.map((item, i) => {
    const key = termKey(item.term, lang)
    if (!key) return -1
    const seen = first.get(key)
    if (seen !== undefined) return seen
    first.set(key, i)
    return -1
  })
}

/**
 * Splits incoming cards into new ones and those whose term is already in `existing`
 * (or repeats an earlier incoming card).
 */
export function splitDuplicates<T extends { term: string }>(
  incoming: readonly T[],
  existing: readonly string[],
  lang?: string,
): { fresh: T[]; duplicates: T[] } {
  const seen = new Set(existing.map((t) => termKey(t, lang)).filter(Boolean))
  const fresh: T[] = []
  const duplicates: T[] = []
  for (const card of incoming) {
    const key = termKey(card.term, lang)
    if (key && seen.has(key)) duplicates.push(card)
    else {
      fresh.push(card)
      if (key) seen.add(key)
    }
  }
  return { fresh, duplicates }
}
