import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Card, Deck } from '../../db/types'
import { t } from '../../i18n/ru'
import { CardRow } from './CardRow'

// See FlashcardsPage.test.tsx: run Motion's JS animations instead of happy-dom's native ones.
const nativeAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
beforeAll(() => {
  delete (Element.prototype as Partial<Element>).animate
})
afterAll(() => {
  if (nativeAnimate) Object.defineProperty(Element.prototype, 'animate', nativeAnimate)
})
afterEach(cleanup)

const deck = { termLang: 'en', defLang: 'ru' } as Deck
const card = { id: 'c1', term: 'apple', definition: 'яблоко' } as Card
const withExamples = {
  ...card,
  examples: { items: [{ text: 'An apple.', translation: 'Яблоко.' }], model: 'm', createdAt: 0 },
} as Card

const renderRow = (c: Card, onSelect?: () => void) =>
  render(
    <ul>
      <CardRow card={c} deck={deck} onSelect={onSelect} />
    </ul>,
  )

describe('CardRow', () => {
  it('shows a filled marker for a card that has examples', () => {
    renderRow(withExamples)
    expect(screen.getByRole('img', { name: t.examples.has })).toBeTruthy()
  })

  it('shows an outline marker without examples', () => {
    renderRow(card)
    expect(screen.getByRole('img', { name: t.examples.none })).toBeTruthy()
    expect(screen.queryByRole('img', { name: t.examples.has })).toBeNull()
  })

  it('calls onSelect when the row is tapped', () => {
    const onSelect = vi.fn()
    renderRow(card, onSelect)
    fireEvent.click(screen.getByRole('button', { name: /apple/ }))
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('does not call onSelect while text is selected', () => {
    const onSelect = vi.fn()
    renderRow(card, onSelect)
    const row = screen.getByRole('button', { name: /apple/ })
    const range = document.createRange()
    range.selectNodeContents(row)
    window.getSelection()?.removeAllRanges()
    window.getSelection()?.addRange(range)
    fireEvent.click(row)
    window.getSelection()?.removeAllRanges()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('opens from the keyboard', () => {
    const onSelect = vi.fn()
    renderRow(card, onSelect)
    fireEvent.keyDown(screen.getByRole('button', { name: /apple/ }), { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledOnce()
  })
})
