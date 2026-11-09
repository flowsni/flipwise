import type { ReactNode } from 'react'
import { cx } from './cx'

/** Sticky translucent top bar with safe-area padding. */
export function TopBar({
  left,
  center,
  right,
  className,
}: {
  left?: ReactNode
  center?: ReactNode
  right?: ReactNode
  className?: string
}) {
  return (
    <header
      className={cx(
        'sticky top-0 z-30 bg-bg/80 pt-safe backdrop-blur-xl backdrop-saturate-150 supports-[not(backdrop-filter:blur(1px))]:bg-bg',
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3 sm:px-5">
        <div className="flex min-w-11 items-center">{left}</div>
        <div className="min-w-0 flex-1">{center}</div>
        <div className="flex min-w-11 items-center justify-end gap-1">{right}</div>
      </div>
    </header>
  )
}
