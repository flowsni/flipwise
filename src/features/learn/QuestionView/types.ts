import type { LearnState } from '@/features/learn/learnEngine'
import type { MatchResult } from '@/lib'

export interface Feedback {
  correct: boolean
  match: MatchResult
  response: string
  /** State before the answer, for «Я был прав». */
  before: LearnState
}
