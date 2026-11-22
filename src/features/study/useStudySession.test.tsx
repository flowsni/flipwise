import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { db, loadSession, saveSession } from '@/db'
import { useStudySession } from './useStudySession'

interface S {
  n: number
}
const options = { accept: (s: S) => s.n > 0, unfinished: (s: S | null) => !!s && s.n < 10 }
const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>

afterEach(() => db.sessions.clear())

describe('useStudySession', () => {
  it('restores an unfinished session before it reports ready', async () => {
    await saveSession('d', 'test', { n: 3 })
    const { result } = renderHook(() => useStudySession<S>('d', 'test', options), { wrapper })
    expect(result.current.ready).toBe(false)
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.state).toEqual({ n: 3 })
  })

  it('is ready with no state when nothing is saved', async () => {
    const { result } = renderHook(() => useStudySession<S>('d', 'test', options), { wrapper })
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.state).toBeNull()
  })

  it('stays ready after the state is cleared (a new test after the old one was restored)', async () => {
    await saveSession('d', 'test', { n: 3 })
    const { result } = renderHook(() => useStudySession<S>('d', 'test', options), { wrapper })
    await waitFor(() => expect(result.current.ready).toBe(true))
    act(() => result.current.persist(null))
    expect(result.current.ready).toBe(true)
    expect(result.current.state).toBeNull()
    await waitFor(async () => expect(await loadSession('d', 'test')).toBeUndefined())
  })

  it('saves unfinished states and clears finished ones', async () => {
    const { result } = renderHook(() => useStudySession<S>('d', 'test', options), { wrapper })
    await waitFor(() => expect(result.current.ready).toBe(true))
    act(() => result.current.persist({ n: 4 }))
    await waitFor(async () => expect(await loadSession('d', 'test')).toEqual({ n: 4 }))
    act(() => result.current.persist({ n: 10 }))
    await waitFor(async () => expect(await loadSession('d', 'test')).toBeUndefined())
  })
})
