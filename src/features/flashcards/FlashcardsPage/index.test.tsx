import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createDeck, db, type ExampleItem } from '@/db'
import { ToastProvider } from '@/design'
import { t } from '@/i18n/ru'
import { getSetting, setSetting } from '@/lib'
import { FlashcardsPage } from '.'

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
  setSetting('study.limit', 0)
  setSetting('study.scope', 'all')
  await Promise.all([db.decks.clear(), db.cards.clear(), db.progress.clear()])
})

const words = [
  { term: 'one', definition: 'один' },
  { term: 'two', definition: 'два' },
  { term: 'three', definition: 'три' },
]

async function renderDeck(
  options: {
    examples?: Record<string, ExampleItem[]>
    defLang?: string
    cards?: { term: string; definition: string }[]
    query?: string
    hard?: string[]
  } = {},
) {
  const deckId = await createDeck(
    { title: 'Deck', termLang: 'en', defLang: options.defLang ?? 'ru', level: 'A1' },
    options.cards ?? words,
  )
  for (const card of await db.cards.where({ deckId }).toArray()) {
    const items = options.examples?.[card.term]
    if (items) {
      await db.cards.update(card.id, {
        examples: { items, provider: 'anthropic', model: 'test', createdAt: 1 },
      })
    }
    if (options.hard?.includes(card.term)) {
      await db.progress.put({
        cardId: card.id,
        deckId,
        flash: 'learning',
        learnStage: 0,
        correct: 0,
        wrong: 3,
        lastSeenAt: 1,
      })
    }
  }
  render(
    <StrictMode>
      <ToastProvider>
        <MemoryRouter initialEntries={[`/deck/${deckId}/flashcards${options.query ?? ''}`]}>
          <Routes>
            <Route path="/deck/:deckId/flashcards" element={<FlashcardsPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </StrictMode>,
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
  it('"?scope=hard" studies the hard words without changing the remembered scope', async () => {
    setSetting('study.scope', 'all')
    await renderDeck({ query: '?scope=hard', hard: ['two'] })
    await screen.findByRole('button', { name: cardLabel('two') })
    expect(screen.getByText(t.scope.chip(t.scope.hard, 1))).toBeTruthy()
    expect(getSetting('study.scope', 'none')).toBe('all')
  })

  it('remembers a scope from "?scope=hard" only when the learner picks another one', async () => {
    setSetting('study.scope', 'unknown')
    await renderDeck({ query: '?scope=hard', hard: ['two'] })
    const chip = await screen.findByRole('button', {
      name: t.scope.change(t.scope.chip(t.scope.hard, 1)),
    })
    fireEvent.click(chip)
    const size = await screen.findByRole('radiogroup', { name: t.scope.size })
    fireEvent.click(within(size).getByRole('radio', { name: '10' }))
    expect(getSetting('study.scope', 'none')).toBe('unknown')

    const which = screen.getByRole('radiogroup', { name: t.scope.which })
    fireEvent.click(within(which).getByRole('radio', { name: /^Все/ }))
    await screen.findByText(t.scope.chip(t.scope.all, 3))
    expect(getSetting('study.scope', 'none')).toBe('all')
  })

  it('marks consecutive cards without flipping them, by button and by arrow key', async () => {
    await renderDeck()
    await screen.findByRole('button', { name: cardLabel('one') })
    using put = vi.spyOn(IDBObjectStore.prototype, 'put')

    fireEvent.click(screen.getByRole('button', { name: t.flash.know }))
    await screen.findByRole('button', { name: cardLabel('two') }, { timeout: 3000 })
    expect(screen.getByText(t.study.progress(2, 3))).toBeTruthy()
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
    await settle()
    expect(put.mock.contexts).toEqual(Array(3).fill(expect.objectContaining({ name: 'progress' })))
  })

  it('ignores a swipe still animating when the round restarts', async () => {
    await renderDeck()
    await screen.findByRole('button', { name: cardLabel('one') })
    fireEvent.click(screen.getByRole('button', { name: t.study.options }))
    const restart = await screen.findByRole('menuitem', { name: t.flash.restart })

    fireEvent.click(screen.getByRole('button', { name: t.flash.know }))
    fireEvent.click(restart)
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: cardLabel('one') })).toHaveLength(1),
    )
    await settle()

    expect(shownCard().getAttribute('aria-label')).toBe(cardLabel('one'))
    expect(screen.getByText(t.study.progress(1, 3))).toBeTruthy()
    expect(await db.progress.count()).toBe(0)
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
      await screen.findByText(t.flash.doneNeutralTitle, undefined, { timeout: 3000 })

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

    it('applies the session size after leaving out cards without examples', async () => {
      setSetting('flash.content', 'sentences')
      setSetting('study.limit', 10)
      const cards = Array.from({ length: 22 }, (_, i) => ({ term: `w${i}`, definition: `с${i}` }))
      // Every other card has an example: 11 with, 11 without.
      const examples = Object.fromEntries(
        cards
          .filter((_, i) => i % 2 === 0)
          .map((c) => [
            c.term,
            [{ text: `[[${c.term}]] here`, translation: `тут ${c.definition}` }],
          ]),
      )
      await renderDeck({ cards, examples })

      await screen.findByRole('button', { name: /тут/ })
      expect(screen.getByText(t.study.progress(1, 10))).toBeTruthy()
    })

    it('shows an empty state without examples and switches back to words', async () => {
      setSetting('flash.content', 'sentences')
      await renderDeck()

      await screen.findByText(t.flash.noSentencesTitle)
      fireEvent.click(screen.getByRole('button', { name: t.flash.generate }))
      // No AI key in tests: the sheet leads to the settings.
      expect(await screen.findByText(t.examples.noKey)).toBeTruthy()
      fireEvent.keyDown(document.body, { key: 'Escape' })
      await waitFor(() => expect(screen.queryByText(t.examples.noKey)).toBeNull())

      fireEvent.click(screen.getByRole('button', { name: t.flash.toWords }))
      await screen.findByRole('button', { name: cardLabel('one') })
    })

    it('switching the mode restarts the round on an unflipped card', async () => {
      await renderDeck({ examples: sentences })
      fireEvent.click(await screen.findByRole('button', { name: cardLabel('one') }))
      await screen.findByRole('button', { name: cardLabel('один') })

      fireEvent.click(screen.getByRole('button', { name: t.flash.know }))
      fireEvent.click(screen.getByRole('radio', { name: t.flash.sentences }))
      await screen.findByRole('button', { name: cardLabel('У меня одна кошка') }, { timeout: 3000 })
      await settle()
      expect(shownCard().getAttribute('aria-label')).toBe(cardLabel('У меня одна кошка'))
      expect(screen.getByText(t.study.progress(1, 2))).toBeTruthy()
      expect(await db.progress.count()).toBe(0)
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
