import { z } from 'zod'
import type { ExampleItem, Level } from '../../db/types'
import { englishLanguageName } from '../../lib/languages'
import { AiError } from './errors'

export interface ExamplesInput {
  term: string
  definition: string
  termLang: string
  defLang: string
  level: Level
}

const EXAMPLE_COUNT = 3

interface LevelGuide {
  length: string
  grammar: string
  /** What else besides the studied item may appear. */
  vocabulary: string
}

/** Concrete CEFR constraints: models drift towards B2 unless told what a level means. */
export const LEVEL_GUIDE: Record<Level, LevelGuide> = {
  A1: {
    length: '4–8 words',
    grammar: 'present tense only; short simple sentences with one clause; no idioms',
    vocabulary: 'only very common everyday words of level A1',
  },
  A2: {
    length: '5–10 words',
    grammar:
      'present, simple past and "going to" future; at most two clauses joined with and, but or because; no idioms',
    vocabulary: 'only words of level A2 or below',
  },
  B1: {
    length: '7–13 words',
    grammar:
      'past, future and present perfect; simple subordinate clauses (when, if, that, who); common phrasal verbs',
    vocabulary: 'only words of level B1 or below',
  },
  B2: {
    length: '8–16 words',
    grammar: 'any common tense, passive voice, conditionals and relative clauses',
    vocabulary: 'words of level B2 or below; common collocations',
  },
  C1: {
    length: '10–18 words',
    grammar:
      'complex syntax: participle clauses, inversion, nuanced connectors; idioms are welcome',
    vocabulary: 'words of level C1 or below; idiomatic collocations',
  },
  C2: {
    length: 'up to about 20 words',
    grammar: 'anything a fluent native speaker would write, including idioms and subtle register',
    vocabulary: 'any vocabulary, including rare and idiomatic words',
  },
}

/** Prompt lines that pin the sentences to the learner's level. */
function levelRules(level: Level): string[] {
  const g = LEVEL_GUIDE[level]
  return [
    `- Learner level: CEFR ${level}. Sentence length: ${g.length}.`,
    `- Grammar: ${g.grammar}.`,
    `- Vocabulary: apart from the studied item, ${g.vocabulary}.`,
    '- Natural, not textbook-stiff.',
  ]
}

function secondFieldRule(input: Pick<ExamplesInput, 'termLang' | 'defLang'>): string {
  const termLanguage = englishLanguageName(input.termLang)
  const defLanguage = englishLanguageName(input.defLang)
  return isMonolingual(input)
    ? `"translation": a short, simple explanation in ${termLanguage} of what the sentence means (no translation, since the learner studies ${termLanguage} in ${termLanguage}).`
    : `"translation": a natural ${defLanguage} translation of the sentence; wrap the words that translate the studied item in [[double square brackets]] too.`
}

const SYSTEM =
  'You write example sentences for language learners. You always answer with a single json object and nothing else.'

const CONTEXT_RULE =
  '- Each sentence shows a different, everyday context (for example: home, work or study, travel, friends).'
const MARK_RULE =
  '- The studied item may appear in any grammatical form. Wrap exactly that occurrence in [[double square brackets]], once per sentence.'

function sampleItem(mono: boolean) {
  return {
    text: 'I left my [[luggage]] at the hotel.',
    translation: mono ? '…' : 'Я оставил свой [[багаж]] в отеле.',
  }
}

/** JSON schema shared by every provider's structured-output mode. */
export const examplesJsonSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          translation: { type: 'string' },
        },
        required: ['text', 'translation'],
        additionalProperties: false,
      },
    },
  },
  required: ['items'],
  additionalProperties: false,
} as const

const responseSchema = z.object({
  items: z
    .array(z.object({ text: z.string().trim().min(1), translation: z.string().trim() }))
    .min(1),
})

export function isMonolingual(input: Pick<ExamplesInput, 'termLang' | 'defLang'>): boolean {
  return input.termLang.split('-')[0] === input.defLang.split('-')[0]
}

export function buildPrompt(input: ExamplesInput): { system: string; user: string } {
  const termLanguage = englishLanguageName(input.termLang)
  const defLanguage = englishLanguageName(input.defLang)

  const user = [
    `Studied item (${termLanguage}): ${input.term}`,
    `Meaning (${defLanguage}): ${input.definition}`,
    '',
    `Write ${EXAMPLE_COUNT} example sentences in ${termLanguage} that use the studied item in the meaning above.`,
    CONTEXT_RULE,
    ...levelRules(input.level),
    MARK_RULE,
    '',
    'Return json with an "items" array. Each item has:',
    '"text": the sentence with the [[marked]] item.',
    secondFieldRule(input),
    '',
    'Example of the json shape:',
    JSON.stringify({ items: [sampleItem(isMonolingual(input))] }),
  ].join('\n')

  return { system: SYSTEM, user }
}

