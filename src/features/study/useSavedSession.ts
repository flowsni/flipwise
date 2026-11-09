import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { clearSession, loadSession, saveSession } from '../../db/sessions'
import type { StudyMode } from '../../db/types'

export interface SavedSession<T> {
  /** The stored session was looked up (or skipped because of "?fresh=1"). */
  ready: boolean
  /** A stored session that passed `accept`, or undefined to start fresh. */
  saved?: T
}

/**
 * Loads the unfinished Learn/Test session of a deck. "?fresh=1" (the deck page's
 * «Начать заново») discards it instead. Guards against setting state after unmount.
 */
export function useSavedSession<T>(
  deckId: string,
  mode: StudyMode,
  accept: (saved: T) => boolean,
): SavedSession<T> {
  const [params, setParams] = useSearchParams()
  const [result, setResult] = useState<SavedSession<T>>({ ready: false })

  // biome-ignore lint/correctness/useExhaustiveDependencies: load once per deck and mode
  useEffect(() => {
    let cancelled = false
    const fresh = params.get('fresh') === '1'
    ;(async () => {
      if (fresh) {
        setParams({}, { replace: true })
        await clearSession(deckId, mode)
      }
      const saved = fresh ? undefined : await loadSession<T>(deckId, mode)
      if (!cancelled) setResult({ ready: true, saved: saved && accept(saved) ? saved : undefined })
    })()
    return () => {
      cancelled = true
    }
  }, [deckId, mode])

  return result
}

/** Saves an unfinished session, or removes it once the session is over. */
export function persistSession(
  deckId: string,
  mode: StudyMode,
  state: unknown,
  unfinished: boolean,
): void {
  if (unfinished) saveSession(deckId, mode, state)
  else clearSession(deckId, mode)
}
