import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../db/db'
import { createDeck, getDeckCards } from '../../db/decks'
import type { Card } from '../../db/types'
import { BATCH_MAX_TOKENS, batchCount, chunk, generateDeckExamples, RETRY_DELAY } from './bulk'
import { AiError } from './errors'
import type { ProviderConfig } from './examples'

const config: ProviderConfig = { provider: 'anthropic', apiKey: 'k', model: 'claude-haiku-5-5' }
const deck = { termLang: 'en', defLang: 'ru' }

afterEach(async () => {
  await Promise.all([db.decks.clear(), db.cards.clear()])
})

async function makeCards(n: number): Promise<Card[]> {
  const deckId = await createDeck(
    { title: 'D', termLang: 'en', defLang: 'ru', level: 'B1' },
    Array.from({ length: n }, (_, i) => ({ term: `w${i}`, definition: `с${i}` })),
  )
  return getDeckCards(deckId)
}

/** Numbered items of a batch prompt: "3. w2 — с2". */
function itemsOf(user: string) {
  return [...user.matchAll(/^(\d+)\. (\S+) — /gm)].map((m) => ({ n: Number(m[1]), term: m[2]! }))
}

/** Answers every numbered item, except the terms in `skip`. */
function answer(user: string, skip: string[] = []) {
  return JSON.stringify({
    cards: itemsOf(user)
      .filter((c) => !skip.includes(c.term))
      .map((c) => ({ n: c.n, items: [{ text: `A ${c.term}.`, translation: 'п' }] })),
  })
}

const noWait = async () => {}

describe('helpers', () => {
  it('splits into batches', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(batchCount(0)).toBe(0)
    expect(batchCount(10)).toBe(1)
    expect(batchCount(84)).toBe(9)
  })
})

