import type { ReactNode } from 'react'
import { useSettingsSheet } from '../../app/SettingsContext'
import { Button } from '../../design/Button'
import { t } from '../../i18n/ru'
import type { AiErrorCode } from './errors'

/** Errors the user fixes in the AI settings rather than by trying again. */
const SETTINGS_ERRORS: readonly AiErrorCode[] = ['auth', 'model', 'no-key']

/** User-facing text for an AI error; a failed fetch while offline is just «Нет интернета». */
export function aiErrorMessage(code: AiErrorCode): string {
  if (code === 'network' && !navigator.onLine) return t.examples.errors.offline
  return t.examples.errors[code as keyof typeof t.examples.errors] ?? t.examples.errors.unknown
}

/** An AI error with what to do about it: retry and, for key or model problems, the settings. */
export function AiErrorBox({
  code,
  onRetry,
  onClose,
  children,
}: {
  code: AiErrorCode
  onRetry?: () => void
  /** Closes the surrounding sheet before the settings open. */
  onClose: () => void
  children?: ReactNode
}) {
  const settings = useSettingsSheet()
  const toSettings = SETTINGS_ERRORS.includes(code)
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl bg-bad-soft p-4" role="alert">
      <p className="text-bad">{aiErrorMessage(code)}</p>
      {children}
      {(onRetry || toSettings) && (
        <div className="flex flex-wrap gap-2">
          {onRetry && (
            <Button size="sm" variant="raised" onClick={onRetry}>
              {t.examples.retry}
            </Button>
          )}
          {toSettings && (
            <Button
              size="sm"
              variant={onRetry ? 'ghost' : 'raised'}
              onClick={() => {
                onClose()
                settings.open('ai')
              }}
            >
              {t.examples.openSettings}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
