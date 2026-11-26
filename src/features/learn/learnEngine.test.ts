import { describe, expect, it } from 'vitest'
import type { LearnCard } from '@/features/study/cards'
import { seededRng } from '@/lib'
import {
  changeTypes,
  createLearnState,
  isFinished,
  isLearned,
  type LearnType,
  nextQuestion,
  overallProgress,
  overrideLastWrong,
  persistedStage,
  ROUND_SIZE,
  roundProgress,
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

describe('learn engine', () => {
  it('starts a round of up to 7 cards with a choice question', () => {
    const s = createLearnState(cards, 'definition', ['choice', 'written'], seededRng(2))
    expect(s.round.queue).toHaveLength(ROUND_SIZE)
    expect(s.current?.kind).toBe('choice')
    expect(s.current?.options).toHaveLength(4)
    expect(s.current?.options).toContain(s.current?.answer)
  })

  it('uses fewer options for tiny decks', () => {
    const s = createLearnState(cards.slice(0, 2), 'term', ['choice', 'written'], seededRng(3))
    expect(s.current?.options).toHaveLength(2)
  })

  it('promotes on correct answer and requeues 2–3 positions later on a wrong one', () => {
    let s = createLearnState(cards, 'definition', ['choice', 'written'], seededRng(4))
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
    let s = createLearnState(cards.slice(0, 2), 'term', ['choice', 'written'], seededRng(6))
    s = { ...s, stage: { c0: 1, c1: 1 } }
    s = startRound({ ...s, round: { ...s.round, queue: [] } }, cards.slice(0, 2), seededRng(7))
    expect(s.current?.kind).toBe('written')
    const res = submitAnswer(s, `${s.current!.answer}x`)
    expect(res.match.verdict).toBe('almost')
    expect(res.correct).toBe(true)
  })

  it('lets the learner override a wrong verdict', () => {
    const s = createLearnState(cards, 'definition', ['choice', 'written'], seededRng(8))
    const id = s.current!.cardId
    const overridden = overrideLastWrong(s)
    expect(overridden.stage[id]).toBe(1)
    expect(overridden.round.queue).not.toContain(id)
  })

  it('finishes when every card reached stage 2', () => {
    const rng = seededRng(9)
    let s = createLearnState(cards, 'definition', ['choice', 'written'], rng)
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
    let s = createLearnState(cards.slice(0, 3), 'definition', ['choice', 'written'], rng, {
      c0: 1,
      c1: 1,
      c2: 1,
    })
    while (!s.roundOver) s = nextQuestion(answerCorrectly(s).state, cards, rng)
    expect(s.round.learned.sort()).toEqual(['c0', 'c1', 'c2'])
  })

  it('survives JSON round-trips and deleted cards', () => {
    const s = createLearnState(cards, 'definition', ['choice', 'written'], seededRng(11))
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
    let s = createLearnState(cards, 'definition', ['choice', 'written'], rng, {}, ['c3', 'c7'])
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
    const s = createLearnState(cards, 'definition', ['choice', 'written'], seededRng(12))
    expect(s.answered).toBe(false)
    const after = submitAnswer(s, 'nope').state
    expect(after.answered).toBe(true)
    expect(nextQuestion(after, cards, seededRng(13)).answered).toBe(false)
  })
})

describe('roundProgress', () => {
  it('counts correct answers in the round and un-counts a card answered wrong', () => {
    let s = createLearnState(cards, 'definition', ['choice', 'written'], seededRng(3))
    expect(roundProgress(s)).toEqual({ done: 0, total: ROUND_SIZE })
    s = nextQuestion(answerCorrectly(s).state, cards)
    expect(roundProgress(s)).toEqual({ done: 1, total: ROUND_SIZE })
    s = nextQuestion(submitAnswer(s, 'nope').state, cards)
    expect(roundProgress(s)).toEqual({ done: 1, total: ROUND_SIZE })
  })
})

describe('question types', () => {
  const kinds = (types: LearnType[]) => {
    let s = createLearnState(cards, 'definition', types, seededRng(5), {}, ['c0'])
    const seen: string[] = []
    while (s.current) {
      seen.push(s.current.kind)
      const response = s.current.kind === 'flashcard' ? 'know' : s.current.answer
      s = nextQuestion(submitAnswer(s, response).state, cards, seededRng(1))
      if (!s.current && !isFinished(s)) s = startRound(s, cards, seededRng(1))
    }
    return seen
  }

  it('walks the ladder in the fixed order', () => {
    expect(kinds(['written', 'flashcard', 'choice'])).toEqual(['flashcard', 'choice', 'written'])
    expect(kinds(['written', 'choice'])).toEqual(['choice', 'written'])
  })
  it('asks a single type twice', () => {
    expect(kinds(['flashcard'])).toEqual(['flashcard', 'flashcard'])
  })
  it('flashcard: only "know" is correct, a wrong answer resets the stage', () => {
    const s = createLearnState(cards, 'definition', ['flashcard'], seededRng(6))
    const id = s.current!.cardId
    expect(submitAnswer(s, 'know').correct).toBe(true)
    const bad = submitAnswer(s, 'dontknow')
    expect(bad.correct).toBe(false)
    expect(bad.state.stage[id]).toBe(0)
  })
  it('three types: progress and persisted stage cover every step', () => {
    const types: LearnType[] = ['flashcard', 'choice', 'written']
    const s = createLearnState(cards.slice(0, 2), 'definition', types, seededRng(7))
    const id = s.order[0] as string
    const at = (n: number) => ({ ...s, stage: { [id]: n } })
    expect([0, 1, 2, 3].map((n) => persistedStage(at(n), id))).toEqual([0, 1, 1, 2])
    expect(overallProgress(at(3))).toBeCloseTo(3 / 6)
  })
  it('reads a v1 save without types as choice → written', () => {
    const { types: _drop, ...old } = createLearnState(cards, 'definition', ['choice'], seededRng(8))
    const v1 = { ...old, version: 1 as const }
    expect(v1.current!.kind).toBe('choice')
    expect(isLearned({ ...v1, stage: { c0: 2 } }, 'c0')).toBe(true)
    expect(isLearned({ ...v1, stage: { c0: 1 } }, 'c0')).toBe(false)
  })

  it('changeTypes drops the removed type and keeps the rest', () => {
    const all: LearnType[] = ['flashcard', 'choice', 'written']
    const s = createLearnState(cards, 'definition', all, seededRng(9), {}, ['c0', 'c1', 'c2'])
    const staged = { ...s, stage: { c0: 2, c1: 3, c2: 0 } }
    const out = changeTypes(staged, ['flashcard', 'written'], cards, seededRng(1))
    // c0 passed flashcard + choice → only flashcard counts; c1 was learned and stays learned.
    expect(out.stage).toEqual({ c0: 1, c1: 2, c2: 0 })
    expect(out.types).toEqual(['flashcard', 'written'])
  })
  it('changeTypes never makes an unlearned card learned', () => {
    const all: LearnType[] = ['flashcard', 'choice', 'written']
    const s = createLearnState(cards, 'definition', all, seededRng(9), {}, ['c0'])
    const out = changeTypes(
      { ...s, stage: { c0: 2 } },
      ['flashcard', 'choice'],
      cards,
      seededRng(1),
    )
    expect(out.stage.c0).toBe(1)
    expect(isLearned(out, 'c0')).toBe(false)
  })
  it('changeTypes asks the question in the new ladder', () => {
    const s = createLearnState(cards, 'definition', ['choice', 'written'], seededRng(3), {}, ['c0'])
    expect(changeTypes(s, ['flashcard'], cards, seededRng(1)).current!.kind).toBe('flashcard')
  })
})
