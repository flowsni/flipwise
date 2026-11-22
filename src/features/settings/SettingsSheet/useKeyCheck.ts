import { useState } from 'react'
import { aiErrorMessage } from '@/features/ai/AiErrorBox'
import type { ProviderId } from '@/features/ai/catalog'
import { AiError } from '@/features/ai/errors'
import { testConnection } from '@/features/ai/examples'

export function useKeyCheck(ai: { provider: ProviderId | null; key: string; model: string }) {
  const [status, setStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle')
  const [errorText, setErrorText] = useState('')

  const check = async () => {
    if (!ai.provider) return
    setStatus('checking')
    try {
      await testConnection({ provider: ai.provider, apiKey: ai.key, model: ai.model })
      setStatus('ok')
    } catch (e) {
      const code = e instanceof AiError ? e.code : 'unknown'
      setErrorText(aiErrorMessage(code))
      setStatus('error')
    }
  }

  return { status, errorText, check, reset: () => setStatus('idle') }
}
