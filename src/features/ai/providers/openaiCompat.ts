import { AiError, isNetworkError } from '../errors'
import type { GenerateRequest } from './types'

export type CompatFlavor = 'openai' | 'deepseek' | 'openrouter'

const BASE_URL: Record<CompatFlavor, string | undefined> = {
  openai: undefined,
  deepseek: 'https://api.deepseek.com',
  openrouter: 'https://openrouter.ai/api/v1',
}

/** OpenAI, DeepSeek and OpenRouter share the OpenAI SDK through `baseURL`. */
export async function generateOpenAICompat(
  flavor: CompatFlavor,
  req: GenerateRequest,
): Promise<string> {
  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({
    apiKey: req.apiKey,
    baseURL: BASE_URL[flavor],
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
    defaultHeaders: flavor === 'openrouter' ? { 'X-Title': 'Flipwise' } : undefined,
  })

  const run = async (format: 'json_schema' | 'json_object') => {
    const completion = await client.chat.completions.create(
      {
        model: req.model,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user },
        ],
        response_format:
          format === 'json_schema'
            ? {
                type: 'json_schema',
                json_schema: { name: 'examples', strict: true, schema: req.schema },
              }
            : { type: 'json_object' },
      },
      { signal: req.signal },
    )
    const message = completion.choices[0]?.message
    if (message?.refusal) throw new AiError('refusal')
    return message?.content ?? ''
  }

  try {
    // DeepSeek supports json_object only; it can return empty content occasionally, so retry once.
    if (flavor === 'deepseek') return (await run('json_object')) || (await run('json_object'))
    try {
      return await run('json_schema')
    } catch (e) {
      // Some OpenRouter models do not support json_schema; fall back to plain JSON mode.
      if (flavor === 'openrouter' && e instanceof OpenAI.BadRequestError)
        return await run('json_object')
      throw e
    }
  } catch (e) {
    if (e instanceof AiError) throw e
    if (e instanceof OpenAI.APIUserAbortError) throw new AiError('aborted')
    if (e instanceof OpenAI.AuthenticationError || e instanceof OpenAI.PermissionDeniedError)
      throw new AiError('auth')
    if (e instanceof OpenAI.RateLimitError) throw new AiError('rate')
    if (e instanceof OpenAI.NotFoundError) throw new AiError('model')
    if (e instanceof OpenAI.APIConnectionError || isNetworkError(e)) throw new AiError('network')
    if (e instanceof OpenAI.APIError)
      throw new AiError(e.status === 402 ? 'rate' : 'unknown', e.message)
    throw e
  }
}
