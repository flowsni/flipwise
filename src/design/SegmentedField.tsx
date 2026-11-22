import type { ReactNode } from 'react'
import { Segmented } from './Field'

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
