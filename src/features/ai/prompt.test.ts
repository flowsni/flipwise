import { describe, expect, it } from 'vitest'
import { AiError } from './errors'
import {
  buildPrompt,
  ensureMarked,
  isMonolingual,
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
