import type { Card, FlashStatus } from '@/db'
import type { SwipeDir } from '@/features/flashcards/SwipeCard'

export interface HistoryEntry {
  cardId: string
  /** Queue position the card was shown at, so undo returns exactly there. */
  index: number
  dir: SwipeDir
  prev: FlashStatus
}

/** The synchronous part of a round: what is queued, where we are, what was answered. */
export interface FlashSession {
  queue: string[]
  index: number
  history: HistoryEntry[]
  /** Which example each card shows this round; kept here so undo brings back the same one. */
  picked: Map<string, number>
  /** Part of the card key: a restart must remount the card even when it starts on the same one. */
  round: number
  enterFrom: SwipeDir | undefined
}

/** What «Отменить» after a restart brings back. */
export type RoundSnapshot = Pick<FlashSession, 'queue' | 'index' | 'history' | 'picked'>

export type FlashAction =
  | { type: 'swiped'; entry: HistoryEntry }
  | { type: 'undone' }
  /** The current card is gone (deleted mid-session, or lost its examples): move on. */
  | { type: 'skipped' }
  | { type: 'reordered'; queue: string[] }
  | { type: 'restarted'; queue: string[]; picked: Map<string, number> }
  | { type: 'restored'; before: RoundSnapshot }

export function createSession(queue: string[], picked: Map<string, number>): FlashSession {
  return { queue, index: 0, history: [], picked, round: 0, enterFrom: undefined }
}

export function flashSessionReducer(s: FlashSession, action: FlashAction): FlashSession {
  switch (action.type) {
    case 'swiped':
      return {
        ...s,
        history: [...s.history, action.entry],
        index: action.entry.index + 1,
        enterFrom: undefined,
      }
    case 'undone': {
      const last = s.history.at(-1)
      if (!last) return s
      return { ...s, history: s.history.slice(0, -1), index: last.index, enterFrom: last.dir }
    }
    case 'skipped':
      return { ...s, index: s.index + 1 }
    case 'reordered':
      return { ...s, queue: action.queue }
    case 'restarted':
      return {
        ...createSession(action.queue, action.picked),
        round: s.round + 1,
      }
    case 'restored':
      return { ...s, ...action.before, round: s.round + 1, enterFrom: undefined }
  }
}

export function sortByPosition(ids: string[], byId: Map<string, Card>): string[] {
  return ids.slice().sort((a, b) => (byId.get(a)?.position ?? 0) - (byId.get(b)?.position ?? 0))
}

/** Results of the round: the latest verdict per card. */
export function roundResults(history: HistoryEntry[], queue: string[]) {
  const verdicts = new Map(history.map((h) => [h.cardId, h.dir]))
  return {
    known: [...verdicts.values()].filter((d) => d === 1).length,
    learning: queue.filter((id) => verdicts.get(id) === -1),
  }
}
