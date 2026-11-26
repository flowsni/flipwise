import { describe, expect, it } from 'vitest'
import { seededRng } from '@/lib'
import { pickDistractors } from './cards'

describe('pickDistractors', () => {
  it('never repeats the correct answer and dedupes', () => {
    const rng = seededRng(1)
    const out = pickDistractors('cat', ['Cat', 'dog', 'dog', 'cow', 'hippopotamus'], 3, rng)
    expect(out).not.toContain('Cat')
    expect(new Set(out).size).toBe(out.length)
    expect(out).toHaveLength(3)
  })
  it('prefers similar length', () => {
    const out = pickDistractors('cat', ['dog', 'a very long answer indeed', 'cow'], 2, () => 0)
    expect(out).toEqual(['dog', 'cow'])
  })
})
