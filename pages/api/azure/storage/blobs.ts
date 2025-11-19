// /pages/api/azure/storage/blobs.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getContainerClient, listPrefix, normalizePrefix } from '@/lib/api/common/azure/storage/blob'

// Accept raw stream; we don't want Next to parse multipart
export const config = { api: { bodyParser: false } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      // List blobs by optional prefix (same as before)
      const prefix = (req.query.prefix as string | undefined) ?? undefined
      const data = await listPrefix(prefix)
      res.status(200).json(data)

      return
    }

    if (req.method === 'POST') {
      // Stream a single file directly into a blob (no multipart parsing)

      // Choose file name:
      //  - Prefer header: x-file-name
      //  - Else query: ?name=...
      const fileNameHeader = req.headers['x-file-name']
      const fileName =
        (Array.isArray(fileNameHeader) ? fileNameHeader[0] : fileNameHeader) ||
        (typeof req.query.name === 'string' ? req.query.name : undefined)

      if (!fileName) {
        res.status(400).json({ error: 'Missing file name. Provide header "x-file-name" or query ?name=' })

        return
      }

      // Optional folder/prefix:
      //  - header: x-prefix
      //  - or query: ?prefix=...
      const prefixHeader = req.headers['x-prefix']
      const rawPrefix =
        (Array.isArray(prefixHeader) ? prefixHeader[0] : prefixHeader) ||
        (typeof req.query.prefix === 'string' ? req.query.prefix : '')
      const prefix = normalizePrefix(rawPrefix || '')

      const contentType =
        (Array.isArray(req.headers['content-type']) ? req.headers['content-type'][0] : req.headers['content-type']) ||
        'application/octet-stream'

      const container = getContainerClient()
      const blobPath = `${prefix}${fileName}`
      const block = container.getBlockBlobClient(blobPath)

      // Upload the Node readable stream directly
      // Tune bufferSize / maxConcurrency as needed
      const bufferSize = 4 * 1024 * 1024 // 4MB blocks
      const maxConcurrency = 8

      await block.uploadStream(req, bufferSize, maxConcurrency, {
        blobHTTPHeaders: { blobContentType: contentType },
      })

      res.status(200).json({ ok: true, path: blobPath, contentType })

      return
    }

    res.setHeader('Allow', 'GET, POST')
    res.status(405).json({ error: 'Method Not Allowed' })
  } catch (err: any) {
    console.error('Blobs API error:', err)
    // If we were streaming, response might already be committed — best effort:
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message ?? 'Unexpected error' })
    } else {
      try {
        res.end()
      } catch {}
    }
  }
}
