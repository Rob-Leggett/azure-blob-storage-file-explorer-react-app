import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  SASProtocol,
  type BlockBlobClient,
  type BlobClient,
} from '@azure/storage-blob'
import { BlobVersion } from '@/lib/types/common/azure/storage/blobs'

const CONN_STR = process.env.AZURE_STORAGE_CONNECTION_STRING!
const CONTAINER = process.env.AZURE_STORAGE_CONTAINER!
const SAS_MIN = parseInt(process.env.AZURE_BLOB_SAS_MINUTES || '15', 10)

if (!CONN_STR) throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set')
if (!CONTAINER) throw new Error('AZURE_STORAGE_CONTAINER is not set')

export function getContainerClient() {
  const service = BlobServiceClient.fromConnectionString(CONN_STR)

  return service.getContainerClient(CONTAINER)
}

export function normalizePrefix(prefix?: string) {
  if (!prefix) return ''
  const p = prefix.replace(/^\/+/, '').replace(/\/+$/, '')

  return p.length ? `${p}/` : ''
}

export async function listPrefix(prefix?: string) {
  const container = getContainerClient()
  const normalized = normalizePrefix(prefix)

  const folders = new Set<string>()
  const files: Array<{ name: string; path: string; size: number; lastModified: string; contentType?: string }> = []

  for await (const item of container.listBlobsFlat({ prefix: normalized })) {
    const path = item.name
    const rel = normalized ? path.substring(normalized.length) : path
    const slash = rel.indexOf('/')
    if (slash >= 0) {
      folders.add(rel.substring(0, slash))
    } else {
      files.push({
        name: rel,
        path,
        size: Number(item.properties.contentLength ?? 0),
        lastModified: item.properties.lastModified?.toISOString?.() ?? '',
        contentType: item.properties.contentType ?? undefined,
      })
    }
  }

  return {
    prefix: normalized,
    folders: Array.from(folders)
      .sort()
      .map((name) => ({ name, path: `${normalized}${name}/` })),
    files: files.sort((a, b) => a.name.localeCompare(b.name)),
  }
}

export async function deleteBlob(path: string): Promise<boolean> {
  console.info(`Deleting storage blob ${path}`)
  const container = getContainerClient()
  const blob = container.getBlobClient(path)
  const res = await blob.deleteIfExists({ deleteSnapshots: 'include' })

  return res.succeeded
}

export async function putBlob(path: string, data: Buffer | Uint8Array, contentType?: string) {
  const container = getContainerClient()
  const blob = container.getBlockBlobClient(path)
  await blob.uploadData(data, { blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined })
}

/**
 * Generate a read SAS URL for a blob (works with private containers).
 */
export async function getBlobReadUrl(path: string) {
  const container = getContainerClient()
  const blob = container.getBlobClient(path)

  // When using a connection string with shared key, the container client exposes a credential
  const cred = (container as any).credential as StorageSharedKeyCredential | undefined
  if (!cred) return blob.url // fallback (works only if container is public)

  const expiresOn = new Date(Date.now() + SAS_MIN * 60_000)
  const sas = generateBlobSASQueryParameters(
    {
      containerName: container.containerName,
      blobName: path,
      permissions: BlobSASPermissions.parse('r'),
      startsOn: new Date(Date.now() - 60_000), // clock skew
      expiresOn,
      protocol: SASProtocol.Https,
    },
    cred,
  ).toString()

  return `${blob.url}?${sas}`
}

/**
 * Internal: stream copy (download → upload), preserving content-type.
 */
async function copyByStream(src: BlobClient, dst: BlockBlobClient, overwrite = true) {
  if (!overwrite && (await dst.exists())) {
    throw new Error('Destination exists')
  }

  const dl = await src.download()
  const stream = dl.readableStreamBody
  if (!stream) throw new Error('Source download returned no stream')

  const contentType = dl.contentType || undefined
  const bufferSize = 4 * 1024 * 1024 // 4 MB
  const maxConcurrency = 5

  await dst.uploadStream(stream as any, bufferSize, maxConcurrency, {
    blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined,
  })
}

/**
 * Copy a blob. Tries service-side copy with a SAS read URL, falls back to streaming.
 * Returns 'service-copy' | 'stream-copy' | 'noop'.
 */
export async function copyBlob(oldPath: string, newPath: string, { overwrite = true } = {}) {
  if (!oldPath || !newPath) throw new Error('oldPath/newPath required')
  if (oldPath === newPath) return 'noop'

  const container = getContainerClient()
  const src = container.getBlobClient(oldPath)
  const dst = container.getBlockBlobClient(newPath)

  if (!(await src.exists())) {
    throw new Error(`Source blob not found: "${oldPath}"`)
  }
  if (!overwrite && (await dst.exists())) {
    throw new Error('Destination exists')
  }

  // Prefer service-side copy using a SAS read URL (works for private containers)
  try {
    const sourceUrl = await getBlobReadUrl(oldPath)
    const poller = await dst.beginCopyFromURL(sourceUrl)
    const res = await poller.pollUntilDone()
    if (res.copyStatus === 'success') return 'service-copy'
    // if non-success, fall through to streaming
  } catch {
    // fall back to streaming
  }

  await copyByStream(src, dst, overwrite)

  return 'stream-copy'
}

/**
 * Move (rename) a blob by copying then deleting the source.
 * Returns 'service-copy' | 'stream-copy' | 'noop'.
 */
export async function moveBlob(oldPath: string, newPath: string, opts?: { overwrite?: boolean }) {
  const how = await copyBlob(oldPath, newPath, opts)
  if (how !== 'noop') {
    // delete source after successful copy
    await deleteBlob(oldPath)
  }

  return how
}

export async function listBlobVersions(path: string): Promise<BlobVersion[]> {
  const container = getContainerClient()

  // Make sure this matches how you store blob names (no leading slash)
  const target = path
    .replace(/^\/+/, '') // remove any leading slashes
    .replace(/\?.*$/, '') // remove query string if present

  const versions: BlobVersion[] = []

  // use prefix
  for await (const item of container.listBlobsFlat({
    prefix: target,
    includeMetadata: true,
    includeVersions: true,
  })) {
    // Only keep entries for this exact blob
    if (item.name === target && item.versionId) {
      versions.push({
        id: item.versionId,
        lastModified: item.properties.lastModified?.toISOString() ?? '',
        size: item.properties.contentLength ?? 0,
        isCurrent: !!item.isCurrentVersion,
      })
    }
  }

  // Newest → oldest (optional)
  return versions.sort((a, b) => (a.lastModified < b.lastModified ? 1 : -1))
}
