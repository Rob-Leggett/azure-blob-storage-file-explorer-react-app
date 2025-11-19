import type { NextApiRequest, NextApiResponse } from 'next'
import { getContainerClient, deleteBlob, putBlob, moveBlob } from '@/lib/api/common/azure/storage/blob'

export const config = {
  api: {
    bodyParser: false,
  },
}

// helper: decode each segment then join with '/'
const joinDecodedPath = (segments: string[] | string | undefined) => {
  if (!segments) return ''
  const arr = Array.isArray(segments) ? segments : [segments]

  return arr.map((s) => decodeURIComponent(s)).join('/')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const fullPath = joinDecodedPath(req.query.path)

    if (req.method === 'GET') {
      const container = getContainerClient()
      const blob = container.getBlobClient(fullPath)
      if (!(await blob.exists())) return res.status(404).json({ path: fullPath, error: 'Not found' })

      // If meta=1, return metadata as JSON instead of streaming.
      if (req.query.meta === '1') {
        const props = await blob.getProperties()

        return res.status(200).json({
          path: fullPath,
          contentType: props.contentType,
          size: props.contentLength,
          createdOn: props.createdOn,
          lastModified: props.lastModified,
          metadata: props.metadata ?? {},
        })
      }

      const dl = await blob.download()
      res.setHeader('content-type', dl.contentType ?? 'application/octet-stream')
      res.setHeader('cache-control', 'private, max-age=0')
      dl.readableStreamBody?.pipe(res)

      return
    }

    if (req.method === 'DELETE') {
      try {
        const ok = await deleteBlob(fullPath)

        if (!ok) {
          return res.status(404).json({ ok: false, path: fullPath, error: 'Blob not found' })
        }

        return res.status(200).json({ ok: true, path: fullPath })
      } catch (err: any) {
        console.error('Delete failed:', err)

        return res.status(500).json({ ok: false, path: fullPath, error: err?.message ?? 'Delete failed' })
      }
    }

    if (req.method === 'PUT') {
      // Replace raw?
      if (req.headers['x-replace']) {
        const chunks: Buffer[] = []
        await new Promise<void>((resolve, reject) => {
          req.on('data', (c) => chunks.push(c))
          req.on('end', () => resolve())
          req.on('error', reject)
        })
        const buf = Buffer.concat(chunks)
        const ct = (req.headers['content-type'] as string) || undefined
        await putBlob(fullPath, buf, ct)

        return res.status(200).json({ ok: true, replaced: true })
      }

      // Rename/move
      // Body arrives as JSON: { action: "rename", newPath: "folder/newName.ext" }
      const bodyText = await new Promise<string>((resolve, reject) => {
        const chunks: Buffer[] = []
        req.on('data', (c) => chunks.push(c))
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
        req.on('error', reject)
      })

      let action = '',
        newPath = ''
      try {
        const parsed = JSON.parse(bodyText || '{}')
        action = parsed?.action
        newPath = parsed?.newPath
      } catch {
        // ignore
      }
      if (action !== 'rename' || !newPath) {
        return res.status(400).json({ error: 'PUT requires { action: "rename", newPath } or x-replace header' })
      }

      // If client happened to encode it, decode once:
      const decodedNewPath = decodeURIComponent(newPath)

      // Try copy -> delete (see note below)
      await moveBlob(fullPath, decodedNewPath)

      return res.status(200).json({ ok: true, renamed: { from: fullPath, to: decodedNewPath } })
    }

    res.setHeader('Allow', 'GET,PUT,DELETE')

    return res.status(405).json({ error: 'Method Not Allowed' })
  } catch (err: any) {
    console.error('Blob route error:', err)

    return res.status(500).json({ error: err?.message ?? 'Blob route failed' })
  }
}
