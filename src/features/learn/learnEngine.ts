/**
 * Learn mode as a pure state machine.
 *
 * Cards are studied in rounds of up to 7. Each card climbs stages:
 *   0 → multiple choice, 1 → typed answer, 2 → learned.
 * A correct answer moves the card one stage up and out of the current round.
 * A wrong answer resets the card to stage 0 and re-queues it 2–3 positions later in the same round.
 * The state is plain JSON so it can be saved and resumed.
 */

import type { AnswerSide } from '../../db/types'
import { type MatchResult, matchAnswer } from '../../lib/answerMatch'
import { type Rng, shuffle } from '../../lib/shuffle'

export const ROUND_SIZE = 7
export const MIN_CARDS = 2
const CHOICES = 4

export interface LearnCard {
  id: string
  term: string
  definition: string
}

export type Stage = 0 | 1 | 2

export interface LearnQuestion {
  cardId: string
  kind: 'choice' | 'written'
  /** Shown side. */
  prompt: string
  /** Expected answer (original spelling). */
  answer: string
  /** Choice options, includes the answer. */
  options?: string[]
}

export interface LearnState {
  version: 1
  answerWith: AnswerSide
  /** Study order of all cards. */
  order: string[]
  stage: Record<string, Stage>
  round: {
    number: number
    queue: string[]
    /** Cards that reached stage 2 during this round. */
    learned: string[]
    total: number
    answered: number
  }
  current: LearnQuestion | null
  /** Round is over and the summary screen should be shown. */
  roundOver: boolean
  /** The current question was answered; feedback is showing and `nextQuestion` must run next. */
  answered?: boolean
}

export interface AnswerOutcome {
  state: LearnState
  correct: boolean
  match: MatchResult
}

function answerOf(card: LearnCard, side: AnswerSide): string {
  return side === 'term' ? card.term : card.definition
}

function promptOf(card: LearnCard, side: AnswerSide): string {
  return side === 'term' ? card.definition : card.term
}

/**
 * Picks wrong options from the same deck: unique answers that differ from the correct one,
 * preferring similar length.
 */
export function pickDistractors(
  correct: string,
  pool: readonly string[],
  count: number,
  rng: Rng,
): string[] {
  const key = (s: string) => s.trim().toLowerCase()
  const seen = new Set([key(correct)])
  const candidates: string[] = []
  for (const p of pool) {
    const k = key(p)
    if (!k || seen.has(k)) continue
    seen.add(k)
    candidates.push(p)
  }
  return candidates
    .map((c) => ({
      c,
      score: Math.abs(c.length - correct.length) / Math.max(correct.length, 1) + rng() * 0.6,
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map((x) => x.c)
}

export function createLearnState(
  cards: readonly LearnCard[],
  answerWith: AnswerSide,
  rng: Rng = Math.random,
  initialStage: Record<string, Stage> = {},
): LearnState {
  const order = shuffle(
    cards.map((c) => c.id),
    rng,
  )
  const stage: Record<string, Stage> = {}
  for (const id of order) stage[id] = initialStage[id] ?? 0
  const state: LearnState = {
    version: 1,
    answerWith,
    order,
    stage,
    round: { number: 0, queue: [], learned: [], total: 0, answered: 0 },
    current: null,
    roundOver: false,
  }
  return startRound(state, cards, rng)
}

export function isFinished(state: LearnState): boolean {
  return state.order.every((id) => state.stage[id] === 2)
}

/** Overall progress 0..1: every card needs two correct answers. */
export function overallProgress(state: LearnState): number {
  if (!state.order.length) return 1
  const sum = state.order.reduce((acc, id) => acc + (state.stage[id] ?? 0), 0)
  return sum / (state.order.length * 2)
}

export function startRound(
  state: LearnState,
  cards: readonly LearnCard[],
  rng: Rng = Math.random,
): LearnState {
  // Cards already in progress go first so a batch is finished before new cards appear.
  const pending = state.order.filter((id) => state.stage[id] !== 2)
  const inProgress = pending.filter((id) => state.stage[id] === 1)
  const fresh = pending.filter((id) => state.stage[id] === 0)
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
  const kind = (state.stage[cardId] ?? 0) === 0 ? 'choice' : 'written'
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
    q.kind === 'choice'
      ? response === q.answer
        ? { verdict: 'correct', matched: q.answer }
        : { verdict: 'wrong' }
      : matchAnswer(response, q.answer, lang)
  const correct = match.verdict !== 'wrong'
  return { state: applyResult(state, correct), correct, match }
}

/** Records a verdict. Also used by «Я был прав» to flip a wrong verdict to correct. */
export function applyResult(state: LearnState, correct: boolean): LearnState {
  const q = state.current
  if (!q) throw new Error('No active question')
  const id = q.cardId
  const queue = state.round.queue.slice(1)
  const stage = { ...state.stage }
  const learned = state.round.learned.slice()
  if (correct) {
    const nextStage = Math.min(2, (stage[id] ?? 0) + 1) as Stage
    stage[id] = nextStage
    if (nextStage === 2) learned.push(id)
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

/** Moves to the next question after feedback; marks the round as over when the queue is empty. */
export function nextQuestion(
  state: LearnState,
  cards: readonly LearnCard[],
  rng: Rng = Math.random,
): LearnState {
  if (state.round.queue.length === 0) return { ...state, current: null, roundOver: true }
  return withQuestion(state, cards, rng)
}
