import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { db } from '../../db/db'
import { createDeck } from '../../db/decks'
import type { ExampleItem } from '../../db/types'
import { ToastProvider } from '../../design/Toast'
import { t } from '../../i18n/ru'
import { setSetting } from '../../lib/storage'
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
  setSetting('flash.content', 'words')
  await Promise.all([db.decks.clear(), db.cards.clear(), db.progress.clear()])
})

async function renderDeck(
  options: { examples?: Record<string, ExampleItem[]>; defLang?: string } = {},
) {
  const deckId = await createDeck(
    { title: 'Deck', termLang: 'en', defLang: options.defLang ?? 'ru', level: 'A1' },
    [
      { term: 'one', definition: 'один' },
      { term: 'two', definition: 'два' },
      { term: 'three', definition: 'три' },
    ],
  )
  for (const card of await db.cards.where({ deckId }).toArray()) {
    const items = options.examples?.[card.term]
    if (items) {
      await db.cards.update(card.id, {
        examples: { items, provider: 'anthropic', model: 'test', createdAt: 1 },
      })
    }
  }
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
const settle = () => new Promise((r) => setTimeout(r, 300))
const shownCard = () => screen.getByRole('button', { name: new RegExp(`^${t.flash.flip}\\. `) })

const sentences = {
  one: [{ text: 'I have [[one]] cat', translation: 'У меня [[одна]] кошка' }],
  two: [{ text: '[[Two]] dogs bark', translation: 'Лают две собаки' }],
}

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

  describe('sentences', () => {
    it('shows the translation first and the original on the back, only for cards with examples', async () => {
      setSetting('flash.content', 'sentences')
      await renderDeck({ examples: sentences })

      const front = await screen.findByRole('button', { name: cardLabel('У меня одна кошка') })
      expect(front.parentElement?.querySelector('mark')?.textContent).toBe('одна')
      expect(screen.getByText(t.study.progress(1, 2))).toBeTruthy()
      expect(screen.getByText(t.flash.sentencesPartial(2, 3))).toBeTruthy()
      expect(screen.queryByRole('button', { name: t.examples.button })).toBeNull()

      fireEvent.click(front)
      await screen.findByRole('button', { name: cardLabel('I have one cat') })

      fireEvent.click(screen.getByRole('button', { name: t.flash.know }))
      // A translation without [[ ]] is shown as is.
      await screen.findByRole('button', { name: cardLabel('Лают две собаки') }, { timeout: 3000 })
      await settle()
      fireEvent.click(screen.getByRole('button', { name: t.flash.learning }))
      await screen.findByText(t.flash.doneTitle, undefined, { timeout: 3000 })

      await waitFor(async () => {
        const rows = await db.progress.toArray()
        const byTerm = new Map(
          await Promise.all(
            rows.map(async (p) => [(await db.cards.get(p.cardId))?.term, p.flash] as const),
          ),
        )
        expect(Object.fromEntries(byTerm)).toEqual({ one: 'known', two: 'learning' })
      })
    })

    it('undo brings back the same sentence', async () => {
      setSetting('flash.content', 'sentences')
      await renderDeck({
        examples: {
          one: ['a', 'b', 'c', 'd', 'e'].map((x) => ({
            text: `[[one]] ${x}`,
            translation: `перевод ${x}`,
          })),
          two: sentences.two,
        },
      })
      await screen.findByRole('button', { name: /перевод/ })
      const before = shownCard().getAttribute('aria-label')

      fireEvent.click(screen.getByRole('button', { name: t.flash.know }))
      await screen.findByRole('button', { name: cardLabel('Лают две собаки') }, { timeout: 3000 })
      await settle()
      fireEvent.click(screen.getByRole('button', { name: t.flash.undo }))
      await screen.findByRole('button', { name: before! }, { timeout: 3000 })
    })

    it('shows an empty state without examples and switches back to words', async () => {
      setSetting('flash.content', 'sentences')
      await renderDeck()

      await screen.findByText(t.flash.noSentencesTitle)
      fireEvent.click(screen.getByRole('button', { name: t.flash.toWords }))
      await screen.findByRole('button', { name: cardLabel('one') })
    })

    it('switching the mode restarts the round', async () => {
      await renderDeck({ examples: sentences })
      await screen.findByRole('button', { name: cardLabel('one') })

      fireEvent.click(screen.getByRole('radio', { name: t.flash.sentences }))
      await screen.findByRole('button', { name: cardLabel('У меня одна кошка') }, { timeout: 3000 })
      expect(screen.getByText(t.study.progress(1, 2))).toBeTruthy()
    })

    it('is unavailable for monolingual decks', async () => {
      setSetting('flash.content', 'sentences')
      await renderDeck({ examples: sentences, defLang: 'en' })

      await screen.findByRole('button', { name: cardLabel('one') })
      expect(
        (screen.getByRole('radio', { name: t.flash.sentences }) as HTMLInputElement).disabled,
      ).toBe(true)
      expect(screen.getByText(t.flash.monolingual)).toBeTruthy()
    })
  })
})
