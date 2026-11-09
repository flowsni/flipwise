import { useSetting } from '../../lib/storage'
import { defaultModel, type ProviderId } from './catalog'

export interface AiSettings {
  provider: ProviderId | null
  keys: Partial<Record<ProviderId, string>>
  models: Partial<Record<ProviderId, string>>
}

export function useAiSettings() {
  const [provider, setProvider] = useSetting<ProviderId | null>('ai.provider', null)
  const [keys, setKeys] = useSetting<Partial<Record<ProviderId, string>>>('ai.keys', {})
  const [models, setModels] = useSetting<Partial<Record<ProviderId, string>>>('ai.model', {})
  const key = provider ? (keys[provider] ?? '') : ''
  const model = provider ? models[provider] || defaultModel(provider) : ''
  return {
    provider,
    setProvider,
    keys,
    setKey: (p: ProviderId, value: string) => setKeys({ ...keys, [p]: value.trim() }),
    models,
    setModel: (p: ProviderId, value: string) => setModels({ ...models, [p]: value.trim() }),
    /** Active provider has a key. */
    ready: !!provider && !!key,
    key,
    model,
  }
}
