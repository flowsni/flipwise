/**
 * Learn mode as a pure state machine.
 *
 * Cards are studied in rounds of up to 7. Each card climbs a ladder of the enabled question
 * types (flashcard → choice → written; a single type is asked twice). Stage = index in the
 * ladder, and a card is learned once the stage reaches the ladder's length.
 * A correct answer moves the card one stage up and out of the current round.
 * A wrong answer resets the card to stage 0 and re-queues it 2–3 positions later in the same round.
 * The state is plain JSON so it can be saved and resumed.
 */

import type { AnswerSide } from '@/db'
import { answerOf, type LearnCard, pickDistractors, promptOf } from '@/features/study/cards'
import { type MatchResult, matchAnswer, type Rng, shuffle } from '@/lib'

export const ROUND_SIZE = 7
const CHOICES = 4

export type Stage = number

export type LearnType = 'flashcard' | 'choice' | 'written'
export const LEARN_TYPES: readonly LearnType[] = ['flashcard', 'choice', 'written']
const DEFAULT_TYPES: LearnType[] = ['choice', 'written']

export interface LearnQuestion {
  cardId: string
  kind: LearnType
  prompt: string
  /** Expected answer (original spelling). */
  answer: string
  options?: string[]
}

export interface LearnState {
  /** 1 = saved before question types existed (no `types`). */
  version: 1 | 2
  types?: LearnType[]
  answerWith: AnswerSide
  order: string[]
  stage: Record<string, Stage>
  round: {
    number: number
    queue: string[]
    learned: string[]
    total: number
    answered: number
  }
  current: LearnQuestion | null
  roundOver: boolean
  /** The current question was answered; feedback is showing and `nextQuestion` must run next. */
  answered?: boolean
}

export interface AnswerOutcome {
  state: LearnState
  correct: boolean
  match: MatchResult
}

export function typesOf(state: Pick<LearnState, 'types'>): LearnType[] {
  return state.types ?? DEFAULT_TYPES
}

function ladderOf(state: Pick<LearnState, 'types'>): LearnType[] {
  const enabled = LEARN_TYPES.filter((t) => typesOf(state).includes(t))
  return enabled.length === 1 ? [...enabled, ...enabled] : enabled
}

/** Stage as stored in card progress, which stays 0 / 1 / 2 whatever the ladder. */
export function persistedStage(state: LearnState, id: string): 0 | 1 | 2 {
  const stage = state.stage[id] ?? 0
  return isLearned(state, id) ? 2 : stage > 0 ? 1 : 0
}

/**
 * `onlyCardIds` limits the session to some cards (a study scope); distractors for choice
 * questions still come from the whole deck in `cards`.
 */
export function createLearnState(
  cards: readonly LearnCard[],
  answerWith: AnswerSide,
  types: LearnType[],
  rng: Rng = Math.random,
  initialStage: Record<string, Stage> = {},
  onlyCardIds?: readonly string[],
): LearnState {
  const only = onlyCardIds && new Set(onlyCardIds)
  const order = shuffle(
    cards.filter((c) => !only || only.has(c.id)).map((c) => c.id),
    rng,
  )
  const stage: Record<string, Stage> = {}
  for (const id of order) stage[id] = initialStage[id] ?? 0
  const state: LearnState = {
    version: 2,
    types,
    answerWith,
    order,
    stage,
    round: { number: 0, queue: [], learned: [], total: 0, answered: 0 },
    current: null,
    roundOver: false,
  }
  return startRound(state, cards, rng)
}

export function isLearned(state: Pick<LearnState, 'stage' | 'types'>, id: string): boolean {
  return (state.stage[id] ?? 0) >= ladderOf(state).length
}

export function isFinished(state: LearnState): boolean {
  return state.order.every((id) => isLearned(state, id))
}

export function acceptLearnSession(s: Partial<LearnState>): boolean {
  return (s.version === 1 || s.version === 2) && !!s.order?.length
}

/** Overall progress 0..1: every card needs one correct answer per ladder step. */
export function overallProgress(state: LearnState): number {
  if (!state.order.length) return 1
  const steps = ladderOf(state).length
  const sum = state.order.reduce((acc, id) => acc + Math.min(state.stage[id] ?? 0, steps), 0)
  return sum / (state.order.length * steps)
}

/** Cards of the current round already answered correctly (a wrong answer puts a card back). */
export function roundProgress(state: LearnState): { done: number; total: number } {
  const { queue, total } = state.round
  return { done: total - new Set(queue).size, total }
}

export function startRound(
  state: LearnState,
  cards: readonly LearnCard[],
  rng: Rng = Math.random,
): LearnState {
  // Cards already in progress go first so a batch is finished before new cards appear.
  const pending = state.order.filter((id) => !isLearned(state, id))
  const inProgress = pending.filter((id) => (state.stage[id] ?? 0) > 0)
  const fresh = pending.filter((id) => !state.stage[id])
  const queue = [...inProgress, ...fresh].slice(0, ROUND_SIZE)
  const next: LearnState = {
    ...state,
    round: {
      number: state.round.number + 1,
      queue: shuffle(queue, rng),
      learned: [],
      total: queue.length,
      answered: 0,
    },
    roundOver: queue.length === 0,
    current: null,
  }
  return withQuestion(next, cards, rng)
}

