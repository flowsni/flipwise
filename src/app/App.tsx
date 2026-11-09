import { MotionConfig } from 'motion/react'
import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { seedDemoDeck } from '../db/seed'
import { ToastProvider } from '../design/Toast'
import { ErrorBoundary } from './ErrorBoundary'
import { router } from './router'
import { SettingsProvider } from './SettingsContext'
import { useApplyTheme } from './theme'
import { UpdatePrompt } from './UpdatePrompt'

export function App() {
  useApplyTheme()

  useEffect(() => {
    // Ask the browser not to evict our IndexedDB under storage pressure.
    navigator.storage?.persist?.().catch(() => {})
    seedDemoDeck().catch((e) => console.warn('Seeding failed', e))
  }, [])

  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <SettingsProvider>
            <RouterProvider router={router} />
            <UpdatePrompt />
          </SettingsProvider>
        </ToastProvider>
      </MotionConfig>
    </ErrorBoundary>
  )
}