/** Finds the json object in a model answer; tolerant to code fences and surrounding prose. */
function extractJson(raw: string | null | undefined): unknown {
  if (!raw?.trim()) throw new AiError('invalid', 'empty')
  let text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new AiError('invalid', 'no json')
  text = text.slice(start, end + 1)
  try {
    return JSON.parse(text)
  } catch {
    throw new AiError('invalid', 'bad json')
  }
}

function toItems(items: { text: string; translation: string }[], term: string): ExampleItem[] {
  return items.slice(0, EXAMPLE_COUNT).map((item) => ({
    text: ensureMarked(item.text, term),
    translation: item.translation,
  }))
}

/** Parses and validates the model's json for one card. */
export function parseExamples(raw: string | null | undefined, term: string): ExampleItem[] {
  const parsed = responseSchema.safeParse(extractJson(raw))
  if (!parsed.success) throw new AiError('invalid', 'schema')
  return toItems(parsed.data.items, term)
}

// ── Batches: examples for several cards in one request ──────────────────────────────────────

export interface BatchInput {
  cards: readonly { term: string; definition: string }[]
  termLang: string
  defLang: string
  level: Level
}

export const batchJsonSchema = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          n: { type: 'integer' },
          items: examplesJsonSchema.properties.items,
        },
        required: ['n', 'items'],
        additionalProperties: false,
      },
    },
  },
  required: ['cards'],
  additionalProperties: false,
} as const

export function buildBatchPrompt(input: BatchInput): { system: string; user: string } {
  const termLanguage = englishLanguageName(input.termLang)
  const defLanguage = englishLanguageName(input.defLang)

  const user = [
    `Studied items (${termLanguage}) with their meaning (${defLanguage}), numbered:`,
    ...input.cards.map((c, i) => `${i + 1}. ${c.term} — ${c.definition}`),
    '',
    `For every numbered item, write ${EXAMPLE_COUNT} example sentences in ${termLanguage} that use that item in the meaning given.`,
    CONTEXT_RULE,
    ...levelRules(input.level),
    MARK_RULE,
    '',
    `Return json with a "cards" array: one entry per numbered item, ${input.cards.length} in total. Each entry has:`,
    '"n": the item number from the list above.',
    '"items": an array of sentences. Each sentence has:',
    '"text": the sentence with the [[marked]] item.',
    secondFieldRule(input),
    '',
    'Example of the json shape:',
    JSON.stringify({ cards: [{ n: 1, items: [sampleItem(isMonolingual(input))] }] }),
  ].join('\n')

  return { system: SYSTEM, user }
}

const batchEntrySchema = z.object({ n: z.number().int(), items: z.unknown() })
const batchSchema = z.object({ cards: z.array(z.unknown()) })

export interface BatchResult {
  /** Index in the batch → examples. */
  results: Map<number, ExampleItem[]>
  /** Indexes the answer left out or got wrong; worth one more try. */
  missing: number[]
}

/**
 * Parses a batch answer card by card: a broken entry, an unknown `n` or a skipped card only
 * lands in `missing` and never throws away the rest. A wholly unreadable answer throws.
 */
export function parseBatchExamples(
  raw: string | null | undefined,
  cards: readonly { term: string }[],
): BatchResult {
  const parsed = batchSchema.safeParse(extractJson(raw))
  if (!parsed.success) throw new AiError('invalid', 'schema')
  const results = new Map<number, ExampleItem[]>()
  for (const entry of parsed.data.cards) {
    const e = batchEntrySchema.safeParse(entry)
    if (!e.success) continue
    const index = e.data.n - 1
    const card = cards[index]
    if (!card || results.has(index)) continue
    const items = responseSchema.shape.items.safeParse(e.data.items)
    if (items.success) results.set(index, toItems(items.data, card.term))
  }
  const missing = cards.map((_, i) => i).filter((i) => !results.has(i))
  return { results, missing }
}

/** If the model forgot the [[ ]] markers, mark the first case-insensitive occurrence of the term. */
export function ensureMarked(text: string, term: string): string {
  if (text.includes('[[') && text.includes(']]')) return text
  const needle = term.trim().toLowerCase()
  if (!needle) return text
  const at = text.toLowerCase().indexOf(needle)
  if (at < 0) return text
  return `${text.slice(0, at)}[[${text.slice(at, at + needle.length)}]]${text.slice(at + needle.length)}`
}

export interface MarkedSegment {
  text: string
  mark: boolean
}

/** Splits "a [[b]] c" into segments; rendered as text nodes and <mark>, never as HTML. */
export function parseMarked(text: string): MarkedSegment[] {
  const out: MarkedSegment[] = []
  const re = /\[\[(.+?)\]\]/g
  let last = 0
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), mark: false })
    out.push({ text: m[1]!, mark: true })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), mark: false })
  return out
}

export function stripMarks(text: string): string {
  return text.replace(/\[\[(.+?)\]\]/g, '$1')
}
