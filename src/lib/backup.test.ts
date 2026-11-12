import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FlipwiseDB } from '../db/db'
import { exportAll, exportDeck, importBackup, parseBackup } from './backup'

let db: FlipwiseDB
let n = 0

beforeEach(async () => {
  db = new FlipwiseDB(`test-${n++}`)
  await db.decks.add({
    id: 'd1',
    title: 'Travel',
    termLang: 'en',
    defLang: 'ru',
    level: 'B1',
    createdAt: 1,
    updatedAt: 1,
  })
  await db.cards.bulkAdd([
    {
      id: 'c1',
      deckId: 'd1',
      position: 0,
      term: 'ticket',
      definition: 'билет',
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'c2',
      deckId: 'd1',
      position: 1,
      term: 'luggage',
      definition: 'багаж',
      createdAt: 1,
      updatedAt: 1,
    },
  ])
  await db.progress.add({
    cardId: 'c1',
    deckId: 'd1',
    flash: 'known',
    learnStage: 2,
    correct: 3,
    wrong: 0,
    lastSeenAt: 5,
  })
})

afterEach(async () => {
  await db.delete()
})

describe('backup', () => {
  it('round-trips through JSON', async () => {
    const backup = await exportAll(db)
    const parsed = parseBackup(JSON.stringify(backup))
    expect(parsed.decks).toHaveLength(1)
    expect(parsed.cards).toHaveLength(2)
    expect(parsed.progress).toHaveLength(1)
  })

  it('keeps favourites in a full backup but not in a shared deck', async () => {
    await db.progress.update('c1', { starred: true })
    const parsed = parseBackup(JSON.stringify(await exportAll(db)))
    expect(parsed.progress[0]!.starred).toBe(true)
    await importBackup(db, parsed, 'replace')
    expect((await db.progress.get('c1'))?.starred).toBe(true)
    const shared = parseBackup(JSON.stringify(await exportDeck(db, 'd1')))
    expect(shared.progress).toEqual([])
  })

  it('keeps the level and translation of generated examples', async () => {
    const examples = {
      items: [{ text: 'My [[ticket]].', translation: 'Мой [[билет]].' }],
      provider: 'anthropic',
      model: 'm',
      createdAt: 2,
      level: 'A2' as const,
      definition: 'билет',
    }
    await db.cards.update('c1', { examples })
    const parsed = parseBackup(JSON.stringify(await exportDeck(db, 'd1')))
    expect(parsed.cards.find((c) => c.term === 'ticket')?.examples).toEqual(examples)
  })

  it('rejects foreign or broken files', () => {
    expect(() => parseBackup('nope')).toThrow('not-json')
    expect(() => parseBackup(JSON.stringify({ app: 'other' }))).toThrow('invalid')
  })

  it('replace wipes existing data', async () => {
    const backup = await exportAll(db)
    await db.decks.add({
      id: 'd2',
      title: 'Extra',
      termLang: 'en',
      defLang: 'ru',
      level: 'A1',
      createdAt: 1,
      updatedAt: 1,
    })
    await importBackup(db, backup, 'replace')
    expect(await db.decks.count()).toBe(1)
    expect(await db.progress.count()).toBe(1)
  })

  it('merge assigns new ids on conflict', async () => {
    const backup = await exportAll(db)
    await importBackup(db, backup, 'merge')
    expect(await db.decks.count()).toBe(2)
    expect(await db.cards.count()).toBe(4)
    const decks = await db.decks.toArray()
    const copy = decks.find((d) => d.id !== 'd1')!
    expect(await db.cards.where('deckId').equals(copy.id).count()).toBe(2)
    expect(await db.progress.where('deckId').equals(copy.id).count()).toBe(1)
  })

  it('shared deck files become new decks without progress', async () => {
    const shared = parseBackup(JSON.stringify(await exportDeck(db, 'd1')))
    expect(shared.kind).toBe('deck')
    expect(shared.progress).toEqual([])
    await importBackup(db, shared, 'merge')
    expect(await db.decks.count()).toBe(2)
    expect(await db.progress.count()).toBe(1)
  })
})

describe('parseBackup progress', () => {
  it('takes the deck of a progress row from its card', async () => {
    const backup = await exportAll(db)
    const tampered = {
      ...backup,
      progress: backup.progress.map((p) => ({ ...p, deckId: 'ghost' })),
    }
    expect(parseBackup(JSON.stringify(tampered)).progress[0]!.deckId).toBe('d1')
  })
})
