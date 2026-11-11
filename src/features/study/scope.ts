/** Which cards a study session covers. Pure helpers shared by Flashcards, Learn and Test. */

import { isMastered } from '../../db/progress'
import type { Progress } from '../../db/types'
import { type Rng, shuffle } from '../../lib/shuffle'

export const STUDY_SCOPES = ['all', 'unknown', 'starred'] as const
export type StudyScope = (typeof STUDY_SCOPES)[number]

/** Session size; 0 means every card of the scope. */
export const STUDY_LIMITS = [10, 20, 0] as const
export type StudyLimit = (typeof STUDY_LIMITS)[number]

export interface ScopeOptions {
  scope: StudyScope
  limit: StudyLimit
}

type ProgressMap = ReadonlyMap<string, Progress>

function inScope(scope: StudyScope, p: Progress | undefined): boolean {
  if (scope === 'unknown') return !isMastered(p)
  if (scope === 'starred') return !!p?.starred
  return true
}

/** Number of cards in each scope, for the picker's counters. */
export function scopeCounts<C extends { id: string }>(
  cards: readonly C[],
  progress: ProgressMap,
): Record<StudyScope, number> {
  const counts = { all: 0, unknown: 0, starred: 0 }
  for (const c of cards) {
    for (const s of STUDY_SCOPES) if (inScope(s, progress.get(c.id))) counts[s]++
  }
  return counts
}

/** The remembered scope, or «Все» when it holds no cards (e.g. «Избранные» without stars). */
export function usableScope(
  scope: StudyScope,
  counts: Readonly<Record<StudyScope, number>>,
): StudyScope {
  return counts[scope] > 0 ? scope : 'all'
}

/**
 * Cards of the scope, at most `limit` of them. A limited session takes a random sample so
 * repeated short sessions cover the whole set; the result keeps deck order either way.
 */
export function selectStudyCards<C extends { id: string }>(
  cards: readonly C[],
  progress: ProgressMap,
  { scope, limit }: ScopeOptions,
  rng: Rng = Math.random,
): C[] {
  const pool = cards.filter((c) => inScope(scope, progress.get(c.id)))
  if (!limit || pool.length <= limit) return pool
  const picked = new Set(shuffle(pool, rng).slice(0, limit))
  return pool.filter((c) => picked.has(c))
}
