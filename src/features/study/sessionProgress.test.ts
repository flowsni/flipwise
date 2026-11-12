import { describe, expect, it } from 'vitest'
import { sessionProgress } from './sessionProgress'

const ids = new Set(['a', 'b', 'c'])
const learn = (over: object = {}) => ({
  version: 1,
  order: ['a', 'b', 'c'],
  stage: { a: 2, b: 1, c: 2 },
  round: { number: 2 },
  ...over,
})
const test = (over: object = {}) => ({
  version: 1,
  phase: 'taking',
  questions: [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }],
  answers: { q1: 'x', q2: '  ' },
  ...over,
})

describe('sessionProgress', () => {
  it('counts learned cards and the round for Learn', () => {
    expect(sessionProgress('learn', learn(), ids)).toEqual({ round: 2, done: 2, total: 3 })
  })

  it('ignores cards deleted while the Learn session was paused', () => {
    expect(sessionProgress('learn', learn(), new Set(['b', 'c']))).toEqual({
      round: 2,
      done: 1,
      total: 2,
    })
  })

  it('counts non-empty answers for Test', () => {
    expect(sessionProgress('test', test(), ids)).toEqual({ done: 1, total: 3 })
  })

  it('returns null for sessions the study pages would not resume', () => {
    expect(sessionProgress('learn', null, ids)).toBeNull()
    expect(sessionProgress('learn', learn({ version: 2 }), ids)).toBeNull()
    expect(sessionProgress('learn', learn({ order: [] }), ids)).toBeNull()
    expect(sessionProgress('test', test({ phase: 'results' }), ids)).toBeNull()
    expect(sessionProgress('test', test({ questions: [] }), ids)).toBeNull()
    expect(sessionProgress('test', { version: 1 }, ids)).toBeNull()
  })
})
