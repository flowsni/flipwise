import { describe, expect, it } from 'vitest'
import { seededRng } from '../../lib/shuffle'
import type { LearnCard } from '../learn/learnEngine'
import { defaultQuestionCount, generateTest, gradeTest } from './testGenerator'

const cards: LearnCard[] = Array.from({ length: 8 }, (_, i) => ({
  id: `c${i}`,
  term: `term${i}`,
  definition: `def ${i}`,
}))

describe('generateTest', () => {
  it('defaults to min(20, n) questions', () => {
    expect(defaultQuestionCount(8)).toBe(8)
    expect(defaultQuestionCount(50)).toBe(20)
  })

  it('creates the requested number of unique-card questions with mixed types', () => {
    const qs = generateTest(
      cards,
      { count: 6, types: ['choice', 'truefalse', 'written'], answerWith: 'definition' },
      seededRng(1),
    )
    expect(qs).toHaveLength(6)
    expect(new Set(qs.map((q) => q.cardId)).size).toBe(6)
    expect(qs.filter((q) => q.type === 'choice')).toHaveLength(2)
    expect(qs.filter((q) => q.type === 'truefalse')).toHaveLength(2)
    expect(qs.filter((q) => q.type === 'written')).toHaveLength(2)
  })

  it('builds valid choice and true/false questions', () => {
    const qs = generateTest(
      cards,
      { count: 8, types: ['choice', 'truefalse'], answerWith: 'term' },
      seededRng(2),
    )
    for (const q of qs) {
      const card = cards.find((c) => c.id === q.cardId)!
      expect(q.prompt).toBe(card.definition)
      expect(q.answer).toBe(card.term)
      if (q.type === 'choice') {
        expect(q.options).toContain(q.answer)
        expect(new Set(q.options).size).toBe(q.options!.length)
      } else {
        expect(q.isTrue).toBe(q.shown === q.answer)
      }
    }
  })

  it('caps the count at the deck size', () => {
    expect(generateTest(cards, { count: 99, types: ['written'], answerWith: 'term' })).toHaveLength(
      8,
    )
  })
})

describe('gradeTest', () => {
  it('grades every question type', () => {
    const qs = generateTest(
      cards.slice(0, 3),
      { count: 3, types: ['choice', 'truefalse', 'written'], answerWith: 'definition' },
      seededRng(3),
    )
    const answers: Record<string, string> = {}
    for (const q of qs) {
      if (q.type === 'choice') answers[q.id] = q.answer
      if (q.type === 'truefalse') answers[q.id] = q.isTrue ? 'false' : 'true'
      if (q.type === 'written') answers[q.id] = `${q.answer}`
    }
    const r = gradeTest(qs, answers)
    expect(r.total).toBe(3)
    expect(r.correct).toBe(2)
    expect(r.percent).toBe(67)
  })

  it('treats unanswered as wrong and honours overrides', () => {
    const qs = generateTest(
      cards,
      { count: 2, types: ['written'], answerWith: 'term' },
      seededRng(4),
    )
    expect(gradeTest(qs, {}).correct).toBe(0)
    expect(gradeTest(qs, {}, undefined, { [qs[0]!.id]: true }).correct).toBe(1)
  })
})