function withQuestion(state: LearnState, cards: readonly LearnCard[], rng: Rng): LearnState {
  const cardId = state.round.queue[0]
  if (!cardId) return { ...state, current: null, roundOver: true }
  const byId = new Map(cards.map((c) => [c.id, c]))
  const card = byId.get(cardId)
  if (!card) {
    // Card was deleted while the session was paused: drop it.
    const { [cardId]: _removed, ...stage } = state.stage
    return withQuestion(
      {
        ...state,
        order: state.order.filter((id) => id !== cardId),
        stage,
        round: { ...state.round, queue: state.round.queue.slice(1) },
      },
      cards,
      rng,
    )
  }
  const side = state.answerWith
  const answer = answerOf(card, side)
  const kind = ladderOf(state)[state.stage[cardId] ?? 0] ?? 'written'
  const question: LearnQuestion = { cardId, kind, prompt: promptOf(card, side), answer }
  if (kind === 'choice') {
    const pool = cards.filter((c) => c.id !== cardId).map((c) => answerOf(c, side))
    question.options = shuffle([answer, ...pickDistractors(answer, pool, CHOICES - 1, rng)], rng)
  }
  return { ...state, current: question, answered: false }
}

/**
 * Applies an answer. For choice questions pass the selected option; for written ones the text.
 * `lang` is the language of the expected answer (used for article stripping).
 */
export function submitAnswer(state: LearnState, response: string, lang?: string): AnswerOutcome {
  const q = state.current
  if (!q) throw new Error('No active question')
  const match: MatchResult =
    q.kind === 'written'
      ? matchAnswer(response, q.answer, lang)
      : (q.kind === 'flashcard' ? response === 'know' : response === q.answer)
        ? { verdict: 'correct', matched: q.answer }
        : { verdict: 'wrong' }
  const correct = match.verdict !== 'wrong'
  return { state: applyResult(state, correct), correct, match }
}

/** Records a verdict. Also used by «Я был прав» to flip a wrong verdict to correct. */
function applyResult(state: LearnState, correct: boolean): LearnState {
  const q = state.current
  if (!q) throw new Error('No active question')
  const id = q.cardId
  const queue = state.round.queue.slice(1)
  const stage = { ...state.stage }
  const learned = state.round.learned.slice()
  if (correct) {
    stage[id] = (stage[id] ?? 0) + 1
    if (isLearned({ stage, types: state.types }, id)) learned.push(id)
  } else {
    stage[id] = 0
    // Show the card again 2–3 positions later (or at the end of a short queue).
    const offset = queue.length >= 3 ? 2 + (queue.length % 2) : queue.length
    queue.splice(offset, 0, id)
  }
  return {
    ...state,
    stage,
    round: { ...state.round, queue, learned, answered: state.round.answered + 1 },
    answered: true,
    // The next question is prepared by `nextQuestion` after feedback is shown.
  }
}

/** Overrides the last wrong verdict («Я был прав»). Call on the state returned by submitAnswer. */
export function overrideLastWrong(before: LearnState): LearnState {
  return applyResult(before, true)
}

/**
 * Switches the question types mid-session without a restart. A card keeps the steps of the new
 * ladder it has already passed (by type); steps of a removed type are dropped. Learned cards stay
 * learned, but no card becomes learned here: that needs a real answer, which is what records it
 * in the card's saved progress.
 * shortcut: progress is a count, not a set, so a type added in front of passed steps is not asked
 * for them again and the card may repeat a type once; upgrade by storing passed types per card.
 */
export function changeTypes(
  state: LearnState,
  types: LearnType[],
  cards: readonly LearnCard[],
  rng: Rng = Math.random,
): LearnState {
  const from = ladderOf(state)
  const next: LearnState = { ...state, version: 2, types }
  const to = ladderOf(next)
  const stage: Record<string, Stage> = {}
  for (const id of state.order) {
    const s = state.stage[id] ?? 0
    if (s >= from.length) {
      stage[id] = to.length
      continue
    }
    const left = from.slice(0, s)
    const passed = to.filter((k) => {
      const i = left.indexOf(k)
      if (i >= 0) left.splice(i, 1)
      return i >= 0
    }).length
    stage[id] = Math.min(passed, to.length - 1)
  }
  return withQuestion({ ...next, stage }, cards, rng)
}

export function nextQuestion(
  state: LearnState,
  cards: readonly LearnCard[],
  rng: Rng = Math.random,
): LearnState {
  if (state.round.queue.length === 0) return { ...state, current: null, roundOver: true }
  return withQuestion(state, cards, rng)
}
