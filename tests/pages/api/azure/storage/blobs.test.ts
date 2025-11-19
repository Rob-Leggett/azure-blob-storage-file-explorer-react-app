/**
 * @jest-environment node
 */
import { createRes, createPostStreamReq } from '@/tests/test-framework/http-helper'

// --- Azure blob helper mocks ---
jest.mock('@/lib/api/common/azure/storage/blob', () => ({
  getContainerClient: jest.fn(),
  listPrefix: jest.fn(),
  normalizePrefix: jest.fn(),
}))

const { getContainerClient, listPrefix, normalizePrefix } = jest.requireMock(
  '@/lib/api/common/azure/storage/blob',
) as {
  getContainerClient: jest.Mock
  listPrefix: jest.Mock
  normalizePrefix: jest.Mock
}

import handler from '@/pages/api/azure/storage/blobs'

let uploadStreamMock: jest.Mock
let getBlockBlobClientMock: jest.Mock

beforeEach(() => {
  jest.resetAllMocks()

  // Default listPrefix result
  listPrefix.mockResolvedValue([])

  // Default normalise just ensures trailing slash if non-empty
  normalizePrefix.mockImplementation((raw: string) => (raw ? `${raw.replace(/\/+$/, '')}/` : ''))

  // Mock container + block blob client
  uploadStreamMock = jest.fn().mockResolvedValue(undefined)
  getBlockBlobClientMock = jest.fn().mockReturnValue({ uploadStream: uploadStreamMock })

  getContainerClient.mockReturnValue({
    getBlockBlobClient: getBlockBlobClientMock,
  })
})

afterAll(() => {
  jest.restoreAllMocks()
})

describe('Azure storage blobs API', () => {
  test('GET lists blobs with optional prefix', async () => {
    const res = createRes()
    const req = {
      method: 'GET',
      query: { prefix: 'folder/subfolder/' },
    } as any

    const fakeList = [{ name: 'folder/subfolder/file1.txt' }]
    listPrefix.mockResolvedValueOnce(fakeList)

    await handler(req, res)

    expect(listPrefix).toHaveBeenCalledWith('folder/subfolder/')
    expect(res._status).toBe(200)
    expect(res._json).toEqual(fakeList)
  })

  test('GET without prefix calls listPrefix with undefined', async () => {
    const res = createRes()
    const req = {
      method: 'GET',
      query: {},
    } as any

    await handler(req, res)

    expect(listPrefix).toHaveBeenCalledWith(undefined)
    expect(res._status).toBe(200)
    expect(res._json).toEqual([])
  })

  test('POST 400 when file name missing in header and query', async () => {
    const res = createRes()
    const req = createPostStreamReq({
      headers: {
        'content-type': 'application/octet-stream',
        // no x-file-name
      },
      query: {
        // no name
      },
      body: Buffer.from('file-bytes'),
    })

    await handler(req as any, res)

    expect(res._status).toBe(400)
    expect(res._json).toEqual({
      error: 'Missing file name. Provide header "x-file-name" or query ?name=',
    })
    expect(getContainerClient).not.toHaveBeenCalled()
  })

  test('POST uploads using x-file-name and x-prefix headers', async () => {
    const res = createRes()
    const req = createPostStreamReq({
      headers: {
        'content-type': 'image/png',
        'x-file-name': 'logo.png',
        'x-prefix': 'uploads',
      },
      query: {},
      body: Buffer.from('png-bytes'),
    })

    normalizePrefix.mockReturnValueOnce('uploads/')

    await handler(req as any, res)

    expect(normalizePrefix).toHaveBeenCalledWith('uploads')
    expect(getContainerClient).toHaveBeenCalled()
    expect(getBlockBlobClientMock).toHaveBeenCalledWith('uploads/logo.png')
    expect(uploadStreamMock).toHaveBeenCalledWith(
      req,
      4 * 1024 * 1024,
      8,
      expect.objectContaining({
        blobHTTPHeaders: { blobContentType: 'image/png' },
      }),
    )
    expect(res._status).toBe(200)
    expect(res._json).toEqual({
      ok: true,
      path: 'uploads/logo.png',
      contentType: 'image/png',
    })
  })

  test('POST derives name and prefix from query when headers are missing', async () => {
    const res = createRes()
    const req = createPostStreamReq({
      headers: {
        // no content-type => should default to application/octet-stream
      },
      query: {
        name: 'file.txt',
        prefix: 'folder/inner',
      },
      body: Buffer.from('hello'),
    })

    normalizePrefix.mockReturnValueOnce('folder/inner/')

    await handler(req as any, res)

    expect(normalizePrefix).toHaveBeenCalledWith('folder/inner')
    expect(getBlockBlobClientMock).toHaveBeenCalledWith('folder/inner/file.txt')
    expect(uploadStreamMock).toHaveBeenCalledWith(
      req,
      4 * 1024 * 1024,
      8,
      expect.objectContaining({
        blobHTTPHeaders: { blobContentType: 'application/octet-stream' },
      }),
    )
    expect(res._status).toBe(200)
    expect(res._json).toEqual({
      ok: true,
      path: 'folder/inner/file.txt',
      contentType: 'application/octet-stream',
    })
  })

  test('405 for unsupported methods', async () => {
    const res = createRes()
    const req = {
      method: 'PUT',
      query: {},
      headers: {},
    } as any

    await handler(req, res)

    expect(res._status).toBe(405)
    expect(res._json).toEqual({ error: 'Method Not Allowed' })
    expect(res._headers?.['allow']).toBe('GET, POST')
  })

  test('500 on unexpected error (e.g. uploadStream fails)', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    uploadStreamMock.mockRejectedValueOnce(new Error('upload failed'))

    const res = createRes()
    const req = createPostStreamReq({
      headers: {
        'content-type': 'application/octet-stream',
        'x-file-name': 'bad.bin',
      },
      query: {},
      body: Buffer.from('x'),
    })

    await handler(req as any, res)

    expect(uploadStreamMock).toHaveBeenCalled()
    expect(res._status).toBe(500)
    expect(res._json).toEqual({ error: 'upload failed' })
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})