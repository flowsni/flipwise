import { expect, it } from 'vitest'
import { hasExamples } from './examples'

it('needs at least one cached example', () => {
  const examples = (n: number) => ({
    items: Array.from({ length: n }, () => ({ text: '[[w]]', translation: 't' })),
    provider: 'anthropic',
    model: 'm',
    createdAt: 1,
  })
  expect(hasExamples({ examples: examples(2) })).toBe(true)
  expect(hasExamples({ examples: examples(0) })).toBe(false)
  expect(hasExamples({})).toBe(false)
  expect(hasExamples(undefined)).toBe(false)
})
