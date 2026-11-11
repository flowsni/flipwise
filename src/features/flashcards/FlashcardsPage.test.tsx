import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createDeck } from '../../db/decks'
import { ToastProvider } from '../../design/Toast'
import { t } from '../../i18n/ru'
import { FlashcardsPage } from './FlashcardsPage'

// happy-dom's Animation.cancel() rejects `finished` without marking it handled (browsers do, per
// the Web Animations spec), so Motion stopping a native animation shows up as an unhandled
// rejection. Without Element.prototype.animate, Motion animates in JS and never hits it.
const nativeAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
beforeAll(() => {
  delete (Element.prototype as Partial<Element>).animate
})
afterAll(() => {
  if (nativeAnimate) Object.defineProperty(Element.prototype, 'animate', nativeAnimate)
})

afterEach(async () => {
  await Promise.all([db.decks.clear(), db.cards.clear(), db.progress.clear()])
})

async function renderDeck() {
  const deckId = await createDeck({ title: 'Deck', termLang: 'en', defLang: 'ru', level: 'A1' }, [
    { term: 'one', definition: 'один' },
    { term: 'two', definition: 'два' },
    { term: 'three', definition: 'три' },
  ])
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[`/deck/${deckId}/flashcards`]}>
        <Routes>
          <Route path="/deck/:deckId/flashcards" element={<FlashcardsPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )
  return deckId
}

const cardLabel = (term: string) => `${t.flash.flip}. ${term}`

describe('FlashcardsPage', () => {
  it('marks consecutive cards without flipping them, by button and by arrow key', async () => {
    await renderDeck()
    await screen.findByRole('button', { name: cardLabel('one') })

    fireEvent.click(screen.getByRole('button', { name: t.flash.know }))
    await screen.findByRole('button', { name: cardLabel('two') }, { timeout: 3000 })
    // Let the previous card finish its exit and unmount.
    await new Promise((r) => setTimeout(r, 300))

    fireEvent.click(screen.getByRole('button', { name: t.flash.know }))
    await screen.findByRole('button', { name: cardLabel('three') }, { timeout: 3000 })
    await new Promise((r) => setTimeout(r, 300))

    fireEvent.keyDown(document.body, { key: 'ArrowLeft' })
    await screen.findByText(t.flash.doneTitle, undefined, { timeout: 3000 })

    await waitFor(async () => {
      const flashes = (await db.progress.toArray()).map((p) => p.flash).sort()
      expect(flashes).toEqual(['known', 'known', 'learning'])
    })
  })
})
