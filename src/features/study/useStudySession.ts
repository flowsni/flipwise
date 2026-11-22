import { useCallback, useEffect, useState } from 'react'
import type { StudyMode } from '@/db'
import { persistSession, useSavedSession } from './useSavedSession'

/**
 * The state of a Learn/Test session with its saved copy: restores an unfinished session once
 * it is loaded, and `persist` saves every new state (or clears it when it is no longer
 * `unfinished`). `ready` turns true only after the restore, so no setup screen flashes first.
 */
export function useStudySession<T>(
  deckId: string,
  mode: StudyMode,
  {
    accept,
    unfinished,
    revive = (saved) => saved,
  }: {
    /** Whether a stored session can be resumed. */
    accept: (saved: T) => boolean
    unfinished: (state: T | null) => boolean
    /** Makes a stored session ready to continue. */
    revive?: (saved: T) => T
  },
) {
  const session = useSavedSession<T>(deckId, mode, accept)
  const [state, setState] = useState<T | null>(null)
  const [restored, setRestored] = useState(false)

  const persist = useCallback(
    (s: T | null) => {
      setState(s)
      persistSession(deckId, mode, s, unfinished(s))
    },
    [deckId, mode, unfinished],
  )

  // Resume the saved session once it is loaded; otherwise the setup screen is shown.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once when loading finishes
  useEffect(() => {
    if (!session.ready) return
    if (session.saved) setState(revive(session.saved))
    setRestored(true)
  }, [session.ready])

  const ready = session.ready && restored
  return { state, setState, persist, ready, discarded: session.discarded }
}
