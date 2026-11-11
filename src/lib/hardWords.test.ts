import { describe, expect, it } from 'vitest'
import type { Progress } from '../db/types'
import { errorRate, hardestCards } from './hardWords'

const p = (cardId: string, correct: number, wrong: number): Progress => ({
  cardId,
  deckId: 'd',
  flash: 'new',
  learnStage: 0,
  correct,
  wrong,
  lastSeenAt: 0,
})

describe('hardestCards', () => {
  it('needs two mistakes and a 30% error rate', () => {
    const list = [p('once', 0, 1), p('learned', 20, 3), p('edge', 7, 3), p('hard', 1, 2)]
    expect(hardestCards(list).map((x) => x.cardId)).toEqual(['edge', 'hard'])
  })

  it('sorts by mistakes, then by error rate', () => {
    const list = [p('a', 2, 3), p('b', 0, 5), p('c', 0, 3), p('d', 4, 5)]
    expect(hardestCards(list).map((x) => x.cardId)).toEqual(['b', 'd', 'c', 'a'])
  })

  it('limits the list', () => {
    const many = Array.from({ length: 80 }, (_, i) => p(`c${i}`, 0, 2 + (i % 5)))
    expect(hardestCards(many)).toHaveLength(50)
    expect(hardestCards(many, { limit: 3 })).toHaveLength(3)
  })
})

describe('errorRate', () => {
  it('is 0 for a card never answered', () => {
    expect(errorRate({ correct: 0, wrong: 0 })).toBe(0)
    expect(errorRate({ correct: 1, wrong: 3 })).toBe(0.75)
  })
})
