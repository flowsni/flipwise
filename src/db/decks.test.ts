import { afterEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { createDeck, getDeckCards, saveDeck } from './decks'

afterEach(async () => {
  await Promise.all([db.decks.clear(), db.cards.clear(), db.progress.clear()])
})

const examples = {
  items: [{ text: 'A [[word]].', translation: 'с' }],
  provider: 'anthropic',
  model: 'm',
  createdAt: 1,
}
const meta = { title: 'D', termLang: 'en', defLang: 'ru', level: 'B1' as const }

describe('saveDeck examples', () => {
  async function setup() {
    const id = await createDeck(meta, [{ term: 'word', definition: 'слово' }])
    const [card] = await getDeckCards(id)
    await db.cards.update(card!.id, { examples })
    return { id, cardId: card!.id }
  }

  it('keeps examples when only the translation changes', async () => {
    const { id, cardId } = await setup()
    await saveDeck(id, meta, [{ id: cardId, term: 'word', definition: 'слово (сущ.)' }])
    const card = (await getDeckCards(id))[0]!
    expect(card.definition).toBe('слово (сущ.)')
    expect(card.examples).toMatchObject(examples)
  })

  it('drops examples when the word changes', async () => {
    const { id, cardId } = await setup()
    await saveDeck(id, meta, [{ id: cardId, term: 'words', definition: 'слово' }])
    expect((await getDeckCards(id))[0]!.examples).toBeUndefined()
  })

  it('records the old translation on legacy examples when the translation changes', async () => {
    const { id, cardId } = await setup() // examples without `definition`
    await saveDeck(id, meta, [{ id: cardId, term: 'word', definition: 'новое' }])
    expect((await getDeckCards(id))[0]!.examples).toEqual({ ...examples, definition: 'слово' })
  })
})
