import { AiError, codeForStatus, isNetworkError } from '../errors'
import type { GenerateRequest } from './types'

export async function generateGemini(req: GenerateRequest): Promise<string> {
  const { GoogleGenAI, ApiError } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey: req.apiKey })
  try {
    const response = await ai.models.generateContent({
      model: req.model,
      contents: req.user,
      config: {
        systemInstruction: req.system,
        responseMimeType: 'application/json',
        responseJsonSchema: req.schema,
        abortSignal: req.signal,
      },
    })
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
