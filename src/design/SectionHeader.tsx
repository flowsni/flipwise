import type { ReactNode } from 'react'
import { cx } from './cx'

/** A section's `h2`, with an optional `action` (button or link) on the same line. */
export function SectionHeader({
  title,
  id,
  action,
  className,
}: {
  title: string
  id?: string
  action?: ReactNode
  /** Spacing around the row, e.g. `mb-3`. */
  className?: string
}) {
  return (
    <div className={cx('flex items-center justify-between gap-2', className)}>
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      {action}
    </div>
  )
}
