export interface GenerateRequest {
  system: string
  user: string
  schema: Record<string, unknown>
  apiKey: string
  model: string
  /** Output budget; batches of several cards need more than the adapters' default. */
  maxTokens?: number
  signal?: AbortSignal
}

/** Every adapter returns the model's raw JSON text; parsing and validation are shared. */
export type Generate = (req: GenerateRequest) => Promise<string>
