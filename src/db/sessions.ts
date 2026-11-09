import { db } from './db'
import type { StudyMode } from './types'

export function sessionId(deckId: string, mode: StudyMode): string {
  return `${deckId}:${mode}`
}

export async function loadSession<T>(deckId: string, mode: StudyMode): Promise<T | undefined> {
  const s = await db.sessions.get(sessionId(deckId, mode))
  return s?.state as T | undefined
}

export async function saveSession(deckId: string, mode: StudyMode, state: unknown): Promise<void> {
  await db.sessions.put({ id: sessionId(deckId, mode), deckId, mode, state, updatedAt: Date.now() })
}

export async function clearSession(deckId: string, mode: StudyMode): Promise<void> {
  await db.sessions.delete(sessionId(deckId, mode))
}
