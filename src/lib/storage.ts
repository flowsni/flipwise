import { useSyncExternalStore } from 'react'

/**
 * Tiny localStorage-backed store. Keys are namespaced with "flipwise." because GitHub Pages
 * serves all of a user's projects from one origin.
 */
const PREFIX = 'flipwise.'
const listeners = new Set<() => void>()
const cache = new Map<string, unknown>()

function read<T>(key: string, fallback: T): T {
  if (cache.has(key)) return cache.get(key) as T
  let value = fallback
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw !== null) value = JSON.parse(raw) as T
  } catch {
    // Private mode or corrupted value: fall back silently.
  }
  cache.set(key, value)
  return value
}

export function getSetting<T>(key: string, fallback: T): T {
  return read(key, fallback)
}

export function setSetting<T>(key: string, value: T): void {
  cache.set(key, value)
  try {
    if (value === undefined) localStorage.removeItem(PREFIX + key)
    else localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage full or blocked: keep the in-memory value for this session.
  }
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(PREFIX)) {
      cache.delete(e.key.slice(PREFIX.length))
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useSetting<T>(key: string, fallback: T): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  )
  return [value, (v: T) => setSetting(key, v)]
}
