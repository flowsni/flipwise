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

/** Whether a stored session can be resumed; `TestPage` and the deck tile share this. */
export function acceptTestSession(s: Partial<TestState>): boolean {
  return s.version === 1 && s.phase === 'taking' && !!s.questions?.length
}

/** Language of the side the learner answers with. */
export function langOf(deck: Deck, side: AnswerSide) {
  return side === 'term' ? deck.termLang : deck.defLang
}
