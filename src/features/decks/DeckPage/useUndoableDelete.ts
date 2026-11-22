import { useCallback } from 'react'
import { type DeckSnapshot, restoreSnapshot } from '@/db'
import { useToast } from '@/design'
import { t } from '@/i18n/ru'

/** Deletes at once and offers «Отменить»; `afterDelete` runs before the toast (e.g. to leave the page). */
export function useUndoableDelete() {
  const toast = useToast()
  return useCallback(
    async (remove: () => Promise<DeckSnapshot>, message: string, afterDelete?: () => void) => {
      const snapshot = await remove()
      afterDelete?.()
      toast.show({
        message,
        action: { label: t.app.undo, onClick: () => restoreSnapshot(snapshot) },
      })
    },
    [toast],
  )
}
