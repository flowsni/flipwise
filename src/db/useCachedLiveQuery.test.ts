import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useCachedLiveQuery } from './useCachedLiveQuery'

describe('useCachedLiveQuery', () => {
  it('returns the last result of the same key on the first render after remount', async () => {
    const first = renderHook(() => useCachedLiveQuery('k', async () => 42, []))
    expect(first.result.current).toBeUndefined()
    await waitFor(() => expect(first.result.current).toBe(42))
    first.unmount()

    const second = renderHook(() => useCachedLiveQuery('k', async () => 42, []))
    expect(second.result.current).toBe(42)
  })

  it('does not leak a result into another key', async () => {
    const other = renderHook(() => useCachedLiveQuery('other', async () => 1, []))
    expect(other.result.current).toBeUndefined()
  })

  it('does not remember null when cacheNull is false', async () => {
    const first = renderHook(() => useCachedLiveQuery('gone', async () => null, [], false))
    await waitFor(() => expect(first.result.current).toBeNull())
    first.unmount()

    const second = renderHook(() => useCachedLiveQuery('gone', async () => null, [], false))
    expect(second.result.current).toBeUndefined()
  })
})
