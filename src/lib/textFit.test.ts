import { expect, it } from 'vitest'
import { fitClass, fitSentenceClass } from './textFit'

it('shrinks text as it gets longer', () => {
  const sizes = [5, 20, 50, 100, 300].map((n) => fitClass('x'.repeat(n)))
  expect(new Set(sizes).size).toBe(5)
  expect(sizes[0]).toContain('5xl')
  expect(sizes[4]).toBe('text-lg')
})

it('caps the size by the longest word', () => {
  expect(fitClass('x'.repeat(13))).toBe('text-[2rem] sm:text-4xl')
  expect(fitClass('x'.repeat(21))).toBe('text-2xl')
  expect(fitClass('a b c d')).toContain('5xl')
})

it('uses a smaller scale for sentences', () => {
  const sizes = [20, 60, 120, 200].map((n) => fitSentenceClass('x'.repeat(n)))
  expect(new Set(sizes).size).toBe(4)
  expect(fitSentenceClass('x'.repeat(10))).not.toBe(fitClass('x'.repeat(10)))
  expect(sizes[3]).toContain('text-lg')
})
