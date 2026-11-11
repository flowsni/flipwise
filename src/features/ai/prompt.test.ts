import { describe, expect, it } from 'vitest'
import { AiError } from './errors'
import {
  buildBatchPrompt,
  buildPrompt,
  ensureMarked,
  isMonolingual,
  LEVEL_GUIDE,
  parseBatchExamples,
  parseExamples,
  parseMarked,
  stripMarks,
} from './prompt'

const input = {
  term: 'luggage',
  definition: 'багаж',
  termLang: 'en',
  defLang: 'ru',
  level: 'B1' as const,
}

describe('buildPrompt', () => {
  it('mentions languages, level, json and markers', () => {
    const { system, user } = buildPrompt(input)
    expect(system).toMatch(/json/)
    expect(user).toContain('English')
    expect(user).toContain('Russian')
    expect(user).toContain('CEFR B1')
    expect(user).toContain('[[double square brackets]]')
    expect(user).toContain('"items"')
  })

  it('asks for an explanation instead of a translation for monolingual decks', () => {
    expect(isMonolingual({ termLang: 'en', defLang: 'en-GB' })).toBe(true)
    const { user } = buildPrompt({ ...input, defLang: 'en' })
    expect(user).toContain('explanation')
    expect(user).not.toContain('natural English translation')
  })
})

describe('levels', () => {
  it('gives A1 and C2 different, concrete constraints', () => {
    const a1 = buildPrompt({ ...input, level: 'A1' }).user
    const c2 = buildPrompt({ ...input, level: 'C2' }).user
    expect(a1).toContain('CEFR A1')
    expect(a1).toContain(LEVEL_GUIDE.A1.length)
    expect(a1).toContain('present tense only')
    expect(c2).toContain(LEVEL_GUIDE.C2.length)
    expect(c2).toContain('idioms')
    expect(a1).not.toContain(LEVEL_GUIDE.C2.length)
  })

  it('has a guide for every level', () => {
    const lengths = Object.values(LEVEL_GUIDE).map((g) => g.length)
    expect(new Set(lengths).size).toBe(6)
  })
})

describe('batches', () => {
  const cards = [
    { term: 'ticket', definition: 'билет' },
    { term: 'luggage', definition: 'багаж' },
    { term: 'gate', definition: 'выход на посадку' },
  ]
  const entry = (n: number, term: string) => ({
    n,
    items: [{ text: `A ${term} here.`, translation: 'перевод' }],
  })

  it('numbers the cards and keeps the level rules', () => {
    const { user } = buildBatchPrompt({ cards, termLang: 'en', defLang: 'ru', level: 'A2' })
    expect(user).toContain('1. ticket — билет')
    expect(user).toContain('3. gate — выход на посадку')
    expect(user).toContain('3 in total')
    expect(user).toContain(LEVEL_GUIDE.A2.length)
    expect(user).toContain('"cards"')
  })

  it('maps entries by n and marks the term', () => {
    const raw = JSON.stringify({
      cards: [entry(2, 'luggage'), entry(1, 'ticket'), entry(3, 'gate')],
    })
    const { results, missing } = parseBatchExamples(raw, cards)
    expect(missing).toEqual([])
    expect(results.get(0)![0]!.text).toBe('A [[ticket]] here.')
    expect(results.get(1)![0]!.text).toBe('A [[luggage]] here.')
  })

  it('reports skipped and broken cards as missing and ignores unknown n', () => {
    const raw = JSON.stringify({
      cards: [entry(1, 'ticket'), { n: 2, items: [] }, entry(7, 'nope'), { foo: 1 }],
    })
    const { results, missing } = parseBatchExamples(`\`\`\`json\n${raw}\n\`\`\``, cards)
    expect([...results.keys()]).toEqual([0])
    expect(missing).toEqual([1, 2])
  })

  it('throws on an unreadable answer', () => {
    for (const raw of ['', '{oops', '{"items": []}']) {
      expect(() => parseBatchExamples(raw, cards)).toThrow(AiError)
    }
  })
})

describe('parseExamples', () => {
  const good = JSON.stringify({
    items: [
      { text: 'Where is my [[luggage]]?', translation: 'Где мой [[багаж]]?' },
      { text: 'The [[luggage]] is heavy.', translation: 'Багаж тяжёлый.' },
      { text: 'Pack your luggage.', translation: 'Собери багаж.' },
      { text: 'Extra one', translation: 'Лишний' },
    ],
  })

  it('validates, trims to 3 and fills in missing markers', () => {
    const items = parseExamples(good, 'luggage')
    expect(items).toHaveLength(3)
    expect(items[2]!.text).toBe('Pack your [[luggage]].')
  })

  it('tolerates code fences and prose around json', () => {
    expect(parseExamples(`Sure!\n\`\`\`json\n${good}\n\`\`\``, 'luggage')).toHaveLength(3)
  })

  it('throws invalid on empty, broken or wrong-shaped answers', () => {
    for (const raw of ['', '{oops', '{"items": []}', '{"foo": 1}']) {
      expect(() => parseExamples(raw, 'x')).toThrow(AiError)
    }
  })
})

describe('markers', () => {
  it('splits marked text into segments', () => {
    expect(parseMarked('I lost my [[bags]] and [[keys]].')).toEqual([
      { text: 'I lost my ', mark: false },
      { text: 'bags', mark: true },
      { text: ' and ', mark: false },
      { text: 'keys', mark: true },
      { text: '.', mark: false },
    ])
    expect(stripMarks('a [[b]] c')).toBe('a b c')
  })

  it('treats markup as plain text', () => {
    expect(parseMarked('<img src=x onerror=alert(1)> [[x]]')[0]!.text).toContain('<img')
  })

  it('marks case-insensitively when the model forgot', () => {
    expect(ensureMarked('Luggage first.', 'luggage')).toBe('[[Luggage]] first.')
    expect(ensureMarked('No match here.', 'luggage')).toBe('No match here.')
  })
})
