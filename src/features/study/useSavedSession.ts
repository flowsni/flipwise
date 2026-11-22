import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { clearSession, loadSession, type StudyMode, saveSession, useHardCards } from '@/db'
import { useToast } from '@/design'
import { t } from '@/i18n/ru'
import { useSessionProgress } from './useSessionProgress'

export interface SavedSession<T> {
  /** The stored session was looked up (or skipped because of "?fresh=1"). */
  ready: boolean
  saved?: T
  /** The unfinished session a "?fresh=1" start threw away: «Отменить» brings it back. */
  discarded?: T
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
  // Keeps the deck page's cache fresh while studying, so going back shows no stale frame.
  useSessionProgress(deckId, mode)
  useHardCards(deckId)

  // biome-ignore lint/correctness/useExhaustiveDependencies: load once per deck and mode
  useEffect(() => {
    let cancelled = false
    const fresh = params.get('fresh') === '1'
    ;(async () => {
      const stored = await loadSession<T>(deckId, mode)
      const usable = stored && accept(stored) ? stored : undefined
      if (fresh) {
        setParams({}, { replace: true })
        await clearSession(deckId, mode)
      }
      if (!cancelled)
        setResult({
          ready: true,
          saved: fresh ? undefined : usable,
          discarded: fresh ? usable : undefined,
        })
    })()
    return () => {
      cancelled = true
    }
  }, [deckId, mode])

  return result
}

export function persistSession(
  deckId: string,
  mode: StudyMode,
  state: unknown,
  unfinished: boolean,
): void {
  if (unfinished) saveSession(deckId, mode, state)
  else clearSession(deckId, mode)
}

/**
 * Offers «Отменить» after a restart threw away unfinished progress: on the "Заново" tile
 * (`discarded` of `useSavedSession`) and on in-session restarts (`offer`).
 */
export function useRestartUndo<T>(discarded: T | undefined, restore: (session: T) => void) {
  const toast = useToast()
  const restoreRef = useRef(restore)
  restoreRef.current = restore
  const offer = (session: T) =>
    toast.show({
      message: t.study.restarted,
      top: true,
      action: { label: t.app.undo, onClick: () => restoreRef.current(session) },
    })
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, when the tile discarded a session
  useEffect(() => {
    if (discarded) offer(discarded)
  }, [discarded])
  return offer
}
