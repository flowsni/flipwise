import type { ReactNode } from 'react'
import { t } from '../i18n/ru'
import { IconButton } from './Button'
import { IconX } from './icons'
import { ProgressBar } from './Progress'

/** Distraction-free header for study screens: close, thin progress, "…" menu. */
export function StudyBar({
  onClose,
  progress,
  label,
  menu,
}: {
  onClose: () => void
  progress: number
  label?: string
  menu?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 bg-bg/85 pt-safe backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-3 sm:px-5">
        <IconButton label={t.study.close} onClick={onClose}>
          <IconX />
        </IconButton>
        <div className="flex flex-1 flex-col gap-1">
          <ProgressBar value={progress} label={label ?? ''} />
        </div>
        {label && (
          <span className="min-w-12 text-right text-sm font-medium text-ink-2 tabular-nums">
            {label}
          </span>
        )}
        <div className="flex min-w-11 justify-end">{menu}</div>
      </div>
    </header>
  )
}

/** True when a keyboard shortcut should not fire (typing or a dialog is open). */
export function shortcutsBlocked(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null
  if (e.defaultPrevented) return true
  if (el?.closest('input, textarea, select, [contenteditable="true"], [role="menu"]')) return true
  return !!document.querySelector('[role="dialog"]')
}
