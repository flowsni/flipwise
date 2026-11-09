import { AnimatePresence, motion } from 'motion/react'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { spring } from './motion'

export interface ToastOptions {
  message: string
  action?: { label: string; onClick: () => void }
  /** ms; 0 keeps the toast until dismissed. */
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: number
}

interface ToastApi {
  show: (options: ToastOptions) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast outside ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const durations = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id))
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }, [])

  const show = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++
      // One toast at a time keeps the bottom of the screen calm.
      setItems([{ ...options, id }])
      const duration = options.duration ?? (options.action ? 5000 : 3000)
      durations.current.set(id, duration)
      if (duration > 0)
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        )
      return id
    },
    [dismiss],
  )

  // WCAG 2.2.1: pause auto-dismiss while the toast is hovered or focused.
  const pause = (id: number) => clearTimeout(timers.current.get(id))
  const resume = (id: number) => {
    const duration = durations.current.get(id) ?? 0
    if (duration > 0)
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      )
  }

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Portal to <body>: sheets mark #root inert, and the «Отменить» toast must stay clickable. */}
      {createPortal(
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-safe"
        >
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={spring}
                onMouseEnter={() => pause(item.id)}
                onMouseLeave={() => resume(item.id)}
                onFocus={() => pause(item.id)}
                onBlur={() => resume(item.id)}
                className="pointer-events-auto mb-2 flex max-w-md items-center gap-3 rounded-2xl bg-toast py-2 pr-2 pl-4 text-[1.0625rem] text-toast-ink shadow-float"
              >
                <span className="flex-1">{item.message}</span>
                {item.action && (
                  <button
                    type="button"
                    onClick={() => {
                      item.action?.onClick()
                      dismiss(item.id)
                    }}
                    className="min-h-11 rounded-xl px-4 font-semibold text-toast-action hover:bg-white/10 dark:hover:bg-black/5"
                  >
                    {item.action.label}
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
