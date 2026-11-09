import { type HTMLMotionProps, motion } from 'motion/react'
import { forwardRef } from 'react'
import { cx } from './cx'
import { pressSpring } from './motion'

type Variant = 'primary' | 'raised' | 'soft' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: Variant
  size?: Size
  block?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'primary-fill font-semibold',
  raised: 'raised text-ink font-semibold',
  soft: 'bg-surface-2 text-ink font-medium hover:bg-surface-3',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink font-medium',
  danger: 'bg-bad-soft text-bad font-semibold',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-5 text-[0.95rem] rounded-2xl gap-2',
  lg: 'h-14 px-6 text-[1.05rem] rounded-[1.1rem] gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'raised', size = 'md', block, className, type = 'button', disabled, ...props },
  ref,
) {
  const pressable = variant === 'primary' || variant === 'raised'
  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      whileTap={
        disabled
          ? undefined
          : { scale: 0.97, ...(pressable ? { boxShadow: 'var(--fw-shadow-pressed)' } : {}) }
      }
      whileHover={disabled || !pressable ? undefined : { y: -1 }}
      transition={pressSpring}
      className={cx(
        'inline-flex select-none items-center justify-center whitespace-nowrap transition-colors disabled:opacity-45',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...props}
    />
  )
})

export interface IconButtonProps extends HTMLMotionProps<'button'> {
  label: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'ghost' | 'raised' | 'soft'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', variant = 'ghost', className, type = 'button', ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.9 }}
      transition={pressSpring}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40',
        size === 'sm' && 'size-9',
        size === 'md' && 'size-11',
        size === 'lg' && 'size-14',
        variant === 'ghost' && 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        variant === 'soft' && 'bg-surface-2 text-ink hover:bg-surface-3',
        variant === 'raised' && 'raised text-ink',
        className,
      )}
      {...props}
    />
  )
})