describe('the default pause', () => {
  it('stops waiting when aborted', async () => {
    const cards = await makeCards(2)
    const controller = new AbortController()
    const request = vi.fn().mockRejectedValue(new AiError('rate'))
    vi.useFakeTimers()
    try {
      const pending = generateDeckExamples(cards, deck, config, {
        level: 'B1',
        request,
        signal: controller.signal,
      })
      await vi.advanceTimersByTimeAsync(RETRY_DELAY / 2)
      controller.abort()
      await expect(pending).resolves.toMatchObject({ saved: 0, error: 'aborted' })
      expect(request).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('generateDeckExamples', () => {
  it('sends batches of 10 in order and saves every card with the level', async () => {
    const cards = await makeCards(23)
    const request = vi.fn(async (_c: ProviderConfig, req: { user: string }) => answer(req.user))
    const progress: number[] = []

    const result = await generateDeckExamples(cards, deck, config, {
      level: 'A2',
      request,
      wait: noWait,
      onProgress: (p) => progress.push(p.done),
    })

    expect(result).toEqual({ saved: 23, skipped: 0, failed: 0 })
    expect(request).toHaveBeenCalledTimes(3)
    expect(request.mock.calls.map(([, req]) => itemsOf(req.user).length)).toEqual([10, 10, 3])
    expect(request.mock.calls[0]![1]).toMatchObject({ maxTokens: BATCH_MAX_TOKENS })
    expect(progress).toEqual([10, 20, 23])
    const stored = await db.cards.get(cards[22]!.id)
    expect(stored?.examples).toMatchObject({ level: 'A2', model: 'claude-haiku-5-5' })
    expect(stored?.examples?.items[0]?.text).toBe('A [[w22]].')
  })

  it('retries cards the model left out once, at the end', async () => {
    const cards = await makeCards(12)
    const request = vi
      .fn()
      .mockImplementationOnce(async (_c, req) => answer(req.user, ['w3']))
      .mockImplementationOnce(async (_c, req) => answer(req.user))
      .mockImplementationOnce(async (_c, req) => answer(req.user))

    const result = await generateDeckExamples(cards, deck, config, {
      level: 'B1',
      request,
      wait: noWait,
    })

    expect(result).toEqual({ saved: 12, skipped: 0, failed: 0 })
    expect(itemsOf(request.mock.calls[2]![1].user).map((c) => c.term)).toEqual(['w3'])
  })

  it('retries a wholly failed batch in smaller batches', async () => {
    const cards = await makeCards(10)
    const request = vi
      .fn()
      .mockResolvedValueOnce('{"cards": [') // cut off mid-answer
      .mockImplementation(async (_c, req) => answer(req.user))

    const result = await generateDeckExamples(cards, deck, config, {
      level: 'B1',
      request,
      wait: noWait,
    })

    expect(result).toEqual({ saved: 10, skipped: 0, failed: 0 })
    expect(request.mock.calls.slice(1).map(([, req]) => itemsOf(req.user).length)).toEqual([5, 5])
  })

  it('reports cards still missing after the retry and survives a garbled batch', async () => {
    const cards = await makeCards(3)
    const request = vi
      .fn()
      .mockResolvedValueOnce('not json at all')
      .mockImplementationOnce(async (_c, req) => answer(req.user, ['w1']))

    const result = await generateDeckExamples(cards, deck, config, {
      level: 'B1',
      request,
      wait: noWait,
    })

    expect(result).toEqual({ saved: 2, skipped: 0, failed: 1 })
    expect(await db.cards.get(cards[1]!.id)).not.toHaveProperty('examples.items')
  })

  it('does not attach examples to a card edited or deleted while generating', async () => {
    const cards = await makeCards(3)
    const request = vi.fn(async (_c: ProviderConfig, req: { user: string }) => {
      await db.cards.update(cards[0]!.id, { term: 'changed' })
      await db.cards.delete(cards[1]!.id)
      return answer(req.user)
    })

    const result = await generateDeckExamples(cards, deck, config, {
      level: 'B1',
      request,
      wait: noWait,
    })

    expect(result).toEqual({ saved: 1, skipped: 2, failed: 0 })
    expect((await db.cards.get(cards[0]!.id))?.examples).toBeUndefined()
    expect(await db.cards.get(cards[1]!.id)).toBeUndefined()
    expect((await db.cards.get(cards[2]!.id))?.examples?.items).toHaveLength(1)
  })

  it('pauses and retries once on a rate limit', async () => {
    const cards = await makeCards(2)
    const wait = vi.fn(noWait)
    const request = vi
      .fn()
      .mockRejectedValueOnce(new AiError('rate'))
      .mockImplementationOnce(async (_c, req) => answer(req.user))

    const result = await generateDeckExamples(cards, deck, config, { level: 'B1', request, wait })

    expect(result).toEqual({ saved: 2, skipped: 0, failed: 0 })
    expect(wait).toHaveBeenCalledTimes(1)
  })

  it('stops on a bad key and keeps the batches already saved', async () => {
    const cards = await makeCards(25)
    const request = vi
      .fn()
      .mockImplementationOnce(async (_c, req) => answer(req.user))
      .mockRejectedValueOnce(new AiError('auth'))

    const result = await generateDeckExamples(cards, deck, config, {
      level: 'B1',
      request,
      wait: noWait,
    })

    expect(result).toEqual({ saved: 10, skipped: 0, failed: 15, error: 'auth' })
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('stops when aborted', async () => {
    const cards = await makeCards(25)
    const controller = new AbortController()
    const request = vi.fn(async (_c: ProviderConfig, req: { user: string }) => {
      controller.abort()
      return answer(req.user)
    })

    const result = await generateDeckExamples(cards, deck, config, {
      level: 'B1',
      request,
      wait: noWait,
      signal: controller.signal,
    })

    expect(result).toMatchObject({ saved: 10, error: 'aborted' })
    expect(request).toHaveBeenCalledTimes(1)
  })
})
