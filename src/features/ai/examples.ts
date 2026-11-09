import type { ExampleItem } from '../../db/types'
import type { ProviderId } from './catalog'
import { AiError } from './errors'
import { buildPrompt, type ExamplesInput, examplesJsonSchema, parseExamples } from './prompt'
import { generateAnthropic } from './providers/anthropic'
import { generateGemini } from './providers/gemini'
import { generateOpenAICompat } from './providers/openaiCompat'
import type { GenerateRequest } from './providers/types'

export interface ProviderConfig {
  provider: ProviderId
  apiKey: string
  model: string
}

function call(provider: ProviderId, req: GenerateRequest): Promise<string> {
  switch (provider) {
    case 'anthropic':
      return generateAnthropic(req)
    case 'gemini':
      return generateGemini(req)
    case 'openai':
    case 'deepseek':
    case 'openrouter':
      return generateOpenAICompat(provider, req)
  }
}

/** Generates 3 example sentences with the studied word highlighted. */
export async function generateExamples(
  input: ExamplesInput,
  config: ProviderConfig,
  signal?: AbortSignal,
): Promise<{ items: ExampleItem[] }> {
  if (!config.apiKey) throw new AiError('no-key')
  const { system, user } = buildPrompt(input)
  const raw = await call(config.provider, {
    system,
    user,
    schema: examplesJsonSchema as unknown as Record<string, unknown>,
    apiKey: config.apiKey,
    model: config.model,
    signal,
  })
  return { items: parseExamples(raw, input.term) }
}

/** A tiny real request to verify the key and model. */
export function testConnection(config: ProviderConfig, signal?: AbortSignal) {
  return generateExamples(
    { term: 'hello', definition: 'привет', termLang: 'en', defLang: 'ru', level: 'A1' },
    config,
    signal,
  )
}
