import type { AnswerSide, Deck } from '../../db/types'
import type { TestConfig, TestQuestion } from './testGenerator'

export interface TestState {
  version: 1
  phase: 'taking' | 'results'
  config: TestConfig
  questions: TestQuestion[]
  answers: Record<string, string>
  overrides: Record<string, boolean>
}

/** Language of the side the learner answers with. */
export function langOf(deck: Deck, side: AnswerSide) {
  return side === 'term' ? deck.termLang : deck.defLang
}
