/**
 * Test mode: builds a mixed question set from a deck and grades it.
 * Pure functions; the state is plain JSON so an unfinished test can be resumed.
 */

import type { AnswerSide } from '../../db/types'
import { type MatchResult, matchAnswer } from '../../lib/answerMatch'
import { type Rng, shuffle } from '../../lib/shuffle'
import { type LearnCard, pickDistractors } from '../learn/learnEngine'

export type QuestionType = 'choice' | 'truefalse' | 'written'
export const QUESTION_TYPES: readonly QuestionType[] = ['choice', 'truefalse', 'written']

export interface TestConfig {
  count: number
  types: QuestionType[]
  answerWith: AnswerSide
}

export interface TestQuestion {
  id: string
  cardId: string
  type: QuestionType
  prompt: string
  answer: string
  options?: string[]
  /** For true/false: the pairing shown to the learner. */
  shown?: string
  /** For true/false: whether `shown` is the real answer. */
  isTrue?: boolean
}

export interface TestResultItem {
  questionId: string
  correct: boolean
  match?: MatchResult
}

export interface TestResult {
  items: TestResultItem[]
  correct: number
  total: number
  percent: number
}

export function defaultQuestionCount(cardCount: number): number {
  return Math.min(20, cardCount)
}

export function generateTest(
  cards: readonly LearnCard[],
  config: TestConfig,
  rng: Rng = Math.random,
  /** Ask only about these cards (e.g. retaking mistakes); distractors still come from the whole deck. */
  onlyCardIds?: readonly string[],
): TestQuestion[] {
  const types = config.types.length ? config.types : ['choice' as const]
  const side = config.answerWith
  const answerOf = (c: LearnCard) => (side === 'term' ? c.term : c.definition)
  const promptOf = (c: LearnCard) => (side === 'term' ? c.definition : c.term)
  const candidates = onlyCardIds ? cards.filter((c) => onlyCardIds.includes(c.id)) : cards
  const picked = shuffle(candidates, rng).slice(
    0,
    Math.max(1, Math.min(config.count, candidates.length)),
  )
  // Spread types evenly, then shuffle the assignment so they are mixed.
  const typePlan = shuffle(
    picked.map((_, i) => types[i % types.length]!),
    rng,
  )

  return picked.map((card, i) => {
    const type = typePlan[i]!
    const answer = answerOf(card)
    const base = { id: `q${i}`, cardId: card.id, type, prompt: promptOf(card), answer }
    const pool = cards.filter((c) => c.id !== card.id).map(answerOf)
    if (type === 'choice') {
      return { ...base, options: shuffle([answer, ...pickDistractors(answer, pool, 3, rng)], rng) }
    }
    if (type === 'truefalse') {
      const [wrong] = pickDistractors(answer, pool, 1, rng)
      const isTrue = !wrong || rng() < 0.5
      return { ...base, shown: isTrue ? answer : wrong!, isTrue }
    }
    return base
  })
}

/**
 * Grades answers. For choice: the option text; for true/false: "true" | "false";
 * for written: free text. `lang` is the language of expected answers.
 */
export function gradeTest(
  questions: readonly TestQuestion[],
  answers: Readonly<Record<string, string>>,
  lang?: string,
  overrides: Readonly<Record<string, boolean>> = {},
): TestResult {
  const items = questions.map((q): TestResultItem => {
    const given = answers[q.id] ?? ''
    if (overrides[q.id]) return { questionId: q.id, correct: true }
    if (q.type === 'choice') return { questionId: q.id, correct: given === q.answer }
    if (q.type === 'truefalse') {
      return { questionId: q.id, correct: given !== '' && (given === 'true') === q.isTrue }
    }
    const match = matchAnswer(given, q.answer, lang)
    return { questionId: q.id, correct: match.verdict !== 'wrong', match }
  })
  const correct = items.filter((i) => i.correct).length
  const total = items.length
  return { items, correct, total, percent: total ? Math.round((correct / total) * 100) : 0 }
}

export function isAnswered(q: TestQuestion, answers: Readonly<Record<string, string>>): boolean {
  return (answers[q.id] ?? '').trim() !== ''
}
