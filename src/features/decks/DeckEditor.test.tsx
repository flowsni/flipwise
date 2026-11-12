import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createDeck, getDeckCards } from '../../db/decks'
import { ToastProvider } from '../../design/Toast'
import { t } from '../../i18n/ru'
import { DeckEditor } from './DeckEditor'

// See FlashcardsPage.test.tsx: run Motion's JS animations instead of happy-dom's native ones.
const nativeAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
beforeAll(() => {
  delete (Element.prototype as Partial<Element>).animate
})
afterAll(() => {
  if (nativeAnimate) Object.defineProperty(Element.prototype, 'animate', nativeAnimate)
})

afterEach(async () => {
  cleanup()
  await Promise.all([db.decks.clear(), db.cards.clear(), db.progress.clear()])
})

const WORDS: [string, string][] = [
  ['apple', 'яблоко'],
  ['banana', 'банан'],
  ['cherry', 'вишня'],
  ['date', 'финик'],
  ['elder', 'бузина'],
  ['fig', 'инжир'],
  ['grape', 'виноград'],
  ['honey', 'мёд'],
  ['iris', 'ирис'],
  ['jam', 'варенье'],
  ['kiwi', 'киви'],
  ['lemon', 'лимон'],
]

async function renderEditor() {
  const deckId = await createDeck(
    { title: 'Fruit', termLang: 'en', defLang: 'ru', level: 'B1' },
    WORDS.map(([term, definition]) => ({ term, definition })),
  )
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[`/deck/${deckId}/edit`]}>
        <Routes>
          <Route path="/deck/:deckId/edit" element={<DeckEditor />} />
          <Route path="/deck/:deckId" element={<p>deck page</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
  await screen.findByLabelText(`${t.editor.term} 1`)
  return deckId
}

const filter = () => screen.getByLabelText(t.editor.filterPlaceholder) as HTMLInputElement
const row = (term: string) =>
  [...document.querySelectorAll<HTMLElement>('[data-row]')].find(
    (el) => el.querySelector('input')!.value === term,
  )!
const visibleTerms = () =>
  [...document.querySelectorAll<HTMLElement>('[data-row]')]
    .filter((el) => !el.hidden)
    .map((el) => el.querySelector('input')!.value)

describe('DeckEditor filter', () => {
  it('is shown from 10 cards and hides non-matching rows without unmounting them', async () => {
    await renderEditor()
    fireEvent.change(filter(), { target: { value: 'мёд' } })
    expect(visibleTerms()).toEqual(['honey'])
    // still mounted
    expect(document.querySelectorAll('[data-row]')).toHaveLength(WORDS.length)
    expect(screen.getByText(t.editor.filterFound(1))).toBeTruthy()
    // drag handles are hidden while filtering
    expect(screen.queryByLabelText(new RegExp(t.editor.dragRow))).toBeNull()
  })

  it('searches by translation, ignoring case and ё/е', async () => {
    await renderEditor()
    fireEvent.change(filter(), { target: { value: 'МЕД' } })
    expect(visibleTerms()).toEqual(['honey'])
  })

  it('shows an empty-result message', async () => {
    await renderEditor()
    fireEvent.change(filter(), { target: { value: 'zzz' } })
    expect(visibleTerms()).toEqual([])
    expect(screen.getByText(t.editor.filterEmpty('zzz'))).toBeTruthy()
  })

  it('keeps an edited row visible even if it no longer matches', async () => {
    await renderEditor()
    fireEvent.change(filter(), { target: { value: 'apple' } })
    const input = within(row('apple')).getByLabelText(`${t.editor.term} 1`)
    fireEvent.change(input, { target: { value: 'pineapple' } })
    expect(visibleTerms()).toEqual(['pineapple'])
    fireEvent.change(input, { target: { value: 'orange' } })
    expect(visibleTerms()).toEqual(['orange'])
  })

  it('does not submit the form on Enter in the filter, and Escape clears it', async () => {
    const deckId = await renderEditor()
    fireEvent.change(filter(), { target: { value: 'apple' } })
    const prevented = !fireEvent.keyDown(filter(), { key: 'Enter' })
    expect(prevented).toBe(true)
    expect(screen.queryByText('deck page')).toBeNull()
    expect(await getDeckCards(deckId)).toHaveLength(WORDS.length)
    fireEvent.keyDown(filter(), { key: 'Escape' })
    expect(filter().value).toBe('')
    expect(visibleTerms()).toHaveLength(WORDS.length)
  })

  it('«Добавить карточку» resets the filter', async () => {
    await renderEditor()
    fireEvent.change(filter(), { target: { value: 'apple' } })
    expect(visibleTerms()).toEqual(['apple'])
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.editor.addRow) }))
    expect(filter().value).toBe('')
    expect(visibleTerms()).toHaveLength(WORDS.length + 1)
  })

  it('updates the match count and the empty message when matches are deleted', async () => {
    await renderEditor()
    fireEvent.change(filter(), { target: { value: 'a' } }) // many matches
    const before = visibleTerms().length
    expect(screen.getByText(t.editor.filterFound(before))).toBeTruthy()
    const firstShown = document.querySelector<HTMLElement>('[data-row]:not([hidden])')!
    fireEvent.click(within(firstShown).getByLabelText(new RegExp(t.editor.removeRow)))
    await waitFor(() => expect(screen.getByText(t.editor.filterFound(before - 1))).toBeTruthy())

    fireEvent.change(filter(), { target: { value: 'kiwi' } })
    fireEvent.click(within(row('kiwi')).getByLabelText(new RegExp(t.editor.removeRow)))
    await waitFor(() => expect(screen.getByText(t.editor.filterEmpty('kiwi'))).toBeTruthy())
  })

  it('Enter in the last visible row adds a card instead of saving the deck', async () => {
    const deckId = await renderEditor()
    fireEvent.change(filter(), { target: { value: 'apple' } }) // not the deck's last row
    const def = within(row('apple')).getByLabelText(new RegExp(t.editor.definition))
    const notPrevented = fireEvent.keyDown(def, { key: 'Enter' })
    expect(notPrevented).toBe(false)
    expect(filter().value).toBe('')
    expect(visibleTerms()).toHaveLength(WORDS.length + 1)
    expect(screen.queryByText('deck page')).toBeNull()
    expect(await getDeckCards(deckId)).toHaveLength(WORDS.length)
  })

  it('saves all cards in their original order while filtered', async () => {
    const deckId = await renderEditor()
    fireEvent.change(filter(), { target: { value: 'kiwi' } })
    fireEvent.change(within(row('kiwi')).getByLabelText(`${t.editor.definition} 11`), {
      target: { value: 'киви (фрукт)' },
    })
    fireEvent.click(screen.getByRole('button', { name: t.editor.save }))
    await waitFor(() => expect(screen.getByText('deck page')).toBeTruthy())
    const cards = await getDeckCards(deckId)
    expect(cards.map((c) => c.term)).toEqual(WORDS.map(([term]) => term))
    expect(cards[10]!.definition).toBe('киви (фрукт)')
  })

  it('is not shown for small decks', async () => {
    const deckId = await createDeck(
      { title: 'Small', termLang: 'en', defLang: 'ru', level: 'B1' },
      WORDS.slice(0, 3).map(([term, definition]) => ({ term, definition })),
    )
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={[`/deck/${deckId}/edit`]}>
          <Routes>
            <Route path="/deck/:deckId/edit" element={<DeckEditor />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    )
    await screen.findByLabelText(`${t.editor.term} 1`)
    expect(screen.queryByLabelText(t.editor.filterPlaceholder)).toBeNull()
  })
})
