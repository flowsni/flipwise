import type { StudyMode } from '../../db/types'

/** What the deck page shows on a tile with an unfinished session. */
export interface SessionProgress {
  /** Learn only: the round the learner is in. */
  round?: number
  done: number
  total: number
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

/**
 * Progress of a saved Learn/Test session, read defensively: sessions outlive app versions,
 * so an unknown shape gives `undefined` (the tile then shows no numbers) instead of throwing.
 */
export function sessionProgress(mode: StudyMode, state: unknown): SessionProgress | undefined {
  if (!isObject(state) || state.version !== 1) return undefined
  if (mode === 'learn') {
    const { order, stage, round } = state
    if (!Array.isArray(order) || !isObject(stage) || !isObject(round)) return undefined
    if (typeof round.number !== 'number') return undefined
    return {
      round: round.number,
      done: order.filter((id) => stage[String(id)] === 2).length,
      total: order.length,
    }
  }
  const { questions, answers } = state
  if (!Array.isArray(questions) || !isObject(answers)) return undefined
  const answered = questions.filter((q) => {
    const a = isObject(q) ? answers[String(q.id)] : undefined
    return typeof a === 'string' && a.trim() !== ''
  })
  return { done: answered.length, total: questions.length }
}
