export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'openrouter'

export interface ModelOption {
  id: string
  /** Short Russian note shown next to the id. */
  note: 'cheap' | 'strong'
}

export interface ProviderInfo {
  id: ProviderId
  label: string
  keyUrl: string
  keyPlaceholder: string
  models: ModelOption[]
}

/**
 * Model ids change often; each provider has a cheap fast default, one stronger option and
 * a free-form "own model" field in settings, so updates never need a code change.
 */
export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-…',
    models: [
      { id: 'gpt-6-luna', note: 'cheap' },
      { id: 'gpt-6.1-sol', note: 'strong' },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    keyUrl: 'https://platform.claude.com/settings/keys',
    keyPlaceholder: 'sk-ant-…',
    models: [
      { id: 'claude-haiku-5-5', note: 'cheap' },
      { id: 'claude-opus-5-5', note: 'strong' },
    ],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyPlaceholder: 'AIza…',
    models: [
      { id: 'gemini-3.5-flash-lite', note: 'cheap' },
      { id: 'gemini-3.5-flash', note: 'strong' },
    ],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    keyPlaceholder: 'sk-…',
    models: [{ id: 'deepseek-flash', note: 'cheap' }],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter (Mistral, Llama, Groq…)',
    keyUrl: 'https://openrouter.ai/keys',
    keyPlaceholder: 'sk-or-…',
    models: [
      { id: 'openai/gpt-6-luna', note: 'cheap' },
      { id: 'google/gemini-3.5-flash', note: 'strong' },
    ],
  },
]

export function providerInfo(id: ProviderId): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id)!
}

export function defaultModel(id: ProviderId): string {
  return providerInfo(id).models[0]!.id
}
