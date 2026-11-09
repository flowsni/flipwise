import Dexie, { type EntityTable } from 'dexie'
import type { Card, Deck, Progress, StudySession } from './types'

export class FlipwiseDB extends Dexie {
  decks!: EntityTable<Deck, 'id'>
  cards!: EntityTable<Card, 'id'>
  progress!: EntityTable<Progress, 'cardId'>
  sessions!: EntityTable<StudySession, 'id'>

  constructor(name = 'flipwise') {
    super(name)
    // FSRS fields will be added to `progress` in a later version() migration.
    this.version(1).stores({
      decks: 'id, updatedAt',
      cards: 'id, deckId, [deckId+position]',
      progress: 'cardId, deckId',
      sessions: 'id, deckId',
    })
  }
}

export const db = new FlipwiseDB()
