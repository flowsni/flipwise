import { expect, it } from 'vitest'
import { fitClass } from './textFit'

it('shrinks text as it gets longer', () => {
  const sizes = [5, 20, 50, 100, 300].map((n) => fitClass('x'.repeat(n)))
  expect(new Set(sizes).size).toBe(5)
  expect(sizes[0]).toContain('5xl')
  expect(sizes[4]).toBe('text-lg')
})
