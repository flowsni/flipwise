import { describe, expect, it } from 'vitest'
import type { Progress } from '../../db/types'
import { seededRng } from '../../lib/shuffle'
import { scopeCounts, selectStudyCards, usableScope } from './scope'

const cards = Array.from({ length: 30 }, (_, i) => ({ id: `c${i}` }))

function p(cardId: string, patch: Partial<Progress>): [string, Progress] {
  return [
    cardId,
    {
      cardId,
      deckId: 'd',
      flash: 'new',
      learnStage: 0,
      correct: 0,
      wrong: 0,
      lastSeenAt: 0,
      ...patch,
    },
  ]
}

const progress = new Map([
  p('c0', { flash: 'known' }),
  p('c1', { learnStage: 2 }),
  p('c2', { flash: 'learning', starred: true }),
  p('c3', { flash: 'known', starred: true }),
])

describe('scopeCounts', () => {
  it('counts every scope', () => {
    expect(scopeCounts(cards, progress)).toEqual({ all: 30, unknown: 27, starred: 2 })
  })
})

describe('selectStudyCards', () => {
  it('«Незнакомые» leaves out cards mastered in any mode', () => {
    const ids = selectStudyCards(cards, progress, { scope: 'unknown', limit: 0 })
    expect(ids).toHaveLength(27)
    expect(ids).not.toContain('c0')
    expect(ids).not.toContain('c1')
    expect(ids).toContain('c2')
  })

  it('«Избранные» takes only starred cards, mastered or not', () => {
    const ids = selectStudyCards(cards, progress, { scope: 'starred', limit: 0 })
    expect(ids).toEqual(['c2', 'c3'])
  })

  it('limits the session to a random sample in deck order', () => {
    const picked = selectStudyCards(cards, progress, { scope: 'all', limit: 10 }, seededRng(1))
    expect(picked).toHaveLength(10)
    const positions = picked.map((id) => Number(id.slice(1)))
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    const other = selectStudyCards(cards, progress, { scope: 'all', limit: 10 }, seededRng(2))
    expect(other).not.toEqual(picked)
  })

  it('ignores the limit when the scope is smaller', () => {
    expect(selectStudyCards(cards, progress, { scope: 'starred', limit: 10 })).toHaveLength(2)
  })
})

describe('usableScope', () => {
  it('falls back to «Все» for an empty scope', () => {
    expect(usableScope('starred', { all: 5, unknown: 2, starred: 0 })).toBe('all')
    expect(usableScope('unknown', { all: 5, unknown: 2, starred: 0 })).toBe('unknown')
  })
})
