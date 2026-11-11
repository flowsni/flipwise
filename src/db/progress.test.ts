import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { deleteCard } from './decks'
import { toggleStar } from './progress'

beforeEach(async () => {
  await db.cards.add({
    id: 'c1',
    deckId: 'd1',
    position: 0,
    term: 'ticket',
    definition: 'билет',
    createdAt: 1,
    updatedAt: 1,
  })
})

afterEach(async () => {
  await Promise.all([db.cards.clear(), db.progress.clear()])
})

describe('toggleStar', () => {
  it('stars and unstars without touching lastSeenAt', async () => {
    await db.progress.add({
      cardId: 'c1',
      deckId: 'd1',
      flash: 'known',
      learnStage: 1,
      correct: 2,
      wrong: 1,
      lastSeenAt: 42,
    })
    expect(await toggleStar('c1', 'd1')).toBe(true)
    expect(await db.progress.get('c1')).toMatchObject({ starred: true, lastSeenAt: 42, correct: 2 })
    expect(await toggleStar('c1', 'd1')).toBe(false)
    expect((await db.progress.get('c1'))?.starred).toBe(false)
  })

  it('creates a blank progress row for a card never studied', async () => {
    await toggleStar('c1', 'd1')
    expect(await db.progress.get('c1')).toMatchObject({
      flash: 'new',
      starred: true,
      lastSeenAt: 0,
    })
  })

  it('does nothing for a deleted card and is removed with the card', async () => {
    await toggleStar('c1', 'd1')
    await deleteCard('c1')
    expect(await db.progress.get('c1')).toBeUndefined()
    expect(await toggleStar('c1', 'd1')).toBe(false)
    expect(await db.progress.get('c1')).toBeUndefined()
  })
})
