import { newId } from '../lib/ids'
import { db } from './db'
import type { Card, Deck, Level, Progress, StudySession } from './types'

export interface DeckInput {
  title: string
  description?: string
  termLang: string
  defLang: string
  level: Level
}

export interface CardInput {
  id?: string
  term: string
  definition: string
}

export interface DeckSnapshot {
  decks: Deck[]
  cards: Card[]
  progress: Progress[]
  sessions: StudySession[]
}

export async function createDeck(input: DeckInput, cards: CardInput[] = []): Promise<string> {
  const now = Date.now()
  const deck: Deck = { id: newId(), ...input, createdAt: now, updatedAt: now }
  await db.transaction('rw', db.decks, db.cards, async () => {
    await db.decks.add(deck)
    await db.cards.bulkAdd(
      cards.map((c, i) => ({
        id: newId(),
        deckId: deck.id,
        position: i,
        term: c.term,
        definition: c.definition,
        createdAt: now,
        updatedAt: now,
      })),
    )
  })
  return deck.id
}

/** Saves the editor state: updates the deck, upserts cards in order, removes deleted ones. */
export async function saveDeck(
  deckId: string,
  input: DeckInput,
  cards: CardInput[],
): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', [db.decks, db.cards, db.progress, db.sessions], async () => {
    await db.decks.update(deckId, { ...input, updatedAt: now })
    const existing = await db.cards.where('deckId').equals(deckId).toArray()
    const byId = new Map(existing.map((c) => [c.id, c]))
    const keep = new Set<string>()
    const rows: Card[] = cards.map((c, position) => {
      const prev = c.id ? byId.get(c.id) : undefined
      if (prev) {
        keep.add(prev.id)
        const changed = prev.term !== c.term || prev.definition !== c.definition
        // Examples made before the translation was recorded: stamp the translation they were
        // written for, so ExamplesSheet can flag the mismatch instead of keeping them silently.
        const keptExamples =
          prev.term === c.term && prev.examples && prev.examples.definition === undefined
            ? { ...prev.examples, definition: prev.definition }
            : prev.examples
        return {
          ...prev,
          position,
          term: c.term,
          definition: c.definition,
          // Examples are about the word: a changed term drops them, a corrected translation
          // keeps them (ExamplesSheet flags the mismatch via `examples.definition`).
          examples: prev.term !== c.term ? undefined : keptExamples,
          updatedAt: changed ? now : prev.updatedAt,
        }
      }
      return {
        id: newId(),
        deckId,
        position,
        term: c.term,
        definition: c.definition,
        createdAt: now,
        updatedAt: now,
      }
    })
    const removed = existing.filter((c) => !keep.has(c.id)).map((c) => c.id)
    await db.cards.bulkDelete(removed)
    await db.progress.bulkDelete(removed)
    await db.cards.bulkPut(rows)
  })
}

export async function appendCards(deckId: string, cards: CardInput[]): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.decks, db.cards, async () => {
    const last = await db.cards
      .where('[deckId+position]')
      .between([deckId, -Infinity], [deckId, Infinity])
      .last()
    const start = (last?.position ?? -1) + 1
    await db.cards.bulkAdd(
      cards.map((c, i) => ({
        id: newId(),
        deckId,
        position: start + i,
        term: c.term,
        definition: c.definition,
        createdAt: now,
        updatedAt: now,
      })),
    )
    await db.decks.update(deckId, { updatedAt: now })
  })
}

export async function deleteDeck(deckId: string): Promise<DeckSnapshot> {
  return db.transaction('rw', [db.decks, db.cards, db.progress, db.sessions], async () => {
    const deck = await db.decks.get(deckId)
    const snapshot: DeckSnapshot = {
      decks: deck ? [deck] : [],
      cards: await db.cards.where('deckId').equals(deckId).toArray(),
      progress: await db.progress.where('deckId').equals(deckId).toArray(),
      sessions: await db.sessions.where('deckId').equals(deckId).toArray(),
    }
    await db.decks.delete(deckId)
    await db.cards.where('deckId').equals(deckId).delete()
    await db.progress.where('deckId').equals(deckId).delete()
    await db.sessions.where('deckId').equals(deckId).delete()
    return snapshot
  })
}

export async function deleteCard(cardId: string): Promise<DeckSnapshot> {
  return db.transaction('rw', [db.cards, db.progress], async () => {
    const card = await db.cards.get(cardId)
    const progress = await db.progress.get(cardId)
    await db.cards.delete(cardId)
    await db.progress.delete(cardId)
    return {
      decks: [],
      cards: card ? [card] : [],
      progress: progress ? [progress] : [],
      sessions: [],
    }
  })
}

export async function restoreSnapshot(s: DeckSnapshot): Promise<void> {
  await db.transaction('rw', [db.decks, db.cards, db.progress, db.sessions], async () => {
    await db.decks.bulkPut(s.decks)
    await db.cards.bulkPut(s.cards)
    await db.progress.bulkPut(s.progress)
    await db.sessions.bulkPut(s.sessions)
  })
}

export function getDeckCards(deckId: string): Promise<Card[]> {
  return db.cards
    .where('[deckId+position]')
    .between([deckId, -Infinity], [deckId, Infinity])
    .toArray()
}

/**
 * Writes examples only to cards that still have the text they were made for: the editor drops
 * examples when a card changes, and a slow generation must not attach them to the new word.
 * Deleted cards are skipped. With `replacing`, only cards whose current examples have that
 * `createdAt` are written (undo of one run leaves examples made since alone).
 * One transaction for all; returns how many cards were written.
 */
export async function setExamplesIfUnchanged(
  entries: readonly {
    card: Pick<Card, 'id' | 'term' | 'definition'>
    examples: Card['examples']
  }[],
  options: { replacing?: number } = {},
): Promise<number> {
  return db.transaction('rw', db.cards, async () => {
    const current = await db.cards.bulkGet(entries.map((e) => e.card.id))
    let written = 0
    for (const [i, { card: sent, examples }] of entries.entries()) {
      const card = current[i]
      if (!card || card.term !== sent.term || card.definition !== sent.definition) continue
      if (options.replacing !== undefined && card.examples?.createdAt !== options.replacing)
        continue
      await db.cards.update(sent.id, { examples })
      written++
    }
    return written
  })
}

export async function updateCardExamples(
  cardId: string,
  examples: Card['examples'],
): Promise<void> {
  await db.cards.update(cardId, { examples })
}
