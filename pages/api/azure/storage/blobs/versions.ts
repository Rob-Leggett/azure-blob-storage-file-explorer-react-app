import type { NextApiRequest, NextApiResponse } from 'next'
import { listBlobVersions } from '@/lib/api/common/azure/storage/blob'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const pathParam = req.query.path
  if (!pathParam || typeof pathParam !== 'string') {
    return res.status(400).json({ error: 'Missing ?path=' })
  }

  const fullPath = decodeURIComponent(pathParam)

  try {
    const versions = await listBlobVersions(fullPath)
    return res.status(200).json({ versions })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('List versions error:', err)
    return res.status(500).json({ error: 'Failed to list versions' })
  }
}
