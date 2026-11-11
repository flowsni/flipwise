import { beforeEach, describe, expect, it, vi } from 'vitest'

const anthropicCreate = vi.fn()
const anthropicBetaCreate = vi.fn()
const openaiCreate = vi.fn()
const geminiGenerate = vi.fn()

vi.mock('@anthropic-ai/sdk', async (orig) => {
  const real = (await orig()) as { default: Record<string, unknown> }
  class FakeAnthropic {
    static APIError = real.default.APIError
    static APIUserAbortError = real.default.APIUserAbortError
    static AuthenticationError = real.default.AuthenticationError
    static PermissionDeniedError = real.default.PermissionDeniedError
    static RateLimitError = real.default.RateLimitError
    static NotFoundError = real.default.NotFoundError
    static APIConnectionError = real.default.APIConnectionError
    opts: unknown
    messages = { create: anthropicCreate }
    beta = { messages: { create: anthropicBetaCreate } }
    constructor(opts: unknown) {
      this.opts = opts
    }
  }
  return { default: FakeAnthropic }
})

vi.mock('openai', async (orig) => {
  const real = (await orig()) as { default: Record<string, unknown> }
  class FakeOpenAI {
    static APIError = real.default.APIError
    static APIUserAbortError = real.default.APIUserAbortError
    static AuthenticationError = real.default.AuthenticationError
    static PermissionDeniedError = real.default.PermissionDeniedError
    static RateLimitError = real.default.RateLimitError
    static NotFoundError = real.default.NotFoundError
    static BadRequestError = real.default.BadRequestError
    static APIConnectionError = real.default.APIConnectionError
    static last: unknown
    chat = { completions: { create: openaiCreate } }
    constructor(opts: unknown) {
      FakeOpenAI.last = opts
    }
  }
  return { default: FakeOpenAI }
})

vi.mock('@google/genai', () => {
  class ApiError extends Error {
    status: number
    constructor(o: { message: string; status: number }) {
      super(o.message)
      this.status = o.status
    }
  }
  class GoogleGenAI {
    models = { generateContent: geminiGenerate }
  }
  return { GoogleGenAI, ApiError }
})

import { generateExamples } from '../examples'

const input = {
  term: 'luggage',
  definition: 'багаж',
  termLang: 'en',
  defLang: 'ru',
  level: 'B1' as const,
}
const json = JSON.stringify({ items: [{ text: 'My [[luggage]].', translation: 'Мой [[багаж]].' }] })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('anthropic adapter', () => {
  it('uses structured output with the cheap model and plain endpoint', async () => {
    anthropicCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: json }],
    })
    const r = await generateExamples(input, {
      provider: 'anthropic',
      apiKey: 'k',
      model: 'claude-haiku-5-5',
    })
    expect(r.items[0]!.text).toBe('My [[luggage]].')
    const body = anthropicCreate.mock.calls[0]![0]
    expect(body.output_config.format.type).toBe('json_schema')
    expect(body.output_config.effort).toBe('low')
    expect(body.max_tokens).toBe(4000)
    expect(body.fallbacks).toBeUndefined()
  })

  it('opts Opus into server-side fallbacks with low effort', async () => {
    anthropicBetaCreate.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: json }],
    })
    await generateExamples(input, { provider: 'anthropic', apiKey: 'k', model: 'claude-opus-5-5' })
    const body = anthropicBetaCreate.mock.calls[0]![0]
    expect(body.fallbacks).toBe('default')
    expect(body.betas).toEqual(['server-side-fallback-2026-07-01'])
    expect(body.output_config.effort).toBe('low')
  })

  it('reports refusals', async () => {
    anthropicCreate.mockResolvedValue({ stop_reason: 'refusal', content: [] })
    await expect(
      generateExamples(input, { provider: 'anthropic', apiKey: 'k', model: 'claude-haiku-5-5' }),
    ).rejects.toMatchObject({ code: 'refusal' })
  })
})

