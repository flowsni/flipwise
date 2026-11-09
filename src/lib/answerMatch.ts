/**
 * Answer checking shared by Learn and Test modes.
 *
 * Normalization: case-insensitive, whitespace collapsed, ё→е, punctuation removed,
 * diacritics removed from Latin letters (Cyrillic й/ё are not touched by the diacritics step),
 * leading articles ignored per language. A stored answer may hold several variants separated
 * by "/", "," or ";" — any of them is accepted. One typo (Damerau–Levenshtein ≤ 1) in a word
 * of 4+ letters counts as "almost": accepted, with the typo highlighted.
 */

export type Verdict = 'correct' | 'almost' | 'wrong'

export interface MatchResult {
  verdict: Verdict
  /** The variant of the stored answer that matched (original spelling). */
  matched?: string
}

const ARTICLES: Record<string, string[]> = {
  en: ['a', 'an', 'the'],
  de: ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines'],
  fr: ['le', 'la', 'les', "l'", 'un', 'une', 'des', 'du'],
  es: ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas'],
  it: ['il', 'lo', 'la', 'i', 'gli', 'le', "l'", 'un', 'uno', 'una', "un'"],
  pt: ['o', 'a', 'os', 'as', 'um', 'uma'],
  nl: ['de', 'het', 'een'],
}

function baseLang(lang?: string): string {
  return (lang ?? '').toLowerCase().split(/[-_]/)[0] ?? ''
}

function stripArticle(s: string, lang?: string): string {
  const articles = ARTICLES[baseLang(lang)]
  if (!articles) return s
  for (const article of articles) {
    if (article.endsWith("'")) {
      if (s.startsWith(article) && s.length > article.length) return s.slice(article.length).trim()
    } else if (s.startsWith(`${article} `)) {
      const rest = s.slice(article.length + 1).trim()
      if (rest) return rest
    }
  }
  return s
}

export function normalize(input: string, lang?: string): string {
  let s = input
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
  s = stripArticle(s, lang)
  s = s
    .normalize('NFD')
    // Drop combining marks only after Latin letters: é→e, ü→u; Cyrillic й is recomposed below.
    .replace(/([a-z])\p{M}+/gu, '$1')
    .normalize('NFC')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return s
}

/** Splits a stored answer into accepted variants. Text in parentheses is optional. */
export function answerVariants(answer: string): string[] {
  const parts = answer
    .split(/[/,;]/)
    .map((p) => p.trim())
    .filter(Boolean)
  const all = new Set<string>([answer.trim(), ...parts])
  for (const v of [...all]) {
    const withoutParens = v
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (withoutParens) all.add(withoutParens)
  }
  return [...all].filter(Boolean)
}

/** Optimal string alignment distance (Damerau–Levenshtein with adjacent transpositions). */
export function damerauLevenshtein(a: string, b: string): number {
  const al = a.length
  const bl = b.length
  if (!al) return bl
  if (!bl) return al
  const d: number[][] = Array.from({ length: al + 1 }, (_, i) =>
    Array.from({ length: bl + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  )
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const row = d[i]!
      const prev = d[i - 1]!
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        row[j] = Math.min(row[j]!, d[i - 2]![j - 2]! + 1)
      }
    }
  }
  return d[al]![bl]!
}

export function matchAnswer(input: string, expected: string, lang?: string): MatchResult {
  const given = normalize(input, lang)
  if (!given) {
    // Answers made only of punctuation or symbols ("?", "+") normalize to nothing: compare raw.
    const raw = input.trim()
    return raw && !normalize(expected, lang) && raw === expected.trim()
      ? { verdict: 'correct', matched: expected }
      : { verdict: 'wrong' }
  }
  const variants = answerVariants(expected)
  for (const v of variants) {
    if (normalize(v, lang) === given) return { verdict: 'correct', matched: v }
  }
  for (const v of variants) {
    const target = normalize(v, lang)
    if (target.replace(/ /g, '').length >= 4 && damerauLevenshtein(given, target) <= 1) {
      return { verdict: 'almost', matched: v }
    }
  }
  return { verdict: 'wrong' }
}

export function isAccepted(result: MatchResult): boolean {
  return result.verdict !== 'wrong'
}

/**
 * Splits the user's input into segments so the UI can highlight the typo.
 * Compares case-insensitively; returns the input split around the first differing span.
 */
export function typoSegments(input: string, expected: string): { text: string; typo: boolean }[] {
  const a = input.trim()
  const b = expected.trim()
  const al = a.toLowerCase()
  const bl = b.toLowerCase()
  let start = 0
  while (start < al.length && start < bl.length && al[start] === bl[start]) start++
  let endA = al.length
  let endB = bl.length
  while (endA > start && endB > start && al[endA - 1] === bl[endB - 1]) {
    endA--
    endB--
  }
  if (start === endA) {
    // Missing letter: highlight the neighbouring character so the spot is visible.
    const s = Math.max(0, start - 1)
    const e = Math.min(a.length, start + 1)
    return [
      { text: a.slice(0, s), typo: false },
      { text: a.slice(s, e), typo: true },
      { text: a.slice(e), typo: false },
    ].filter((p) => p.text)
  }
  return [
    { text: a.slice(0, start), typo: false },
    { text: a.slice(start, endA), typo: true },
    { text: a.slice(endA), typo: false },
  ].filter((p) => p.text)
}
