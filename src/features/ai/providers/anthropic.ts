import { AiError, isNetworkError } from '../errors'
import type { GenerateRequest } from './types'

/** Models that support server-side refusal fallbacks (`fallbacks: "default"`). */
function supportsFallbacks(model: string): boolean {
  return /^claude-(opus-5|fable-5|sonnet-5-5)/.test(model)
}

export async function generateAnthropic(req: GenerateRequest): Promise<string> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  // Direct browser access: the key is the user's own and never leaves their browser except to Anthropic.
  const client = new Anthropic({ apiKey: req.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 })
  const base = {
    model: req.model,
    max_tokens: 4000,
    system: req.system,
    messages: [{ role: 'user' as const, content: req.user }],
  }
  try {
    const response = supportsFallbacks(req.model)
      ? await client.beta.messages.create(
          {
            ...base,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            output_config: { effort: 'low', format: { type: 'json_schema', schema: req.schema } },
          },
          { signal: req.signal },
        )
      : await client.messages.create(
          {
            ...base,
            output_config: { effort: 'low', format: { type: 'json_schema', schema: req.schema } },
          },
          { signal: req.signal },
        )
    if (response.stop_reason === 'refusal') throw new AiError('refusal')
    const text = response.content.map((block) => (block.type === 'text' ? block.text : '')).join('')
    return text
  } catch (e) {
    if (e instanceof AiError) throw e
    if (e instanceof Anthropic.APIUserAbortError) throw new AiError('aborted')
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError)
      throw new AiError('auth')
    if (e instanceof Anthropic.RateLimitError) throw new AiError('rate')
    if (e instanceof Anthropic.NotFoundError) throw new AiError('model')
    if (e instanceof Anthropic.APIConnectionError || isNetworkError(e)) throw new AiError('network')
    if (e instanceof Anthropic.APIError) throw new AiError('unknown', e.message)
    throw e
  }
}
