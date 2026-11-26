import type { TestConfig, TestQuestion } from './testGenerator'

export interface TestState {
  version: 1
  phase: 'taking' | 'results'
  config: TestConfig
  questions: TestQuestion[]
  answers: Record<string, string>
  overrides: Record<string, boolean>
}

export function acceptTestSession(s: Partial<TestState>): boolean {
  return s.version === 1 && s.phase === 'taking' && !!s.questions?.length
}
