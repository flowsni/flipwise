import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { type ReactNode, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n/ru'
import { IconButton } from './Button'
import { cx } from './cx'
import { IconX } from './icons'
import { spring } from './motion'
import { useMediaQuery } from './useMediaQuery'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Bottom sheet on phones, centered dialog on larger screens.
 * Traps focus, closes on Escape / backdrop / drag down, restores focus on close.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <SheetPanel onClose={onClose} title={title} footer={footer} wide={wide}>
          {children}
        </SheetPanel>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function SheetPanel({
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  const desktop = useMediaQuery('(min-width: 768px)')
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const dragControls = useDragControls()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const first = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel
    first?.focus({ preventScroll: true })
    // Keep screen readers inside the dialog.
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // An open "…" menu inside the sheet closes first.
        if ((e.target as HTMLElement | null)?.closest('[role="menu"]')) return
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      )
      if (!items.length) return
      const firstEl = items[0]!
      const lastEl = items[items.length - 1]!
      if (e.shiftKey && (document.activeElement === firstEl || document.activeElement === panel)) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = overflow
      root?.removeAttribute('inert')
      previouslyFocused?.focus?.({ preventScroll: true })
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <motion.div
        className="absolute inset-0 bg-backdrop backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cx(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-surface shadow-float outline-none md:rounded-[1.75rem]',
          wide ? 'md:max-w-2xl' : 'md:max-w-lg',
        )}
        initial={desktop ? { opacity: 0, scale: 0.96, y: 12 } : { y: '100%' }}
        animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
        exit={desktop ? { opacity: 0, scale: 0.97, y: 8 } : { y: '100%' }}
        transition={spring}
        drag={desktop ? false : 'y'}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 600) onClose()
        }}
      >
        <div
          className="flex shrink-0 touch-none items-center gap-2 px-5 pt-2 pb-2 md:pt-4"
          onPointerDown={(e) => !desktop && dragControls.start(e)}
        >
          <div className="absolute top-2 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-surface-3 md:hidden" />
          <h2 id={titleId} className="mt-3 flex-1 text-lg font-semibold tracking-tight md:mt-0">
            {title}
          </h2>
          <IconButton
            label={t.app.close}
            size="sm"
            variant="soft"
            className="mt-3 md:mt-0"
            onClick={onClose}
          >
            <IconX size={18} />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-5">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-line px-5 pt-3 pb-safe md:pb-4">{footer}</div>
        )}
        {!footer && <div className="pb-safe md:hidden" />}
      </motion.div>
    </div>
  )
}
