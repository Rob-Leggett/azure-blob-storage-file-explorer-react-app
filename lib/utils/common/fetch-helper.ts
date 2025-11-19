export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface SafeFetchOptions {
  method?: HttpMethod
  headers?: Record<string, string>
  /** Pass an object to send JSON; pass a string/Blob/FormData/ArrayBuffer to send as-is */
  body?: unknown
  timeoutMs?: number
  retries?: number
  /** Status codes to retry on */
  retryOn?: number[]
  /** Additional retry guard (e.g. avoid retrying non-idempotent calls) */
  shouldRetry?: (_args: ShouldRetryProps) => boolean
  /** Base delay (ms) for linear backoff. Default 400 → 400ms, 800ms, 1200ms … */
  backoffBaseMs?: number
}

export interface ShouldRetryProps {
  attempt: number
  retries: number
  method: HttpMethod
  status?: number
  error?: unknown
}

export const buildHeaders = (authToken?: string) => ({
  Accept: 'application/json',
  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
})

export async function safeFetch(
  url: string,
  {
    method = 'GET',
    headers = {},
    body,
    timeoutMs = 20000,
    retries = 2,
    retryOn = [408, 429, 500, 502, 503, 504],
    shouldRetry,
    backoffBaseMs = 400,
  }: SafeFetchOptions = {},
): Promise<Response> {
  // prepare request init
  const init: RequestInit = { method, headers: { ...headers } }

  // ensure headers is a plain record
  const h = init.headers as Record<string, string>

  // If body is provided, set appropriately
  if (body !== undefined) {
    if (
      typeof body === 'string' ||
      body instanceof Blob ||
      body instanceof FormData ||
      body instanceof ArrayBuffer ||
      ArrayBuffer.isView(body)
    ) {
      init.body = body as any
    } else {
      // assume JSON
      init.body = JSON.stringify(body)
      if (!h['Content-Type'] && !h['content-type']) {
        h['Content-Type'] = 'application/json'
      }
    }
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), timeoutMs)

    try {
      const res = await fetch(url, { ...init, signal: ac.signal })
      clearTimeout(timer)

      if (res.ok) return res

      const status = res.status
      const codeSuggestsRetry = retryOn.includes(status)
      const customSaysRetry = shouldRetry?.({ attempt, retries, method, status }) ?? true

      if (!(codeSuggestsRetry && attempt < retries && customSaysRetry)) {
        return res
      }
    } catch (error) {
      clearTimeout(timer)
      const customSaysRetry = shouldRetry?.({ attempt, retries, method, error }) ?? true
      if (attempt === retries || !customSaysRetry) throw error
    }

    // Linear backoff: 400ms, 800ms, 1200ms...
    await new Promise((r) => setTimeout(r, backoffBaseMs * (attempt + 1)))
  }

  throw new Error('safeFetch: exhausted retries')
}

export async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}
