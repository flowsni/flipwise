import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { LearnState } from '@/features/learn/learnEngine'
import { t } from '@/i18n/ru'
import { QuestionView } from '.'
import type { Feedback } from './types'

const question = {
  kind: 'flashcard',
  cardId: 'a',
  prompt: 'one',
  answer: 'один',
} as unknown as NonNullable<LearnState['current']>

const wrong = {
  correct: false,
  match: { verdict: 'wrong' },
  response: 'dontknow',
  before: {},
} as unknown as Feedback

// happy-dom's Animation.cancel() rejects `finished` unhandled; without native animate Motion runs in JS.
const nativeAnimate = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
beforeAll(() => {
  delete (Element.prototype as Partial<Element>).animate
})
afterAll(() => {
  if (nativeAnimate) Object.defineProperty(Element.prototype, 'animate', nativeAnimate)
})
afterEach(cleanup)

function view(feedback: Feedback | null, onContinue = vi.fn()) {
  render(
    <QuestionView
      question={question}
      promptLang="en"
      answerLang="ru"
      feedback={feedback}
      translate={() => undefined}
      onAnswer={vi.fn()}
      onContinue={onContinue}
      onIWasRight={vi.fn()}
    />,
  )
}

const right = {
  ...wrong,
  correct: true,
  match: { verdict: 'correct' },
  response: 'know',
} as unknown as Feedback

describe('QuestionView flashcard', () => {
  it('asks to reveal the answer before any feedback', () => {
    view(null)
    expect(screen.getByRole('button', { name: t.learn.showAnswer })).toBeTruthy()
  })

  it('after «Не знаю» moves on by itself, without «Продолжить»', () => {
    vi.useFakeTimers()
    const onContinue = vi.fn()
    view(wrong, onContinue)
    expect(screen.queryByRole('button', { name: t.learn.continue })).toBeNull()
    expect(screen.getByRole('button', { name: t.learn.dontKnow })).toBeTruthy()
    vi.advanceTimersByTime(300)
    expect(onContinue).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('keeps «Знаю» in place during the auto-advance after a correct answer', () => {
    view(right)
    expect(screen.getByRole('button', { name: t.learn.know })).toBeTruthy()
    expect(screen.queryByRole('button', { name: t.learn.continue })).toBeNull()
  })
})
