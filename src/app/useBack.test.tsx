import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useBack } from './useBack'

const navigate = vi.fn()
vi.mock('react-router', () => ({ useNavigate: () => navigate }))

describe('useBack', () => {
  afterEach(() => {
    navigate.mockClear()
    window.history.replaceState(null, '')
  })

  it('goes one step back when the app has a previous entry', () => {
    window.history.replaceState({ idx: 2 }, '')
    renderHook(() => useBack('/')).result.current()
    expect(navigate).toHaveBeenCalledWith(-1)
  })

  it('replaces with the fallback on the first entry', () => {
    window.history.replaceState({ idx: 0 }, '')
    renderHook(() => useBack('/deck/1')).result.current()
    expect(navigate).toHaveBeenCalledWith('/deck/1', { replace: true })
  })
})
