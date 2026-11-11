import { z } from 'zod'
import type { FlipwiseDB } from '../db/db'
import { LEVELS } from '../db/types'
import { newId } from './ids'

const BACKUP_VERSION = 1

const exampleItem = z.object({ text: z.string(), translation: z.string() })

const deckSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string().optional(),
  termLang: z.string(),
  defLang: z.string(),
  level: z.enum(LEVELS),
  createdAt: z.number(),
  updatedAt: z.number(),
})

const cardSchema = z.object({
  id: z.string().min(1),
  deckId: z.string().min(1),
  position: z.number(),
  term: z.string(),
  definition: z.string(),
  imageId: z.string().optional(),
  examples: z
    .object({
      items: z.array(exampleItem),
      provider: z.string(),
      model: z.string(),
      createdAt: z.number(),
    })
    .optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

const progressSchema = z.object({
  cardId: z.string().min(1),
  deckId: z.string().min(1),
  flash: z.enum(['new', 'learning', 'known']),
  learnStage: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  correct: z.number(),
  wrong: z.number(),
  lastSeenAt: z.number(),
  starred: z.boolean().optional(),
})

const backupSchema = z.object({
  app: z.literal('flipwise'),
  version: z.number().int().min(1).max(BACKUP_VERSION),
  kind: z.enum(['backup', 'deck']).default('backup'),
  exportedAt: z.number(),
  decks: z.array(deckSchema),
  cards: z.array(cardSchema),
  progress: z.array(progressSchema).default([]),
})

export type Backup = z.infer<typeof backupSchema>

export async function exportAll(db: FlipwiseDB): Promise<Backup> {
  const [decks, cards, progress] = await Promise.all([
    db.decks.toArray(),
    db.cards.toArray(),
    db.progress.toArray(),
  ])
  return {
    app: 'flipwise',
    version: BACKUP_VERSION,
    kind: 'backup',
    exportedAt: Date.now(),
    decks,
    cards,
    progress,
  }
}

/** A single deck to share with a friend: cards only, without personal progress. */
export async function exportDeck(db: FlipwiseDB, deckId: string): Promise<Backup> {
  const deck = await db.decks.get(deckId)
  if (!deck) throw new Error('Deck not found')
  const cards = await db.cards.where('deckId').equals(deckId).toArray()
  return {
    app: 'flipwise',
    version: BACKUP_VERSION,
    kind: 'deck',
    exportedAt: Date.now(),
    decks: [deck],
    cards,
    progress: [],
  }
}

export class BackupError extends Error {}

export function parseBackup(text: string): Backup {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new BackupError('not-json')
  }
  const result = backupSchema.safeParse(json)
  if (!result.success) throw new BackupError('invalid')
  const data = result.data
  const deckIds = new Set(data.decks.map((d) => d.id))
  const cards = data.cards.filter((c) => deckIds.has(c.deckId))
  const cardIds = new Set(cards.map((c) => c.id))
  // Progress always follows its card's deck, whatever deckId the file claims.
  const deckOfCard = new Map(cards.map((c) => [c.id, c.deckId]))
  const progress = data.progress
    .filter((p) => cardIds.has(p.cardId))
    .map((p) => ({ ...p, deckId: deckOfCard.get(p.cardId)! }))
  return { ...data, cards, progress }
}

export type ImportMode = 'replace' | 'merge'

/**
 * Imports a backup. "replace" wipes everything first. "merge" adds data, giving new ids to decks
 * whose id already exists (so nothing is overwritten). Shared single-deck files always become
 * new decks. Returns the number of imported decks.
 */
export async function importBackup(
  db: FlipwiseDB,
  backup: Backup,
  mode: ImportMode,
): Promise<number> {
  return db.transaction('rw', [db.decks, db.cards, db.progress, db.sessions], async () => {
    if (mode === 'replace') {
      await Promise.all([
        db.decks.clear(),
        db.cards.clear(),
        db.progress.clear(),
        db.sessions.clear(),
      ])
    }
    const existingDecks = new Set((await db.decks.toCollection().primaryKeys()) as string[])
    const existingCards = new Set((await db.cards.toCollection().primaryKeys()) as string[])
    const forceNew = backup.kind === 'deck'
    const deckIdMap = new Map<string, string>()
    const cardIdMap = new Map<string, string>()
    const now = Date.now()
    for (const d of backup.decks) {
      deckIdMap.set(d.id, forceNew || existingDecks.has(d.id) ? newId() : d.id)
    }
    for (const c of backup.cards) {
      const deckRemapped = deckIdMap.get(c.deckId) !== c.deckId
      cardIdMap.set(c.id, deckRemapped || existingCards.has(c.id) ? newId() : c.id)
    }
    await db.decks.bulkAdd(
      backup.decks.map((d) => ({
        ...d,
        id: deckIdMap.get(d.id)!,
        ...(forceNew ? { createdAt: now, updatedAt: now } : {}),
      })),
    )
    await db.cards.bulkAdd(
      backup.cards.map((c) => ({
        ...c,
        id: cardIdMap.get(c.id)!,
        deckId: deckIdMap.get(c.deckId)!,
      })),
    )
    if (!forceNew) {
      await db.progress.bulkPut(
        backup.progress.map((p) => ({
          ...p,
          cardId: cardIdMap.get(p.cardId)!,
          deckId: deckIdMap.get(p.deckId)!,
        })),
      )
    }
    return backup.decks.length
  })
}

export function backupFileName(backup: Backup): string {
  const date = new Date(backup.exportedAt).toISOString().slice(0, 10)
  if (backup.kind === 'deck') {
    const slug = (backup.decks[0]?.title ?? 'deck')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40)
    return `flipwise-${slug || 'deck'}.json`
  }
  return `flipwise-backup-${date}.json`
}
