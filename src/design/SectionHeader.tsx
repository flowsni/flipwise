import type { ReactNode } from 'react'
import { cx } from './cx'

export function SectionHeader({
  title,
  id,
  action,
  className,
}: {
  title: string
  id?: string
  action?: ReactNode
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