describe('openai-compatible adapter', () => {
  it('sends json_schema to OpenAI', async () => {
    openaiCreate.mockResolvedValue({ choices: [{ message: { content: json } }] })
    await generateExamples(input, { provider: 'openai', apiKey: 'k', model: 'gpt-6-luna' })
    expect(openaiCreate.mock.calls[0]![0].response_format.type).toBe('json_schema')
  })

  it('uses json_object for DeepSeek and retries an empty answer', async () => {
    openaiCreate
      .mockResolvedValueOnce({ choices: [{ message: { content: '' } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: json } }] })
    await generateExamples(input, { provider: 'deepseek', apiKey: 'k', model: 'deepseek-flash' })
    expect(openaiCreate).toHaveBeenCalledTimes(2)
    expect(openaiCreate.mock.calls[0]![0].response_format.type).toBe('json_object')
  })

  it('maps network failures', async () => {
    openaiCreate.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(
      generateExamples(input, { provider: 'openrouter', apiKey: 'k', model: 'x' }),
    ).rejects.toMatchObject({ code: 'network' })
  })
})

describe('output budget', () => {
  const req = {
    system: 's',
    user: 'u',
    schema: {},
    apiKey: 'k',
    model: 'm',
    maxTokens: 6000,
  }

  it('raises the caps that are low by default and leaves the others alone', async () => {
    const { generateAnthropic } = await import('./anthropic')
    const { generateOpenAICompat } = await import('./openaiCompat')
    const { generateGemini } = await import('./gemini')
    anthropicCreate.mockResolvedValue({ stop_reason: 'end_turn', content: [] })
    openaiCreate.mockResolvedValue({ choices: [{ message: { content: json } }] })
    geminiGenerate.mockResolvedValue({ text: json })

    await generateAnthropic({ ...req, model: 'claude-haiku-5-5' })
    await generateOpenAICompat('deepseek', req)
    await generateOpenAICompat('openai', req)
    await generateGemini(req)

    expect(anthropicCreate.mock.calls[0]![0].max_tokens).toBe(6000)
    expect(openaiCreate.mock.calls[0]![0].max_tokens).toBe(6000)
    expect(openaiCreate.mock.calls[1]![0]).not.toHaveProperty('max_tokens')
    expect(openaiCreate.mock.calls[1]![0]).not.toHaveProperty('max_completion_tokens')
    expect(geminiGenerate.mock.calls[0]![0].config).not.toHaveProperty('maxOutputTokens')
  })
})

describe('gemini adapter', () => {
  it('requests JSON with a schema', async () => {
    geminiGenerate.mockResolvedValue({ text: json })
    await generateExamples(input, {
      provider: 'gemini',
      apiKey: 'k',
      model: 'gemini-3.5-flash-lite',
    })
    const cfg = geminiGenerate.mock.calls[0]![0].config
    expect(cfg.responseMimeType).toBe('application/json')
    expect(cfg.responseJsonSchema).toBeTruthy()
  })

  it('maps an invalid key to auth', async () => {
    const { ApiError } = await import('@google/genai')
    geminiGenerate.mockRejectedValue(new ApiError({ message: 'API key not valid', status: 400 }))
    await expect(
      generateExamples(input, { provider: 'gemini', apiKey: 'k', model: 'm' }),
    ).rejects.toMatchObject({ code: 'auth' })
  })
})

it('requires a key', async () => {
  await expect(
    generateExamples(input, { provider: 'openai', apiKey: '', model: 'm' }),
  ).rejects.toMatchObject({ code: 'no-key' })
})

describe('overloaded providers', () => {
  it('retries Gemini once on 503 and then succeeds', async () => {
    const { ApiError } = await import('@google/genai')
    geminiGenerate
      .mockRejectedValueOnce(new ApiError({ message: 'high demand', status: 503 }))
      .mockResolvedValueOnce({ text: json })
    const r = await generateExamples(input, { provider: 'gemini', apiKey: 'k', model: 'm' })
    expect(r.items).toHaveLength(1)
    expect(geminiGenerate).toHaveBeenCalledTimes(2)
  })

  it('reports a persistent overload as busy', async () => {
    const { ApiError } = await import('@google/genai')
    geminiGenerate.mockRejectedValue(new ApiError({ message: 'high demand', status: 503 }))
    await expect(
      generateExamples(input, { provider: 'gemini', apiKey: 'k', model: 'm' }),
    ).rejects.toMatchObject({ code: 'busy' })
  })
})
