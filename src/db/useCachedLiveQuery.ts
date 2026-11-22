import { useLiveQuery } from 'dexie-react-hooks'

// shortcut: one entry per key for the whole session, never evicted; add eviction if keys become unbounded.
const cache = new Map<string, unknown>()

export const clearQueryCache = () => cache.clear()

/** `useLiveQuery` that starts from the last result for `key`, so a remounted page (back/forward) has data on its first frame. */
export function useCachedLiveQuery<T>(
  key: string,
  querier: () => Promise<T> | T,
  deps: unknown[],
  /** `false` for keys where `null` means «missing»: a stale `null` would show an error page after an undo. */
  cacheNull = true,
): T | undefined {
  return useLiveQuery(
    async () => {
      const result = await querier()
      if (result === null && !cacheNull) cache.delete(key)
      else cache.set(key, result) // written from the query itself, so a key never gets another key's result
      return result
    },
    deps,
    cache.get(key) as T | undefined,
  )
}
