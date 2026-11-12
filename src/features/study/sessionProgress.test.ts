import { describe, expect, it } from 'vitest'
import { sessionProgress } from './sessionProgress'

describe('sessionProgress', () => {
  it('counts learned cards and the round for Learn', () => {
    const state = {
      version: 1,
      order: ['a', 'b', 'c'],
      stage: { a: 2, b: 1, c: 2 },
      round: { number: 2 },
    }
    expect(sessionProgress('learn', state)).toEqual({ round: 2, done: 2, total: 3 })
  })

  it('counts non-empty answers for Test', () => {
    const state = {
      version: 1,
      questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }],
      answers: { q1: 'x', q2: '  ' },
    }
    expect(sessionProgress('test', state)).toEqual({ done: 1, total: 3 })
  })

  it('returns undefined for unknown shapes', () => {
    expect(sessionProgress('learn', null)).toBeUndefined()
    expect(sessionProgress('learn', { version: 2 })).toBeUndefined()
    expect(sessionProgress('learn', { version: 1, order: [] })).toBeUndefined()
    expect(sessionProgress('test', { version: 1, questions: 'x' })).toBeUndefined()
  })
})
