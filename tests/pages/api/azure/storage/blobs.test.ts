/**
 * @jest-environment node
 */
import { createRes, createPostStreamReq } from '@/tests/test-framework/http-helper'

// --- v5 mocks ---
jest.mock('@/auth', () => ({ auth: jest.fn() }))
const { auth } = jest.requireMock('@/auth') as { auth: jest.Mock }

import handler from '@/pages/api/settlement-reconciliation/suite/kinds/[kind]/runs/[id]/publish'

beforeEach(() => {
  jest.resetAllMocks()
  auth.mockResolvedValue({ accessToken: 'abc123' }) // default: authenticated
  process.env.COMMANDER_API_BASE_URL = 'https://upstream.example.com'
  global.fetch = jest.fn()
})

afterAll(() => {
  jest.restoreAllMocks()
})

describe('POST publish proxy', () => {
  test('405 for non-POST', async () => {
    const req = Object.assign(createPostStreamReq({}), { method: 'GET' }) // force GET
    const res = createRes()
    await handler(req as any, res)
    expect(res._status).toBe(405)
    expect(res._json).toEqual({ success: false, error: 'Method Not Allowed' })
  })

  test('400 when kind or id missing', async () => {
    const res1 = createRes()
    await handler(
      createPostStreamReq({
        query: { kind: 'tests' },
        body: 'x',
        headers: { 'content-type': 'multipart/form-data; boundary=abc' },
      }) as any,
      res1,
    )
    expect(res1._status).toBe(400)
    expect(res1._json).toEqual({ error: 'Missing kind or id' })

    const res2 = createRes()
    await handler(
      createPostStreamReq({
        query: { id: '123' },
        body: 'x',
        headers: { 'content-type': 'multipart/form-data; boundary=abc' },
      }) as any,
      res2,
    )
    expect(res2._status).toBe(400)
    expect(res2._json).toEqual({ error: 'Missing kind or id' })
  })

  test('401 when no session', async () => {
    auth.mockResolvedValueOnce(null)
    const req = createPostStreamReq({
      query: { kind: 'tests', id: '42' },
      body: 'file-bytes',
      headers: { 'content-type': 'multipart/form-data; boundary=abc123' },
    })
    const res = createRes()
    await handler(req as any, res)
    expect(res._status).toBe(401)
    expect(res._json).toEqual({ success: false, error: 'Unauthorised' })
  })

  test('500 when COMMANDER_API_BASE_URL missing', async () => {
    delete process.env.COMMANDER_API_BASE_URL
    const req = createPostStreamReq({
      query: { kind: 'tests', id: '42' },
      body: 'file-bytes',
      headers: { 'content-type': 'multipart/form-data; boundary=abc123' },
    })
    const res = createRes()
    await handler(req as any, res)
    expect(res._status).toBe(500)
    expect(res._json).toEqual({ success: false, error: 'COMMANDER_API_BASE_URL is not configured' })
  })

  test('proxies multipart with auth & mirrors status/body/content-type', async () => {
    const req = createPostStreamReq({
      query: { kind: 'generators', id: '99' },
      headers: { 'content-type': 'multipart/form-data; boundary=abc123' },
      body: 'file-bytes',
    })

    const upstreamBody = Buffer.from('OK!')
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 201,
      headers: new Map([['content-type', 'text/plain']]),
      arrayBuffer: async () => upstreamBody,
    })

    const res = createRes()
    await handler(req as any, res)

    expect(global.fetch).toHaveBeenCalledWith(
      'https://upstream.example.com/api/commander/suite/kinds/generators/runs/99',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'multipart/form-data; boundary=abc123',
          authorization: 'Bearer abc123',
        }),
        duplex: 'half',
        body: req,
      }),
    )
    expect(res._status).toBe(201)
    expect(res._headers?.['content-type']).toBe('text/plain')
  })

  test('defaults content-type to application/json when upstream has none', async () => {
    const req = createPostStreamReq({
      query: { kind: 'tests', id: '7' },
      body: Buffer.from('{}'),
      // no content-type header
    })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 200,
      headers: new Map(), // no content-type
      arrayBuffer: async () => new Uint8Array([123, 125]).buffer, // "{}"
    })

    const res = createRes()
    await handler(req as any, res)
    expect(res._status).toBe(200)
    expect(res._headers?.['content-type']).toBe('application/json')
  })

  test('502 on unexpected error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network fail'))

    const req = createPostStreamReq({
      query: { kind: 'tests', id: '123' },
      body: 'x',
      headers: { 'content-type': 'multipart/form-data; boundary=abc123' },
    })
    const res = createRes()
    await handler(req as any, res)

    expect(res._status).toBe(502)
    expect(res._json).toEqual({ success: false, error: 'network fail' })
    spy.mockRestore()
  })
})
