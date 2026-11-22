import type { ReactNode } from 'react'
import { cx } from './cx'

/**
 * Nothing to show yet. With an `icon` it is a centered column (pass layout in `className`);
 * `boxed` is the dashed placeholder of a list. `actions` sit below the text.
 */
export function EmptyState({
  icon,
  title,
  text,
  actions,
  boxed,
  className,
}: {
  icon?: ReactNode
  title?: string
  text: string
  actions?: ReactNode
  boxed?: boolean
  className?: string
}) {
  if (boxed) {
    return (
      <div
        className={cx(
          'rounded-card border border-dashed border-line p-8 text-center text-ink-2',
          className,
        )}
      >
        <p>{text}</p>
        {actions && <div className="mt-4 flex justify-center gap-2">{actions}</div>}
      </div>
    )
  }
  return (
    <div className={cx('flex flex-col items-center gap-4 text-center', className)}>
      {icon && (
        <span className="grid size-16 place-items-center rounded-2xl bg-sun-soft text-sun-ink">
          {icon}
        </span>
      )}
      {title && <h1 className="text-xl font-bold tracking-tight">{title}</h1>}
      <p className="max-w-xs text-ink-2">{text}</p>
      {actions}
    </div>
  )
}
