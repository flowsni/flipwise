export interface GenerateRequest {
  system: string
  user: string
  schema: Record<string, unknown>
  apiKey: string
  model: string
  /**
   * Output budget a batch of several cards needs. Only adapters whose API caps output below it
   * by default apply it (Anthropic, DeepSeek chat); elsewhere the default is the model's maximum,
   * and a cap would also have to cover reasoning tokens.
   */
  maxTokens?: number
  signal?: AbortSignal
}

export type Generate = (req: GenerateRequest) => Promise<string>
