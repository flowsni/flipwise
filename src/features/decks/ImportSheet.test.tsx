import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { t } from '../../i18n/ru'
import { ImportSheet } from './ImportSheet'

// See FlashcardsPage.test.tsx: run Motion's JS animations instead of happy-dom's native ones.
const nativeAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
beforeAll(() => {
  delete (Element.prototype as Partial<Element>).animate
})
afterAll(() => {
  if (nativeAnimate) Object.defineProperty(Element.prototype, 'animate', nativeAnimate)
})
afterEach(cleanup)

const TEXT = 'a\tА\nb\tБ\nc\tВ'

function open(room?: number) {
  render(<ImportSheet open onClose={() => {}} onImport={() => {}} initialText={TEXT} room={room} />)
}

describe('ImportSheet room', () => {
  it('imports everything when there is no limit', () => {
    open()
    expect(screen.getByRole('button', { name: t.import.submit(3) })).toBeTruthy()
  })

  it('imports only what fits and says so', () => {
    open(2)
    expect(screen.getByRole('button', { name: t.import.submit(2) })).toBeTruthy()
    expect(screen.getByText(t.import.trimmed(2))).toBeTruthy()
  })

  it('refuses to import into a full deck', () => {
    open(0)
    const button = screen.getByRole('button', { name: t.import.full }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
  })
})
