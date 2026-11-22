import type { InputHTMLAttributes } from 'react'
import { IconButton } from './Button'
import { inputClass } from './Field'
import { IconSearch, IconX } from './icons'

export function SearchField({
  onChange,
  onClear,
  clearLabel,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'onChange' | 'value'> & {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  clearLabel: string
}) {
  return (
    <div className="relative">
      <IconSearch
        size={18}
        className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3"
      />
      <input
        type="search"
        enterKeyHint="search"
        {...props}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} min-h-11 rounded-full py-2 pr-11 pl-10 [&::-webkit-search-cancel-button]:hidden`}
      />
      {props.value && (
        <IconButton
          size="sm"
          label={clearLabel}
          onClick={onClear}
          className="absolute top-1/2 right-0 -translate-y-1/2"
        >
          <IconX size={16} />
        </IconButton>
      )}
    </div>
  )
}
