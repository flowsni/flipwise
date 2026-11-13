import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { IconButton } from './Button'
import { cx } from './cx'
import { IconMore } from './icons'
import { snappySpring } from './motion'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect: () => void
  danger?: boolean
  /** Shows a check mark — for toggles like "Перемешать". */
  checked?: boolean
}

export interface MenuSection {
  title?: string
  items: MenuItem[]
}

/** Free space under the button below which the popover opens upwards. */
// shortcut: fits menus of up to ~2 items, measure the list if a longer menu lands near the bottom
const MENU_ROOM = 160

/** "…" button with a popover list. Secondary actions live here (Apple style). */
export function Menu({
  label,
  sections,
  align = 'right',
  icon,
}: {
  label: string
  sections: MenuSection[]
  align?: 'left' | 'right'
  icon?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  // Opens above the button when there is no room below (e.g. the last card in a long list).
  const [up, setUp] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus()
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const show = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    setUp(!!rect && window.innerHeight - rect.bottom < MENU_ROOM)
    setOpen(true)
  }

  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) buttonRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const items = [...(listRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(i + 1) % items.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i - 1 + items.length) % items.length]?.focus()
    } else if (e.key === 'Tab') {
      close(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <IconButton
        ref={buttonRef}
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : show())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            show()
          }
        }}
      >
        {icon ?? <IconMore />}
      </IconButton>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={listRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onKeyDown}
            initial={{ opacity: 0, scale: 0.92, y: up ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: up ? 4 : -4 }}
            transition={snappySpring}
            style={{ originX: align === 'right' ? 1 : 0, originY: up ? 1 : 0 }}
            className={cx(
              'absolute z-40 min-w-60 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-float',
              up ? 'bottom-12' : 'top-12',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {sections.map((section, si) => (
              <div
                key={section.title ?? si}
                className={cx(si > 0 && 'mt-1 border-t border-line pt-1')}
              >
                {section.title && (
                  <div className="px-3 pt-1.5 pb-1 text-[0.8125rem] font-medium text-ink-3">
                    {section.title}
                  </div>
                )}
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    {...(item.checked === undefined
                      ? { role: 'menuitem' }
                      : { role: 'menuitemcheckbox', 'aria-checked': item.checked })}
                    tabIndex={-1}
                    onClick={() => {
                      close()
                      item.onSelect()
                    }}
                    className={cx(
                      'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[1.0625rem] outline-none hover:bg-surface-2 focus-visible:bg-surface-2',
                      item.danger ? 'text-bad' : 'text-ink',
                    )}
                  >
                    {item.icon && (
                      <span className="text-ink-2 [&>svg]:size-[18px]">{item.icon}</span>
                    )}
                    <span className="flex-1">{item.label}</span>
                    {item.checked && (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        aria-hidden="true"
                        className="text-primary"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
