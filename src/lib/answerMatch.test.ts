import { describe, expect, it } from 'vitest'
import {
  answerVariants,
  damerauLevenshtein,
  matchAnswer,
  normalize,
  typoSegments,
} from './answerMatch'

describe('normalize', () => {
  it('lowercases, collapses spaces and replaces ё', () => {
    expect(normalize('  Ёлка   Зелёная ')).toBe('елка зеленая')
  })
  it('removes punctuation and Latin diacritics but keeps й', () => {
    expect(normalize('Café, s’il vous plaît!')).toBe('cafe s il vous plait')
    expect(normalize('Мой край')).toBe('мой край')
  })
  it('strips leading articles per language', () => {
    expect(normalize('The apple', 'en')).toBe('apple')
    expect(normalize('der Hund', 'de')).toBe('hund')
    expect(normalize("l'homme", 'fr')).toBe('homme')
    expect(normalize('los perros', 'es-ES')).toBe('perros')
    expect(normalize('gli amici', 'it')).toBe('amici')
    expect(normalize('the', 'en')).toBe('the')
  })
  it('keeps articles for unknown languages', () => {
    expect(normalize('the apple', 'ru')).toBe('the apple')
  })
})

describe('answerVariants', () => {
  it('splits on / , ; and makes parentheses optional', () => {
    expect(answerVariants('бежать / бегать; мчаться')).toEqual(
      expect.arrayContaining(['бежать', 'бегать', 'мчаться']),
    )
    expect(answerVariants('дом (здание)')).toContain('дом')
  })
})

describe('damerauLevenshtein', () => {
  it('counts transpositions as one edit', () => {
    expect(damerauLevenshtein('house', 'hosue')).toBe(1)
    expect(damerauLevenshtein('kitten', 'sitting')).toBe(3)
    expect(damerauLevenshtein('', 'abc')).toBe(3)
  })
})

describe('matchAnswer', () => {
  it('accepts exact matches after normalization', () => {
    expect(matchAnswer('Apple!', 'the apple', 'en').verdict).toBe('correct')
    expect(matchAnswer('елка', 'Ёлка').verdict).toBe('correct')
  })
  it('accepts any variant', () => {
    expect(matchAnswer('бегать', 'бежать, бегать')).toEqual({
      verdict: 'correct',
      matched: 'бегать',
    })
  })
  it('treats one typo in 4+ letter words as almost', () => {
    expect(matchAnswer('hosue', 'house').verdict).toBe('almost')
    expect(matchAnswer('яблко', 'яблоко').verdict).toBe('almost')
  })
  it('does not forgive typos in short words', () => {
    expect(matchAnswer('cot', 'cat').verdict).toBe('wrong')
  })
  it('rejects empty and wrong answers', () => {
    expect(matchAnswer('  ', 'cat').verdict).toBe('wrong')
    expect(matchAnswer('dog', 'cat').verdict).toBe('wrong')
  })
})

describe('typoSegments', () => {
  it('highlights the differing span', () => {
    expect(typoSegments('hosue', 'house')).toEqual([
      { text: 'ho', typo: false },
      { text: 'su', typo: true },
      { text: 'e', typo: false },
    ])
  })
  it('marks the spot of a missing letter', () => {
    expect(typoSegments('яблко', 'яблоко').some((s) => s.typo)).toBe(true)
  })
})
