export type AiErrorCode =
  | 'no-key'
  | 'auth'
  | 'rate'
  | 'network'
  | 'invalid'
  | 'refusal'
  | 'model'
  | 'aborted'
  | 'unknown'

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'AiError'
  }
}

/** Maps an HTTP status from any provider to an error code. */
export function codeForStatus(status: number | undefined): AiErrorCode {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429 || status === 402) return 'rate'
  if (status === 404) return 'model'
  return 'unknown'
}

/** fetch() failures (offline, CORS) surface as TypeError in browsers. */
export function isNetworkError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  // Browsers report offline/CORS as TypeError("Failed to fetch" / "Load failed" / "NetworkError…").
  if (e instanceof TypeError) return /fetch|network|load failed/i.test(e.message)
  return /network|connection/i.test(e.name)
}
