import { useRegisterSW } from 'virtual:pwa-register/react'
import { useEffect } from 'react'
import { useToast } from '../design/Toast'
import { t } from '../i18n/ru'

/** Shows «Доступна новая версия — Обновить» when a new service worker is waiting. */
export function UpdatePrompt() {
  const toast = useToast()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Check for updates hourly for long-lived tabs and installed apps.
      if (registration) setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000)
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    toast.show({
      message: t.pwa.update,
      duration: 0,
      action: {
        label: t.pwa.updateAction,
        onClick: () => {
          updateServiceWorker(true)
          // Fallback if the `controlling` event never arrives (e.g. the worker was already active).
          setTimeout(() => window.location.reload(), 3000)
        },
      },
    })
  }, [needRefresh, toast, updateServiceWorker])

  return null
}
