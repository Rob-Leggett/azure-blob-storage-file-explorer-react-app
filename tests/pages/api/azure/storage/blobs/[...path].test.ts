/**
 * @jest-environment node
 */
import { PassThrough } from 'stream'
import { createGetReq, createPostStreamReq, createRes } from '@/tests/test-framework/http-helper'

// ---- Mocks for Azure blob helpers ----
jest.mock('@/lib/api/common/azure/storage/blob', () => ({
  getContainerClient: jest.fn(),
  deleteBlob: jest.fn(),
  putBlob: jest.fn(),
  moveBlob: jest.fn(),
}))

// NOTE: adjust the import path below to match your file location.
// If your file lives at /pages/api/azure/storage/blobs/[...path].ts use that path.
import handler from '@/pages/api/azure/storage/blobs/[...path]'
import { getContainerClient, deleteBlob, putBlob, moveBlob } from '@/lib/api/common/azure/storage/blob'

type BlobClientShape = {
  exists: () => Promise<boolean>
  download: () => Promise<{
    contentType?: string | null
    readableStreamBody?: NodeJS.ReadableStream | null
  }>
}

// Per-test container client shim
const makeBlobClient = (impl: Partial<BlobClientShape> = {}): BlobClientShape => ({
  exists: async () => true,
  download: async () => ({ contentType: 'application/octet-stream', readableStreamBody: null }),
  ...impl,
})

