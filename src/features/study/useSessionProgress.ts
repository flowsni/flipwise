import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { sessionId } from '../../db/sessions'
import type { StudyMode } from '../../db/types'
import { type SessionProgress, sessionProgress } from './sessionProgress'

/**
 * Resumable Learn/Test session of a deck: `undefined` while loading, `null` when there is none
 * (or the study page would not resume it), otherwise its progress.
 */
export function useSessionProgress(
  deckId: string | undefined,
  mode: StudyMode,
): SessionProgress | null | undefined {
  return useLiveQuery(async () => {
    if (!deckId) return null
    const [saved, cardIds] = await Promise.all([
      db.sessions.get(sessionId(deckId, mode)),
      db.cards.where('deckId').equals(deckId).primaryKeys(),
    ])
    return saved ? sessionProgress(mode, saved.state, new Set(cardIds)) : null
  }, [deckId, mode])
}
