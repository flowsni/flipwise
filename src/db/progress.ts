import { db } from './db'
import type { FlashStatus, Progress } from './types'

function blank(cardId: string, deckId: string): Progress {
  return { cardId, deckId, flash: 'new', learnStage: 0, correct: 0, wrong: 0, lastSeenAt: 0 }
}

export async function updateProgress(
  cardId: string,
  deckId: string,
  patch: (p: Progress) => Partial<Progress>,
): Promise<Progress> {
  return db.transaction('rw', db.progress, async () => {
    const current = (await db.progress.get(cardId)) ?? blank(cardId, deckId)
    const next = { ...current, ...patch(current), lastSeenAt: Date.now() }
    await db.progress.put(next)
    return next
  })
}

export function setFlash(cardId: string, deckId: string, flash: FlashStatus) {
  return updateProgress(cardId, deckId, () => ({ flash }))
}

export function recordAnswer(
  cardId: string,
  deckId: string,
  correct: boolean,
  learnStage?: 0 | 1 | 2,
) {
  return updateProgress(cardId, deckId, (p) => ({
    correct: p.correct + (correct ? 1 : 0),
    wrong: p.wrong + (correct ? 0 : 1),
    ...(learnStage !== undefined ? { learnStage } : {}),
  }))
}

export async function resetFlash(deckId: string): Promise<void> {
  await db.progress.where('deckId').equals(deckId).modify({ flash: 'new' })
}

export async function resetLearn(deckId: string): Promise<void> {
  await db.progress.where('deckId').equals(deckId).modify({ learnStage: 0 })
}

/** A card counts as mastered when it is known in Flashcards or learned in Learn mode. */
export function isMastered(p: Progress | undefined): boolean {
  return !!p && (p.flash === 'known' || p.learnStage === 2)
}
