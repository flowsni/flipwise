import { useEffect, useRef } from 'react'

/** Calls the latest `handler` on every `keydown` of the window, for as long as the component is mounted. */
export function useWindowKeydown(handler: (e: KeyboardEvent) => void): void {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => ref.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
