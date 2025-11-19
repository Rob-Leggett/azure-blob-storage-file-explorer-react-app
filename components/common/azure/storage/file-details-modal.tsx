'use client'

import useSWR from 'swr'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/common/ui/dialog'
import { Button } from '@/components/common/ui/button'
import { Download, Loader2 } from 'lucide-react'
import type { FileRow } from '@/lib/types/common/azure/storage/blobs'
import React from 'react'

type FileMetadata = FileRow & {
  contentType?: string
  createdOn?: string
  lastModified?: string
  size?: number
  metadata?: Record<string, string>
}

type FileVersion = {
  id: string
  lastModified: string
  size: number
  isCurrent: boolean
}

type VersionsResponse = {
  versions: FileVersion[]
}

const fetchJson = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return (await res.json()) as T
}

type Props = {
  open: boolean
  onOpenChange: (_v: boolean) => void
  file: FileRow | null
}

export function FileDetailsModal({ open, onOpenChange, file }: Props) {
  const path = file?.path ?? ''

  const {
    data: meta,
    isLoading: metaLoading,
    error: metaError,
  } = useSWR<FileMetadata>(
    open && path ? `/api/azure/storage/blobs/${encodeURIComponent(path)}?meta=1` : null,
    fetchJson,
  )

  const {
    data: versions,
    isLoading: versionsLoading,
    error: versionsError,
  } = useSWR<VersionsResponse>(
    open && path ? `/api/azure/storage/blobs/versions?path=${encodeURIComponent(path)}?meta=1` : null,
    fetchJson,
  )

  const handleDownload = async (path: string, versionId: string | null, suggestedName: string) => {
    const url =
      versionId != null
        ? `/api/azure/storage/blobs/${encodeURIComponent(path)}?versionId=${encodeURIComponent(versionId)}`
        : `/api/azure/storage/blobs/${encodeURIComponent(path)}`

    const res = await fetch(url)
    if (!res.ok) {
      console.error('Download failed', res.status, res.statusText)
      return
    }
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = suggestedName
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }

  const title = file ? file.name : 'File details'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[65%] h-[55vh] p-0">
        <DialogHeader className="px-6 py-4 shrink-0 space-y-1">
          <DialogTitle className="flex items-center gap-2">{title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-sm text-muted-foreground">
            View metadata and previous versions for this blob.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
          <div className="rounded-lg border p-4">
            <div className="space-y-4">
              {!file ? (
                <p className="text-sm text-muted-foreground">No file selected.</p>
              ) : (
                <div className="space-y-4">
                  {/* Current version / metadata */}
                  <section>
                    <h3 className="text-sm font-semibold">Details</h3>
                    {metaLoading ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading metadata…
                      </div>
                    ) : metaError ? (
                      <p className="text-xs text-destructive mt-1">
                        Failed to load metadata: {(metaError as Error).message}
                      </p>
                    ) : meta ? (
                      <dl className="mt-1 grid grid-cols-[max-content,1fr] gap-x-3 gap-y-1 text-xs">
                        <dt className="font-medium">Path</dt>
                        <dd className="break-all">{meta.path}</dd>
                        {meta.contentType && (
                          <>
                            <dt className="font-medium">Content type</dt>
                            <dd>{meta.contentType}</dd>
                          </>
                        )}
                        {typeof meta.size === 'number' && (
                          <>
                            <dt className="font-medium">Size</dt>
                            <dd>{meta.size.toLocaleString()} bytes</dd>
                          </>
                        )}
                        {meta.createdOn && (
                          <>
                            <dt className="font-medium">Created</dt>
                            <dd>{new Date(meta.createdOn).toLocaleString()}</dd>
                          </>
                        )}
                        {meta.lastModified && (
                          <>
                            <dt className="font-medium">Last modified</dt>
                            <dd>{new Date(meta.lastModified).toLocaleString()}</dd>
                          </>
                        )}
                        {meta.metadata && Object.keys(meta.metadata).length > 0 && (
                          <>
                            <dt className="font-medium">Metadata</dt>
                            <dd className="space-y-0.5">
                              {Object.entries(meta.metadata).map(([k, v]) => (
                                <div key={k}>
                                  <span className="font-medium">{k}:</span> {v}
                                </div>
                              ))}
                            </dd>
                          </>
                        )}
                      </dl>
                    ) : null}
                  </section>

                  {/* Versions */}
                  <section>
                    <h3 className="text-sm font-semibold">Versions</h3>
                    {versionsLoading ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading versions…
                      </div>
                    ) : versionsError ? (
                      <p className="text-xs text-destructive mt-1">
                        Failed to load versions: {(versionsError as Error).message}
                      </p>
                    ) : !versions || versions.versions.length === 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">No previous versions found.</p>
                    ) : (
                      <div className="mt-1 max-h-52 overflow-y-auto border rounded-md">
                        <table className="w-full text-[10px]">
                          <thead className="bg-muted/60">
                            <tr>
                              <th className="px-2 py-1 text-left font-medium">Version</th>
                              <th className="px-2 py-1 text-left font-medium">Last modified</th>
                              <th className="px-2 py-1 text-right font-medium">Size</th>
                              <th className="px-2 py-1 text-right font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {versions.versions.map((v) => (
                              <tr key={v.id} className={v.isCurrent ? 'bg-muted/40' : ''}>
                                <td className="px-2 py-1 align-top break-all">
                                  {v.isCurrent ? <span className="font-semibold">Current</span> : v.id}
                                </td>
                                <td className="px-2 py-2 align-top">{new Date(v.lastModified).toLocaleString()}</td>
                                <td className="px-2 py-2 align-top text-right">{v.size.toLocaleString()} B</td>
                                <td className="px-2 py-2 align-top text-right">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="xs"
                                    onClick={() => handleDownload(file.path, v.id, `${file.name}.v-${v.id}`)}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    Download
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
