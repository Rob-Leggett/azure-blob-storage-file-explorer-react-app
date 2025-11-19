import { EventEmitter } from 'events'
import type { NextApiRequest, NextApiResponse } from 'next'
import { PassThrough } from 'stream'

type MockRes = NextApiResponse & {
  _status?: number
  _json?: any
  _headers: Record<string, string | number | string[]>
  _ended?: boolean
  _endedBody?: Buffer
  headersSent?: boolean
  on: (_event: 'finish', _cb: () => void) => MockRes
  off: (_event: 'finish', _cb: () => void) => MockRes
}

export const createRes = (): MockRes => {
  const emitter = new EventEmitter()
  const _headers: Record<string, string | number | string[]> = {}

  const res: any = emitter as MockRes
  res._headers = _headers
  res.headersSent = false

  res.status = (code: number) => {
    res._status = code

    return res as NextApiResponse
  }

  res.setHeader = (name: string, value: string | number | string[]) => {
    _headers[name.toLowerCase()] = value
  }

  res.getHeader = (name: string) => _headers[name.toLowerCase()]

  // Capture JSON and also mark response as ended (many handlers do json + return)
  res.json = (payload: any) => {
    res._json = payload
    res.headersSent = true
    res._ended = true
    // store body for assertions too
    try {
      res._endedBody = Buffer.from(JSON.stringify(payload))
    } catch {
      /* ignore */
    }
    process.nextTick(() => emitter.emit('finish'))

    return res as NextApiResponse
  }

  res.send = (data?: any) => {
    res.headersSent = true
    res._ended = true
    if (data !== undefined) {
      res._endedBody = Buffer.isBuffer(data) ? data : Buffer.from(String(data))
    }
    process.nextTick(() => emitter.emit('finish'))

    return res as NextApiResponse
  }

  res.write = (chunk: any) => {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
    res._endedBody = res._endedBody ? Buffer.concat([res._endedBody, buf]) : buf

    return true
  }

  res.end = (data?: any) => {
    if (data !== undefined) {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data))
      res._endedBody = res._endedBody ? Buffer.concat([res._endedBody, buf]) : buf
    }
    res.headersSent = true
    res._ended = true
    process.nextTick(() => emitter.emit('finish'))

    return res as NextApiResponse
  }

  return res as MockRes
}

// Minimal GET request
export const createGetReq = (over: Partial<NextApiRequest> = {}): NextApiRequest =>
  ({
    method: 'GET',
    headers: {},
    query: {},
    url: '/api/test',
    ...over,
  }) as unknown as NextApiRequest

export const createPostReq = (body: any, over: Partial<any> = {}) =>
  ({
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    query: {},
    body,
    url: '/api/test',
    ...over,
  }) as unknown as NextApiRequest

// Minimal POST streaming request
export const createPostStreamReq = (opts: {
  headers?: Record<string, string>
  query?: Record<string, any>
  body?: Buffer | string
  url?: string
}): NextApiRequest => {
  const stream = new PassThrough()
  const req = stream as unknown as NextApiRequest
  req.method = 'POST'
  req.headers = opts.headers ?? {}
  req.query = opts.query ?? {}
  req.url = opts.url ?? '/api/test'

  const buf = typeof opts.body === 'string' ? Buffer.from(opts.body) : (opts.body ?? Buffer.from('file-bytes'))
  // simulate async write then end
  process.nextTick(() => stream.end(buf))

  return req
}
