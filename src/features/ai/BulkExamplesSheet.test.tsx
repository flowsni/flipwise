import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { createDeck, getDeckCards } from '../../db/decks'
import { ToastProvider } from '../../design/Toast'
import { t } from '../../i18n/ru'
import { setSetting } from '../../lib/storage'
import { BulkExamplesSheet } from './BulkExamplesSheet'

const call = vi.fn()
vi.mock('./examples', () => ({ call: (...args: unknown[]) => call(...args) }))

// See FlashcardsPage.test.tsx: run Motion's JS animations instead of happy-dom's native ones.
const nativeAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
beforeAll(() => {
  delete (Element.prototype as Partial<Element>).animate
})
afterAll(() => {
  if (nativeAnimate) Object.defineProperty(Element.prototype, 'animate', nativeAnimate)
})

afterEach(async () => {
  // The sheet renders into a portal on document.body; unmount it between tests.
  cleanup()
  vi.clearAllMocks()
  setSetting('ai.provider', null)
  setSetting('ai.keys', {})
  await Promise.all([db.decks.clear(), db.cards.clear()])
})

/** Answers every numbered item of a batch prompt. */
function answer(user: string) {
  const items = [...user.matchAll(/^(\d+)\. (\S+) — /gm)]
  return JSON.stringify({
    cards: items.map((m) => ({
      n: Number(m[1]),
      items: [{ text: `New ${m[2]}.`, translation: 'н' }],
    })),
  })
}

async function renderSheet(withExamples: number) {
  const deckId = await createDeck(
    { title: 'D', termLang: 'en', defLang: 'ru', level: 'B1' },
    Array.from({ length: 12 }, (_, i) => ({ term: `w${i}`, definition: `с${i}` })),
  )
  const cards = await getDeckCards(deckId)
  for (const card of cards.slice(0, withExamples)) {
    await db.cards.update(card.id, {
      examples: {
        items: [{ text: `Old ${card.term}.`, translation: 'с' }],
        provider: 'anthropic',
        model: 'm',
        createdAt: 1,
      },
    })
  }
  const deck = (await db.decks.get(deckId))!
  const onClose = vi.fn()
  render(
    <ToastProvider>
      <BulkExamplesSheet open deck={deck} cards={await getDeckCards(deckId)} onClose={onClose} />
    </ToastProvider>,
  )
  return { deckId, onClose }
}

describe('BulkExamplesSheet', () => {
  it('asks for a key first', async () => {
    await renderSheet(0)
    expect(await screen.findByText(t.examples.noKey)).toBeTruthy()
  })

  describe('with a key', () => {
    beforeEach(() => {
      setSetting('ai.provider', 'anthropic')
      setSetting('ai.keys', { anthropic: 'k' })
    })

    it('fills the cards without examples at the chosen level', async () => {
      const { deckId, onClose } = await renderSheet(1)
      call.mockImplementation(async (_p, req) => answer(req.user))

      expect(await screen.findByText(t.bulk.requests(11, 2))).toBeTruthy()
      fireEvent.click(screen.getByRole('radio', { name: 'A2' }))
      fireEvent.click(screen.getByRole('button', { name: t.bulk.start }))

      expect(await screen.findByText(t.bulk.done(11))).toBeTruthy()
      expect(onClose).toHaveBeenCalled()
      expect(call).toHaveBeenCalledTimes(2)
      const cards = await getDeckCards(deckId)
      expect(cards[0]!.examples?.items[0]?.text).toBe('Old w0.')
      expect(cards[5]!.examples).toMatchObject({ level: 'A2' })
    })

    it('regenerates all and undo brings the old examples back', async () => {
      const { deckId } = await renderSheet(12)
      call.mockImplementation(async (_p, req) => answer(req.user))

      // Every card has examples: «Без примеров» is disabled and «Все заново» preselected.
      expect(await screen.findByText(t.bulk.requests(12, 2))).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: t.bulk.start }))
      await screen.findByText(t.bulk.done(12))
      const cards = await getDeckCards(deckId)
      expect(cards[3]!.examples?.items[0]?.text).toBe('New [[w3]].')
      // A card regenerated on its own after the run keeps its newer examples on undo.
      await db.cards.update(cards[5]!.id, {
        examples: {
          items: [{ text: 'Newer.', translation: 'н' }],
          provider: 'anthropic',
          model: 'm',
          createdAt: Date.now() + 1000,
        },
      })

      fireEvent.click(screen.getByRole('button', { name: t.app.undo }))
      await waitFor(async () => {
        expect((await getDeckCards(deckId))[3]!.examples?.items[0]?.text).toBe('Old w3.')
      })
      expect((await getDeckCards(deckId))[5]!.examples?.items[0]?.text).toBe('Newer.')
    })

    it('ignores a stop tapped right after the start (double tap)', async () => {
      await renderSheet(0)
      call.mockImplementation(async (_p, req) => {
        await new Promise((r) => setTimeout(r, 20))
        return answer(req.user)
      })

      fireEvent.click(await screen.findByRole('button', { name: t.bulk.start }))
      fireEvent.click(await screen.findByRole('button', { name: t.bulk.stop }))

      expect(await screen.findByText(t.bulk.done(12))).toBeTruthy()
    })

    it('shows the error and what was saved when the key is rejected', async () => {
      const { AiError } = await import('./errors')
      await renderSheet(0)
      call
        .mockImplementationOnce(async (_p, req) => answer(req.user))
        .mockRejectedValueOnce(new AiError('auth'))

      fireEvent.click(await screen.findByRole('button', { name: t.bulk.start }))

      expect(await screen.findByText(t.examples.errors.auth)).toBeTruthy()
      expect(screen.getByText(t.bulk.savedSoFar(10))).toBeTruthy()
    })
  })
})
