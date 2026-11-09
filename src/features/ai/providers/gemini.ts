import { AiError, codeForStatus, isNetworkError } from '../errors'
import type { GenerateRequest } from './types'

export async function generateGemini(req: GenerateRequest): Promise<string> {
  const { GoogleGenAI, ApiError } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey: req.apiKey })
  const call = () =>
    ai.models.generateContent({
      model: req.model,
      contents: req.user,
      config: {
        systemInstruction: req.system,
        responseMimeType: 'application/json',
        responseJsonSchema: req.schema,
        abortSignal: req.signal,
      },
    })
  try {
    let response: Awaited<ReturnType<typeof call>>
    try {
      response = await call()
    } catch (e) {
      // Unlike the Anthropic and OpenAI SDKs, @google/genai does not retry; overloads (503) are common.
      if (!(e instanceof ApiError) || e.status < 500 || req.signal?.aborted) throw e
      await new Promise((r) => setTimeout(r, 1500))
      response = await call()
    }
    if (response.promptFeedback?.blockReason) throw new AiError('refusal')
    return response.text ?? ''
  } catch (e) {
    if (e instanceof AiError) throw e
    if (req.signal?.aborted) throw new AiError('aborted')
    if (e instanceof ApiError) {
      // Gemini answers an invalid key with 400 INVALID_ARGUMENT rather than 401.
      if (e.status === 400 && /api[_ ]key/i.test(e.message)) throw new AiError('auth')
      throw new AiError(codeForStatus(e.status), e.message)
    }
    if (isNetworkError(e)) throw new AiError('network')
    throw e
  }
}
