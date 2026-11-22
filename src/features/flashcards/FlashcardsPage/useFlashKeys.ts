import type { RefObject } from 'react'
import { toggleStar } from '@/db'
import { shortcutsBlocked, useWindowKeydown } from '@/design'
import type { SwipeCardHandle } from '@/features/flashcards/SwipeCard'

/** Space/↑/↓ flip, ←/→ swipe, S stars, Backspace and ⌘Z undo. */
export function useFlashKeys({
  deckId,
  currentId,
  done,
  undo,
  card,
}: {
  deckId: string
  currentId: string | undefined
  done: boolean
  undo: () => void
  card: RefObject<SwipeCardHandle | null>
}) {
  useWindowKeydown((e) => {
    if (shortcutsBlocked(e)) return
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      undo()
      return
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (e.key === 'Backspace') {
      e.preventDefault()
      undo()
    } else if (done) {
      return
    } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      card.current?.flip()
    } else if (e.key === 'ArrowRight') {
      card.current?.swipe(1)
    } else if (e.key === 'ArrowLeft') {
      card.current?.swipe(-1)
    } else if (e.key.toLowerCase() === 's' || e.code === 'KeyS') {
      e.preventDefault()
      if (currentId) toggleStar(currentId, deckId)
    }
  })
}
