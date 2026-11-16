import { act, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useSearchParams } from 'react-router'
import { expect, it } from 'vitest'
import { RootLayout } from './RootLayout'

function Search() {
  const [params, setParams] = useSearchParams()
  return (
    <input
      aria-label="q"
      value={params.get('q') ?? ''}
      onChange={(e) => setParams({ q: e.target.value }, { replace: true })}
    />
  )
}

it('keeps the page mounted when a POP-entered page replaces its URL', async () => {
  // The initial entry counts as POP, like app start or swiping back to search.
  const router = createMemoryRouter(
    [{ element: <RootLayout />, children: [{ path: '/search', element: <Search /> }] }],
    { initialEntries: ['/search'] },
  )
  render(<RouterProvider router={router} />)
  const input = screen.getByLabelText('q')

  await act(() => router.navigate('/search?q=a', { replace: true }))

  expect(router.state.historyAction).toBe('REPLACE')
  expect(screen.getByLabelText('q')).toBe(input)
  expect(input).toHaveProperty('value', 'a')
})
