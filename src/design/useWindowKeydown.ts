import { useEffect, useRef } from 'react'

/** The latest `handler` runs on every window `keydown` while the component is mounted. */
export function useWindowKeydown(handler: (e: KeyboardEvent) => void): void {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => ref.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
