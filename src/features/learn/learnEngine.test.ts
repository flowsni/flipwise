import { describe, expect, it } from 'vitest'
import { seededRng } from '../../lib/shuffle'
import {
  createLearnState,
  isFinished,
  type LearnCard,
  nextQuestion,
  overallProgress,
  overrideLastWrong,
  pickDistractors,
  ROUND_SIZE,
  startRound,
  submitAnswer,
} from './learnEngine'

const cards: LearnCard[] = Array.from({ length: 10 }, (_, i) => ({
  id: `c${i}`,
  term: `term${i}`,
  definition: `definition number ${i}`,
}))

function answerCorrectly(state: ReturnType<typeof createLearnState>) {
  const q = state.current!
  return submitAnswer(state, q.answer)
}

describe('pickDistractors', () => {
  it('never repeats the correct answer and dedupes', () => {
    const rng = seededRng(1)
    const out = pickDistractors('cat', ['Cat', 'dog', 'dog', 'cow', 'hippopotamus'], 3, rng)
    expect(out).not.toContain('Cat')
    expect(new Set(out).size).toBe(out.length)
    expect(out).toHaveLength(3)
  })
  it('prefers similar length', () => {
    const out = pickDistractors('cat', ['dog', 'a very long answer indeed', 'cow'], 2, () => 0)
    expect(out).toEqual(['dog', 'cow'])
  })
})

describe('learn engine', () => {
  it('starts a round of up to 7 cards with a choice question', () => {
    const s = createLearnState(cards, 'definition', seededRng(2))
    expect(s.round.queue).toHaveLength(ROUND_SIZE)
    expect(s.current?.kind).toBe('choice')
    expect(s.current?.options).toHaveLength(4)
    expect(s.current?.options).toContain(s.current?.answer)
  })

  it('uses fewer options for tiny decks', () => {
    const s = createLearnState(cards.slice(0, 2), 'term', seededRng(3))
    expect(s.current?.options).toHaveLength(2)
  })

  it('promotes on correct answer and requeues 2–3 positions later on a wrong one', () => {
    let s = createLearnState(cards, 'definition', seededRng(4))
    const first = s.current!.cardId
    const wrong = submitAnswer(s, 'nope')
    expect(wrong.correct).toBe(false)
    const idx = wrong.state.round.queue.indexOf(first)
    expect(idx === 2 || idx === 3).toBe(true)
    expect(wrong.state.stage[first]).toBe(0)

    s = nextQuestion(wrong.state, cards, seededRng(5))
    const ok = answerCorrectly(s)
    expect(ok.correct).toBe(true)
    expect(ok.state.stage[s.current!.cardId]).toBe(1)
    expect(ok.state.round.queue).not.toContain(s.current!.cardId)
  })

  it('accepts typos in written answers', () => {
    let s = createLearnState(cards.slice(0, 2), 'term', seededRng(6))
    s = { ...s, stage: { c0: 1, c1: 1 } }
    s = startRound({ ...s, round: { ...s.round, queue: [] } }, cards.slice(0, 2), seededRng(7))
    expect(s.current?.kind).toBe('written')
    const res = submitAnswer(s, `${s.current!.answer}x`)
    expect(res.match.verdict).toBe('almost')
    expect(res.correct).toBe(true)
  })

  it('lets the learner override a wrong verdict', () => {
    const s = createLearnState(cards, 'definition', seededRng(8))
    const id = s.current!.cardId
    const overridden = overrideLastWrong(s)
    expect(overridden.stage[id]).toBe(1)
    expect(overridden.round.queue).not.toContain(id)
  })

  it('finishes when every card reached stage 2', () => {
    const rng = seededRng(9)
    let s = createLearnState(cards, 'definition', rng)
    let guard = 0
    while (!isFinished(s) && guard++ < 200) {
      if (s.roundOver) {
        s = startRound(s, cards, rng)
        continue
      }
      s = nextQuestion(answerCorrectly(s).state, cards, rng)
    }
    expect(isFinished(s)).toBe(true)
    expect(overallProgress(s)).toBe(1)
    expect(s.round.number).toBeGreaterThan(2)
  })

  it('reports learned cards per round', () => {
    const rng = seededRng(10)
    let s = createLearnState(cards.slice(0, 3), 'definition', rng, { c0: 1, c1: 1, c2: 1 })
    while (!s.roundOver) s = nextQuestion(answerCorrectly(s).state, cards, rng)
    expect(s.round.learned.sort()).toEqual(['c0', 'c1', 'c2'])
  })

  it('survives JSON round-trips and deleted cards', () => {
    const s = createLearnState(cards, 'definition', seededRng(11))
    const restored = JSON.parse(JSON.stringify(s))
    const remaining = cards.filter((c) => c.id !== restored.round.queue[1])
    const next = nextQuestion(
      { ...restored, round: { ...restored.round, queue: restored.round.queue.slice(1) } },
      remaining,
    )
    expect(remaining.some((c) => c.id === next.current?.cardId)).toBe(true)
  })
})

describe('study scope', () => {
  it('studies only the chosen cards but draws distractors from the whole deck', () => {
    const rng = seededRng(14)
    let s = createLearnState(cards, 'definition', rng, {}, ['c3', 'c7'])
    expect(s.order.sort()).toEqual(['c3', 'c7'])
    expect(s.round.queue).toHaveLength(2)
    expect(s.current?.options).toHaveLength(4)
    let guard = 0
    while (!isFinished(s) && guard++ < 50) {
      if (s.roundOver) {
        s = startRound(s, cards, rng)
        continue
      }
      expect(['c3', 'c7']).toContain(s.current!.cardId)
      s = nextQuestion(answerCorrectly(s).state, cards, rng)
    }
    expect(isFinished(s)).toBe(true)
  })
})

describe('answered flag', () => {
  it('marks a question as answered until the next one is prepared', () => {
    const s = createLearnState(cards, 'definition', seededRng(12))
    expect(s.answered).toBe(false)
    const after = submitAnswer(s, 'nope').state
    expect(after.answered).toBe(true)
    expect(nextQuestion(after, cards, seededRng(13)).answered).toBe(false)
  })
})
