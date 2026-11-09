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

export const EXAMPLE_COUNT = 3

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
  const mono = isMonolingual(input)
  const secondField = mono
    ? `"translation": a short, simple explanation in ${termLanguage} of what the sentence means (no translation, since the learner studies ${termLanguage} in ${termLanguage}).`
    : `"translation": a natural ${defLanguage} translation of the sentence; wrap the words that translate the studied item in [[double square brackets]] too.`

  const system =
    'You write example sentences for language learners. You always answer with a single json object and nothing else.'

  const user = [
    `Studied item (${termLanguage}): ${input.term}`,
    `Meaning (${defLanguage}): ${input.definition}`,
    `Learner level: CEFR ${input.level}.`,
    '',
    `Write ${EXAMPLE_COUNT} example sentences in ${termLanguage} that use the studied item in the meaning above.`,
    '- Each sentence shows a different, everyday context (for example: home, work or study, travel, friends).',
    `- Vocabulary and grammar must fit CEFR ${input.level}; 6–16 words; natural, not textbook-stiff.`,
    '- The studied item may appear in any grammatical form. Wrap exactly that occurrence in [[double square brackets]], once per sentence.',
    '',
    'Return json with an "items" array. Each item has:',
    '"text": the sentence with the [[marked]] item.',
    secondField,
    '',
    'Example of the json shape:',
    JSON.stringify({
      items: [
        {
          text: 'I left my [[luggage]] at the hotel.',
          translation: mono ? '…' : 'Я оставил свой [[багаж]] в отеле.',
        },
      ],
    }),
  ].join('\n')

  return { system, user }
}

/** Parses and validates the model's json; tolerant to code fences and surrounding prose. */
export function parseExamples(raw: string | null | undefined, term: string): ExampleItem[] {
  if (!raw?.trim()) throw new AiError('invalid', 'empty')
  let text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new AiError('invalid', 'no json')
  text = text.slice(start, end + 1)
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new AiError('invalid', 'bad json')
  }
  const parsed = responseSchema.safeParse(json)
  if (!parsed.success) throw new AiError('invalid', 'schema')
  return parsed.data.items.slice(0, EXAMPLE_COUNT).map((item) => ({
    text: ensureMarked(item.text, term),
    translation: item.translation,
  }))
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
