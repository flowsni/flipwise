import type { ReactNode } from 'react'
import { Segmented } from './Field'

/** A `Segmented` with its visible caption; `children` (e.g. a custom-value input) go below it. */
export function SegmentedField<T extends string | number>({
  label,
  children,
  ...props
}: React.ComponentProps<typeof Segmented<T>> & { children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.9375rem] font-medium text-ink-2">{label}</span>
      <Segmented label={label} {...props} />
      {children}
    </div>
  )
}
