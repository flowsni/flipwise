import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { createDeck, getDeckCards } from '../../db/decks'
import type { Card, Deck } from '../../db/types'
import { ToastProvider } from '../../design/Toast'
import { t } from '../../i18n/ru'
import { setSetting } from '../../lib/storage'
import { ExamplesSheet } from './ExamplesSheet'

const generateExamples = vi.fn()
vi.mock('./examples', () => ({
  generateExamples: (...args: unknown[]) => generateExamples(...args),
}))

// See FlashcardsPage.test.tsx: run Motion's JS animations instead of happy-dom's native ones.
const nativeAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
beforeAll(() => {
  delete (Element.prototype as Partial<Element>).animate
})
afterAll(() => {
  if (nativeAnimate) Object.defineProperty(Element.prototype, 'animate', nativeAnimate)
})

beforeEach(() => {
  setSetting('ai.provider', 'anthropic')
  setSetting('ai.keys', { anthropic: 'k' })
  generateExamples.mockImplementation(async (input: { level: string }) => ({
    items: [{ text: `A ${input.level} [[word]].`, translation: 'п' }],
  }))
})

afterEach(async () => {
  cleanup()
  vi.clearAllMocks()
  setSetting('ai.provider', null)
  setSetting('ai.keys', {})
  await Promise.all([db.decks.clear(), db.cards.clear()])
})

async function renderSheet(
  cached: boolean,
  cachedDefinition?: string,
): Promise<{ deck: Deck; card: Card }> {
  const deckId = await createDeck({ title: 'D', termLang: 'en', defLang: 'ru', level: 'B1' }, [
    { term: 'word', definition: 'слово' },
  ])
  let card = (await getDeckCards(deckId))[0]!
  if (cached) {
    await db.cards.update(card.id, {
      examples: {
        items: [{ text: 'Old [[word]].', translation: 'с' }],
        provider: 'anthropic',
        model: 'm',
        createdAt: 1,
        level: 'A2',
        definition: cachedDefinition,
      },
    })
    card = (await db.cards.get(card.id))!
  }
  const deck = (await db.decks.get(deckId))!
  render(
    <ToastProvider>
      <ExamplesSheet card={card} deck={deck} onClose={() => {}} />
    </ToastProvider>,
  )
  return { deck, card }
}

const radio = (level: string) => screen.getByRole('radio', { name: level }) as HTMLInputElement

describe('ExamplesSheet level', () => {
  it('starts from the cached level and applies a new one only on the button', async () => {
    const { card } = await renderSheet(true)
    await screen.findByText('Old')
    expect(radio('A2').checked).toBe(true)

    fireEvent.click(radio('C2'))
    await new Promise((r) => setTimeout(r, 50))
    expect(generateExamples).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: new RegExp(t.examples.generateFor('C2')) }))
    await waitFor(() => expect(generateExamples).toHaveBeenCalledTimes(1))
    expect(generateExamples.mock.calls[0]![0]).toMatchObject({ level: 'C2' })
    await waitFor(async () => {
      expect((await db.cards.get(card.id))?.examples).toMatchObject({ level: 'C2' })
    })
  })

  it('generates right away at the deck level when nothing is cached', async () => {
    const { card } = await renderSheet(false)
    await waitFor(() => expect(generateExamples).toHaveBeenCalledTimes(1))
    expect(generateExamples.mock.calls[0]![0]).toMatchObject({ level: 'B1' })
    await waitFor(async () => {
      expect((await db.cards.get(card.id))?.examples).toMatchObject({ level: 'B1' })
    })
  })

  it('offers «Сгенерировать для …» and labels the shown examples after a level change', async () => {
    await renderSheet(true)
    await screen.findByText('Old')
    expect(screen.queryByText(t.examples.forLevel('A2'))).toBeNull()

    fireEvent.click(radio('C1'))
    expect(
      screen.getByRole('button', { name: new RegExp(t.examples.generateFor('C1')) }),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: new RegExp(t.examples.more) })).toBeNull()
    expect(screen.getByText(t.examples.forLevel('A2'))).toBeTruthy()
    await new Promise((r) => setTimeout(r, 50))
    expect(generateExamples).not.toHaveBeenCalled()

    fireEvent.click(radio('A2'))
    expect(screen.getByRole('button', { name: new RegExp(t.examples.more) })).toBeTruthy()
    expect(screen.queryByText(t.examples.forLevel('A2'))).toBeNull()
  })

  it('keeps a space between the example and its hint in the accessible name', async () => {
    await renderSheet(true)
    expect(await screen.findByRole('button', { name: /\. Показать перевод/ })).toBeTruthy()
  })

  it('flags examples made for a different translation', async () => {
    await renderSheet(true, 'старый перевод')
    await screen.findByText('Old')
    expect(screen.getByText(t.examples.definitionChanged)).toBeTruthy()
  })

  it('does not flag examples whose translation matches or was never recorded', async () => {
    await renderSheet(true, 'слово')
    await screen.findByText('Old')
    expect(screen.queryByText(t.examples.definitionChanged)).toBeNull()
    cleanup()
    await db.cards.clear()
    await db.decks.clear()
    await renderSheet(true)
    await screen.findByText('Old')
    expect(screen.queryByText(t.examples.definitionChanged)).toBeNull()
  })
})
