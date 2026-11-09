export type TermSeparator = 'tab' | 'comma' | { custom: string }
export type CardSeparator = 'newline' | 'semicolon' | { custom: string }

export interface ImportOptions {
  termSep: TermSeparator
  cardSep: CardSeparator
}

export interface ParsedCard {
  term: string
  definition: string
}

export interface ParseResult {
  cards: ParsedCard[]
  /** Non-empty chunks that had no term/definition separator. */
  skipped: string[]
}

function termSepString(sep: TermSeparator): string {
  if (sep === 'tab') return '\t'
  if (sep === 'comma') return ','
  return sep.custom
}

function splitCards(text: string, sep: CardSeparator): string[] {
  const normalized = text.replace(/\r\n?/g, '\n')
  if (sep === 'newline') return normalized.split('\n')
  if (sep === 'semicolon') return normalized.split(';')
  if (!sep.custom) return [normalized]
  // A custom separator like "\n\n" may be typed literally as \n by users.
  return normalized.split(sep.custom.replace(/\\n/g, '\n'))
}

/** Parses text exported from Quizlet (or typed by hand) into cards. */
export function parseImport(text: string, options: ImportOptions): ParseResult {
  const sep = termSepString(options.termSep).replace(/\\t/g, '\t')
  const cards: ParsedCard[] = []
  const skipped: string[] = []
  for (const rawChunk of splitCards(text, options.cardSep)) {
    const chunk = rawChunk.trim()
    if (!chunk) continue
    const at = sep ? rawChunk.indexOf(sep) : -1
    if (at < 0) {
      skipped.push(chunk)
      continue
    }
    const term = rawChunk.slice(0, at).trim()
    const definition = rawChunk
      .slice(at + sep.length)
      .replace(/\s*\n\s*/g, ' ')
      .trim()
    if (!term || !definition) {
      skipped.push(chunk)
      continue
    }
    cards.push({ term, definition })
  }
  return { cards, skipped }
}

/** Guesses separators: Quizlet's default export uses tab + newline. */
export function guessOptions(text: string): ImportOptions {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (text.includes('\t')) return { termSep: 'tab', cardSep: 'newline' }
  if (lines.length <= 1 && text.includes(';')) return { termSep: 'comma', cardSep: 'semicolon' }
  if (lines.some((l) => l.includes(' - ')))
    return { termSep: { custom: ' - ' }, cardSep: 'newline' }
  return { termSep: 'comma', cardSep: 'newline' }
}
