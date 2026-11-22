import { describe, expect, it } from 'vitest'
import {
  createSession,
  type HistoryEntry,
  flashSessionReducer as reduce,
  roundResults,
} from './flashSession'

const entry = (cardId: string, index: number, dir: 1 | -1 = 1): HistoryEntry => ({
  cardId,
  index,
  dir,
  prev: 'new',
})

const start = () => createSession(['a', 'b', 'c'], new Map())

describe('flashSessionReducer', () => {
  it('swipe records the verdict and moves on', () => {
    const s = reduce(start(), { type: 'swiped', entry: entry('a', 0) })
    expect(s.index).toBe(1)
    expect(s.history).toEqual([entry('a', 0)])
    expect(s.enterFrom).toBeUndefined()
  })

  it('undo returns to the exact position and remembers the swipe direction', () => {
    let s = reduce(start(), { type: 'swiped', entry: entry('a', 0, -1) })
    s = reduce(s, { type: 'undone' })
    expect(s.index).toBe(0)
    expect(s.history).toEqual([])
    expect(s.enterFrom).toBe(-1)
  })

  it('undo with an empty history changes nothing', () => {
    const s = start()
    expect(reduce(s, { type: 'undone' })).toBe(s)
  })

  it('restart clears the round and bumps the card key', () => {
    let s = reduce(start(), { type: 'swiped', entry: entry('a', 0) })
    s = reduce(s, { type: 'restarted', queue: ['b', 'a'], picked: new Map([['a', 1]]) })
    expect(s).toMatchObject({ queue: ['b', 'a'], index: 0, history: [], round: 1 })
    expect(s.picked.get('a')).toBe(1)
  })

  it('restoring brings back the round and still remounts the card', () => {
    let s = reduce(start(), { type: 'swiped', entry: entry('a', 0) })
    const before = { queue: s.queue, index: s.index, history: s.history, picked: s.picked }
    s = reduce(s, { type: 'restarted', queue: ['c'], picked: new Map() })
    s = reduce(s, { type: 'restored', before })
    expect(s).toMatchObject({ queue: ['a', 'b', 'c'], index: 1, round: 2 })
    expect(s.history).toEqual([entry('a', 0)])
  })

  it('skip moves on without touching history', () => {
    const s = reduce(start(), { type: 'skipped' })
    expect(s.index).toBe(1)
    expect(s.history).toEqual([])
  })
})

describe('roundResults', () => {
  it('counts the latest verdict per card', () => {
    const history = [entry('a', 0, -1), entry('b', 1, 1), entry('a', 0, 1), entry('c', 2, -1)]
    expect(roundResults(history, ['a', 'b', 'c'])).toEqual({ known: 2, learning: ['c'] })
  })
})
