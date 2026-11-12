import type { StudyMode } from '../../db/types'
import { acceptLearnSession, isLearned, type LearnState } from '../learn/learnEngine'
import { isAnswered } from '../test/testGenerator'
import { acceptTestSession, type TestState } from '../test/testState'

/** What the deck page shows on a tile with an unfinished session. */
export interface SessionProgress {
  /** Learn only: the round the learner is in. */
  round?: number
  done: number
  total: number
}

/**
 * Progress of a saved Learn/Test session, or `null` when the Learn/Test page would not resume
 * it (so the tile must not offer «Продолжить»). The rules come from the engines, so the tile
 * and the study screens cannot disagree. `cardIds` are the deck's current cards: cards deleted
 * while the session was paused are dropped by Learn on resume, so they are not counted here.
 */
export function sessionProgress(
  mode: StudyMode,
  state: unknown,
  cardIds: ReadonlySet<string>,
): SessionProgress | null {
  if (typeof state !== 'object' || state === null) return null
  if (mode === 'learn') {
    const s = state as LearnState
    if (!acceptLearnSession(s)) return null
    const live = s.order.filter((id) => cardIds.has(id))
    return {
      round: s.round?.number ?? 1,
      done: live.filter((id) => isLearned(s, id)).length,
      total: live.length,
    }
  }
  const s = state as TestState
  if (!acceptTestSession(s)) return null
  return {
    done: s.questions.filter((q) => isAnswered(q, s.answers ?? {})).length,
    total: s.questions.length,
  }
}
