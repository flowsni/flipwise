import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  useId,
} from 'react'
import { cx } from './cx'

export const inputClass =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[1rem] text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] focus:border-plum focus:outline-none focus:ring-4 focus:ring-plum/15 dark:focus:border-sun dark:focus:ring-sun/15'

export function Field({
  label,
  hint,
  children,
  id,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
  id: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint && <div className="text-xs text-ink-3">{hint}</div>}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cx(inputClass, className)} {...props} />
  },
)

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cx(inputClass, 'appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <svg
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-3"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
}

export function useFieldId(prefix: string) {
  return `${prefix}-${useId()}`
}

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

/** iOS-style segmented control (radio group). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: SegmentedOption<T>[]
  onChange: (v: T) => void
  label: string
}) {
  const name = useId()
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-surface-2 p-1">
      {options.map((o) => {
        const active = o.value === value
        return (
          <label
            key={o.value}
            className={cx(
              'relative flex-1 cursor-pointer rounded-[0.6rem] px-2 py-1.5 text-center text-sm font-medium transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-plum',
              active ? 'raised text-ink' : 'text-ink-2 hover:text-ink',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={active}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        )
      })}
    </div>
  )
}

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  children: ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl px-1 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-[var(--fw-primary)]"
      />
      <span className="text-[0.95rem]">{children}</span>
    </label>
  )
}