beforeEach(() => {
  jest.resetAllMocks()
  ;(getContainerClient as jest.Mock).mockReturnValue({
    getBlobClient: (_path: string) => makeBlobClient(),
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

describe('/api/azure/storage/blobs/[...path]', () => {
  // ---------- GET ----------
  it('GET: 404 when blob does not exist', async () => {
    ;(getContainerClient as jest.Mock).mockReturnValue({
      getBlobClient: () =>
        makeBlobClient({
          exists: async () => false,
        }),
    })

    const req = createGetReq({ method: 'GET', query: { path: ['folder', 'missing.txt'] } })
    const res = createRes()

    await handler(req, res)

    expect(res._status).toBe(404)
    expect(res._json).toEqual({ path: 'folder/missing.txt', error: 'Not found' })
  })

  it('GET: streams blob with headers and decodes path segments', async () => {
    const body = Buffer.from('hello world')
    const stream = new PassThrough()
    // end the stream after the handler attaches the pipe
    process.nextTick(() => stream.end(body))
    ;(getContainerClient as jest.Mock).mockReturnValue({
      getBlobClient: (fullPath: string) => {
        expect(fullPath).toBe('folder/sub/file name.txt')

        return makeBlobClient({
          exists: async () => true,
          download: async () => ({
            contentType: 'text/plain',
            readableStreamBody: stream,
          }),
        })
      },
    })

    const req = createGetReq({
      method: 'GET',
      query: { path: ['folder%2Fsub', 'file%20name.txt'] },
    })
    const res = createRes()

    await handler(req, res)
    await new Promise((resolve) => (res as any).on('finish', resolve))

    expect(res._headers?.['content-type']).toBe('text/plain')
    expect(res._headers?.['cache-control']).toBe('private, max-age=0')
    expect(res._endedBody?.toString()).toBe('hello world')
  })

  // ---------- DELETE ----------
  it('DELETE: returns ok true when deleted', async () => {
    ;(deleteBlob as jest.Mock).mockResolvedValueOnce(true)
    const req = createGetReq({ method: 'DELETE', query: { path: ['inbox', 'x.txt'] } })
    const res = createRes()

    await handler(req, res)

    expect(deleteBlob).toHaveBeenCalledWith('inbox/x.txt')
    expect(res._status).toBe(200)
    expect(res._json).toEqual({ ok: true, path: 'inbox/x.txt' })
  })

  it('DELETE: 404 when blob not found', async () => {
    ;(deleteBlob as jest.Mock).mockResolvedValueOnce(false)
    const req = createGetReq({ method: 'DELETE', query: { path: ['inbox', 'gone.txt'] } })
    const res = createRes()

    await handler(req, res)

    expect(res._status).toBe(404)
    expect(res._json).toEqual({ ok: false, path: 'inbox/gone.txt', error: 'Blob not found' })
  })

  it('DELETE: 500 when delete throws', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(deleteBlob as jest.Mock).mockRejectedValueOnce(new Error('boom'))

    const req = createGetReq({ method: 'DELETE', query: { path: ['inbox', 'err.txt'] } })
    const res = createRes()

    await handler(req, res)

    expect(res._status).toBe(500)
    expect(res._json).toEqual({ ok: false, path: 'inbox/err.txt', error: 'boom' })
    spy.mockRestore()
  })

  // ---------- PUT (replace with x-replace) ----------
  it('PUT: replaces blob when x-replace header present', async () => {
    ;(putBlob as jest.Mock).mockResolvedValueOnce(undefined)

    const req = createPostStreamReq({
      headers: { 'x-replace': '1', 'content-type': 'text/plain' },
      query: { path: ['docs', 'a.txt'] },
      body: 'new content',
    }) as any
    req.method = 'PUT'

    const res = createRes()
    await handler(req, res)

    expect(putBlob).toHaveBeenCalledTimes(1)
    const [fullPath, buf, ct] = (putBlob as jest.Mock).mock.calls[0]
    expect(fullPath).toBe('docs/a.txt')
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(buf.toString()).toBe('new content')
    expect(ct).toBe('text/plain')

    expect(res._status).toBe(200)
    expect(res._json).toEqual({ ok: true, replaced: true })
  })

  // ---------- PUT (rename) ----------
  it('PUT: renames (moveBlob) with decoded newPath', async () => {
    ;(moveBlob as jest.Mock).mockResolvedValueOnce(undefined)

    const body = JSON.stringify({ action: 'rename', newPath: 'archive/new%20name.txt' })
    const req = createPostStreamReq({
      headers: { 'content-type': 'application/json' },
      query: { path: ['docs', 'old.txt'] },
      body,
    }) as any
    req.method = 'PUT'

    const res = createRes()
    await handler(req, res)

    expect(moveBlob).toHaveBeenCalledWith('docs/old.txt', 'archive/new name.txt') // decoded
    expect(res._status).toBe(200)
    expect(res._json).toEqual({ ok: true, renamed: { from: 'docs/old.txt', to: 'archive/new name.txt' } })
  })

  it('PUT: 400 on invalid/missing rename payload', async () => {
    const badBodies = ['{}', '{"action":"rename"}', '{"newPath":"x.txt"}', '{"action":"other","newPath":"x.txt"}', '']

    for (const body of badBodies) {
      const req = createPostStreamReq({
        headers: { 'content-type': 'application/json' },
        query: { path: ['docs', 'bad.txt'] },
        body,
      }) as any
      req.method = 'PUT'

      const res = createRes()
      await handler(req, res)

      expect(res._status).toBe(400)
      expect(res._json).toEqual({
        error: 'PUT requires { action: "rename", newPath } or x-replace header',
      })
    }
  })

  it('PUT: 500 when moveBlob throws', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(moveBlob as jest.Mock).mockRejectedValueOnce(new Error('copy failed'))

    const req = createPostStreamReq({
      headers: { 'content-type': 'application/json' },
      query: { path: ['docs', 'oops.txt'] },
      body: JSON.stringify({ action: 'rename', newPath: 'dest/oops.txt' }),
    }) as any
    req.method = 'PUT'

    const res = createRes()
    await handler(req, res)

    expect(res._status).toBe(500)
    expect(res._json).toEqual({ error: 'copy failed' })
    spy.mockRestore()
  })

  // ---------- Method guard ----------
  it('405 for unsupported methods', async () => {
    const req = createGetReq({ method: 'PATCH', query: { path: ['any', 'file.txt'] } })
    const res = createRes()

    await handler(req, res)

    expect(res._status).toBe(405)
    expect(res._headers?.['allow']).toBe('GET,PUT,DELETE')
    expect(res._json).toEqual({ error: 'Method Not Allowed' })
  })
})
