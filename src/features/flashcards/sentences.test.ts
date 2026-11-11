import { describe, expect, it } from 'vitest'
import type { CardExamples } from '../../db/types'
import { seededRng } from '../../lib/shuffle'
import { pickSentences, sentenceOf } from './sentences'

function examples(n: number): CardExamples {
  return {
    items: Array.from({ length: n }, (_, i) => ({ text: `s${i} [[w]]`, translation: `t${i}` })),
    provider: 'anthropic',
    model: 'm',
    createdAt: 1,
  }
}

describe('pickSentences', () => {
  const cards = new Map([
    ['a', { examples: examples(3) }],
    ['b', { examples: examples(1) }],
    ['c', {}],
  ])

  it('picks one in-range example per card that has them', () => {
    const picked = pickSentences(['a', 'b', 'c', 'gone'], cards, seededRng(1))
    expect([...picked.keys()]).toEqual(['a', 'b'])
    expect(picked.get('a')).toBeGreaterThanOrEqual(0)
    expect(picked.get('a')).toBeLessThan(3)
    expect(picked.get('b')).toBe(0)
  })

  it('is reproducible with the same rng and varies across seeds', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `k${i}`)
    const many = new Map(ids.map((id) => [id, { examples: examples(3) }]))
    const first = pickSentences(ids, many, seededRng(7))
    expect(pickSentences(ids, many, seededRng(7))).toEqual(first)
    expect(new Set(first.values()).size).toBeGreaterThan(1)
  })
})

describe('sentenceOf', () => {
  it('returns the picked example', () => {
    expect(sentenceOf({ examples: examples(3) }, 2)?.translation).toBe('t2')
  })

  it('falls back to the first example when the index is out of range or missing', () => {
    expect(sentenceOf({ examples: examples(2) }, 5)?.translation).toBe('t0')
    expect(sentenceOf({ examples: examples(2) }, undefined)?.translation).toBe('t0')
  })

  it('is undefined without examples', () => {
    expect(sentenceOf({}, 0)).toBeUndefined()
    expect(sentenceOf(undefined, 0)).toBeUndefined()
  })
})
