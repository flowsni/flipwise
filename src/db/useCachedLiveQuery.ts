import { useLiveQuery } from 'dexie-react-hooks'

// shortcut: one entry per key for the whole session, never evicted; add eviction if keys become unbounded.
const cache = new Map<string, unknown>()

/** `useLiveQuery` that starts from the last result for `key`, so a remounted page (back/forward) has data on its first frame. */
export function useCachedLiveQuery<T>(
  key: string,
  querier: () => Promise<T> | T,
  deps: unknown[],
): T | undefined {
  return useLiveQuery(
    async () => {
      const result = await querier()
      cache.set(key, result) // written from the query itself, so a key never gets another key's result
      return result
    },
    deps,
    cache.get(key) as T | undefined,
  )
}
