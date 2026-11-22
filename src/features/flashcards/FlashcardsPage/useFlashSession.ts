import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { type Card, db, setFlash, updateProgress } from '@/db'
import type { SwipeDir } from '@/features/flashcards/SwipeCard'
import { type FlashContent, pickSentences } from '@/features/flashcards/sentences'
import { useRestartUndo } from '@/features/study/useSavedSession'
import { t } from '@/i18n/ru'
import { hasExamples, shuffle } from '@/lib'
import {
  createSession,
  flashSessionReducer,
  type RoundSnapshot,
  sortByPosition,
} from './flashSession'

/**
 * The round: the pure reducer plus the database writes around it. Swipe and undo share one lock
 * (`busy`) and one synchronous history (`historyRef`), so a fast Backspace can't interleave with a
 * pending write or undo the same swipe twice.
 */
export function useFlashSession({
  deckId,
  cardsById,
  ids,
  content,
  shuffled,
}: {
  deckId: string
  cardsById: Map<string, Card>
  ids: string[]
  content: FlashContent
  shuffled: boolean
}) {
  const pickFor = (list: string[], c: FlashContent) =>
    c === 'sentences' ? pickSentences(list, cardsById) : new Map<string, number>()
  const order = (list: string[]) => (shuffled ? shuffle(list) : list)
  const [session, dispatch] = useReducer(flashSessionReducer, undefined, () =>
    createSession(order(ids), pickFor(ids, content)),
  )
  const { queue, index, history } = session
  // Handlers need the history synchronously, before the next render. Adopt the state's history
  // only when it changed (a restart or a restored round), not on every render: an undo waiting on
  // its write has already popped the ref.
  const historyRef = useRef(history)
  const seenHistory = useRef(history)
  if (seenHistory.current !== history) {
    seenHistory.current = history
    historyRef.current = history
  }
  const busy = useRef(false)
  const [announce, setAnnounce] = useState('')

  const done = index >= queue.length
  const currentId = queue[index]
  const currentCard = currentId ? cardsById.get(currentId) : undefined
  // Words show any card; sentences need one that still has examples.
  const current =
    currentCard && (content === 'words' || hasExamples(currentCard)) ? currentCard : undefined
  const next = queue[index + 1] ? cardsById.get(queue[index + 1]!) : undefined

  // Skip cards deleted mid-session, or whose examples were deleted in sentence mode.
  const skip = !done && !!currentId && !current
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run per card, even when several are skipped in a row
  useEffect(() => {
    if (skip) dispatch({ type: 'skipped' })
  }, [skip, currentId])

  const swipe = useCallback(
    async (dir: SwipeDir) => {
      if (!currentId || busy.current) return
      busy.current = true
      try {
        const prev = (await db.progress.get(currentId))?.flash ?? 'new'
        await setFlash(currentId, deckId, dir === 1 ? 'known' : 'learning')
        const entry = { cardId: currentId, index, dir, prev }
        historyRef.current = [...historyRef.current, entry]
        dispatch({ type: 'swiped', entry })
        setAnnounce(dir === 1 ? t.flash.announceKnow : t.flash.announceLearning)
      } finally {
        busy.current = false
      }
    },
    [currentId, deckId, index],
  )

  const undo = useCallback(async () => {
    const last = historyRef.current.at(-1)
    if (!last || busy.current) return
    busy.current = true
    try {
      historyRef.current = historyRef.current.slice(0, -1)
      await updateProgress(last.cardId, deckId, () => ({ flash: last.prev }))
      dispatch({ type: 'undone' })
    } finally {
      busy.current = false
    }
  }, [deckId])

  const restart = (list: string[], c: FlashContent = content) =>
    dispatch({ type: 'restarted', queue: order(list), picked: pickFor(list, c) })

  const offerUndo = useRestartUndo<RoundSnapshot>(undefined, (before) =>
    dispatch({ type: 'restored', before }),
  )

  const restartWithUndo = (list: string[]) => {
    const before = { picked: session.picked, queue, index, history: historyRef.current }
    restart(list)
    if (index > 0) offerUndo(before)
  }

  const reorderRest = (on: boolean) => {
    const rest = queue.slice(index)
    dispatch({
      type: 'reordered',
      queue: [...queue.slice(0, index), ...(on ? shuffle(rest) : sortByPosition(rest, cardsById))],
    })
  }

  return {
    ...session,
    announce,
    done,
    currentId,
    current,
    next,
    swipe,
    undo,
    restart,
    restartWithUndo,
    reorderRest,
  }
}
