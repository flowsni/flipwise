/** «Примеры для всей колоды»: examples for many cards, several cards per request. */

import { setExamplesIfUnchanged } from '../../db/decks'
import type { Card, Deck, Level } from '../../db/types'
import { AiError, type AiErrorCode } from './errors'
import { call, type ProviderConfig } from './examples'
import { type BatchResult, batchJsonSchema, buildBatchPrompt, parseBatchExamples } from './prompt'

export const BATCH_SIZE = 10
/**
 * Cards left out go once more in smaller batches: if a whole batch failed because the answer
 * was too long or garbled, the same 10 cards would most likely fail the same way again.
 */
export const RETRY_BATCH_SIZE = 5
/** ~3 sentences with translations for 10 cards, with headroom. */
export const BATCH_MAX_TOKENS = 6000
/** Wait before the one retry after a rate limit or an overloaded provider. */
export const RETRY_DELAY = 8000

/** Errors after which more requests can't succeed: stop the whole run. */
const FATAL: readonly AiErrorCode[] = ['no-key', 'auth', 'model', 'network', 'aborted']

export function batchCount(cards: number): number {
  return Math.ceil(cards / BATCH_SIZE)
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export interface BulkProgress {
  /** Cards that got examples. */
  saved: number
  /** Cards dealt with: saved, or skipped because they were edited or deleted meanwhile. */
  done: number
  total: number
}

export interface BulkOptions {
  level: Level
  signal?: AbortSignal
  /** Called after every batch. */
  onProgress?: (progress: BulkProgress) => void
  /** Injected in tests. */
  request?: (config: ProviderConfig, req: Parameters<typeof call>[1]) => Promise<string>
  wait?: (ms: number, signal?: AbortSignal) => Promise<void>
}

export interface BulkResult {
  /** `createdAt` of every example this run wrote: tells them apart from older or newer ones. */
  createdAt: number
  saved: number
  /** Edited or deleted during the run: left alone on purpose. */
  skipped: number
  /** Cards without new examples because generation failed or stopped. */
  failed: number
  /** Why the run stopped early, if it did. */
  error?: AiErrorCode
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AiError('aborted'))
    const onAbort = () => {
      clearTimeout(timer)
      reject(new AiError('aborted'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Generates examples batch by batch, sequentially, saving each batch as soon as it arrives so a
 * stop keeps what is done. Cards the model left out get one more try at the end.
 */
export async function generateDeckExamples(
  cards: readonly Card[],
  deck: Pick<Deck, 'termLang' | 'defLang'>,
  config: ProviderConfig,
  options: BulkOptions,
): Promise<BulkResult> {
  const { level, signal, onProgress } = options
  const request = options.request ?? ((c, req) => call(c.provider, req))
  const wait = options.wait ?? sleep
  const total = cards.length
  const createdAt = Date.now()
  let saved = 0
  let skipped = 0
  let done = 0

  const ask = (batch: readonly Card[]): Promise<BatchResult> => {
    if (!config.apiKey) throw new AiError('no-key')
    if (signal?.aborted) throw new AiError('aborted')
    const { system, user } = buildBatchPrompt({
      cards: batch,
      termLang: deck.termLang,
      defLang: deck.defLang,
      level,
    })
    return request(config, {
      system,
      user,
      schema: batchJsonSchema as unknown as Record<string, unknown>,
      apiKey: config.apiKey,
      model: config.model,
      maxTokens: BATCH_MAX_TOKENS,
      signal,
    }).then((raw) => parseBatchExamples(raw, batch))
  }

  /** One batch with a single retry on rate limits and overloads; returns the cards left out. */
  const run = async (batch: readonly Card[], last: boolean): Promise<Card[]> => {
    let result: BatchResult
    try {
      try {
        result = await ask(batch)
      } catch (e) {
        if (!(e instanceof AiError) || (e.code !== 'rate' && e.code !== 'busy')) throw e
        await wait(RETRY_DELAY, signal)
        result = await ask(batch)
      }
    } catch (e) {
      const code = e instanceof AiError ? e.code : 'unknown'
      // A garbled or refused batch only fails its own cards; the next batch may work.
      if (FATAL.includes(code) || code === 'rate' || code === 'busy') throw e
      result = { results: new Map(), missing: batch.map((_, i) => i) }
    }
    const entries = [...result.results].map(([index, items]) => ({
      card: batch[index]!,
      examples: {
        items,
        provider: config.provider,
        model: config.model,
        createdAt,
        level,
        definition: batch[index]!.definition,
      },
    }))
    const written = await setExamplesIfUnchanged(entries)
    saved += written
    skipped += entries.length - written
    // Cards the model left out are done only after their retry.
    done += entries.length + (last ? result.missing.length : 0)
    onProgress?.({ saved, done, total })
    return result.missing.map((i) => batch[i]!)
  }

  try {
    const missing: Card[] = []
    for (const batch of chunk(cards, BATCH_SIZE)) missing.push(...(await run(batch, false)))
    for (const batch of chunk(missing, RETRY_BATCH_SIZE)) await run(batch, true)
    return { createdAt, saved, skipped, failed: total - saved - skipped }
  } catch (e) {
    const code = e instanceof AiError ? e.code : 'unknown'
    if (code !== 'aborted') console.warn('Bulk examples stopped', e)
    return { createdAt, saved, skipped, failed: total - saved - skipped, error: code }
  }
}
