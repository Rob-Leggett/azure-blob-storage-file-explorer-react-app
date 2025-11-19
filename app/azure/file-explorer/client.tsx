'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/ui/card'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { useToast } from '@/hooks/common/use-toast'
import { FileTable } from '@/components/common/azure/storage/file-table'
import { UploadModal } from '@/components/common/azure/storage/upload-modal'
import { ConfirmDeleteModal } from '@/components/common/azure/storage/confirm-delete-modal'
import { FileDetailsModal } from '@/components/common/azure/storage/file-details-modal'
import type { FileRow, Folder } from '@/lib/types/common/azure/storage/blobs'

type ListPayload = { prefix: string; folders: Folder[]; files: FileRow[] }

type VersioningStatus = { enabled: boolean }

const listFetcher = async (url: string): Promise<ListPayload> => {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`List failed: ${res.status}`)
  return res.json()
}

const ensureTrailingSlash = (p: string) => (p && !p.endsWith('/') ? `${p}/` : p)
const toApiPath = (p: string) => `/api/azure/storage/blobs/${p}`

export default function FileExplorerPage() {
  const { toast } = useToast()
  const [prefix, setPrefix] = useState<string>('') // '' or ends with '/'
  const [uploadOpen, setUploadOpen] = useState(false)
  const [jumpPath, setJumpPath] = useState('')

  // selection (paths)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // delete modal state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteRows, setDeleteRows] = useState<FileRow[]>([])

  // details modal state
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsFile, setDetailsFile] = useState<FileRow | null>(null)

  const swrKey = `/api/azure/storage/blobs?prefix=${prefix}`
  const { data, isLoading, isValidating, mutate } = useSWR<ListPayload>(swrKey, listFetcher, {
    refreshInterval: 0,
    revalidateOnFocus: false,
    revalidateIfStale: false,
    dedupingInterval: 2000,
  })

  const onRefresh = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault()
      e?.stopPropagation()
      if (isValidating) return
      void mutate()
    },
    [mutate, isValidating],
  )

  // Clear selection when changing folders
  useEffect(() => {
    setSelected(new Set())
  }, [prefix])

  const folders = data?.folders ?? []
  const files = data?.files ?? []

  const breadcrumbs = useMemo(() => {
    const parts = prefix.replace(/\/+$/, '').split('/').filter(Boolean)
    const crumbs: Array<{ label: string; path: string }> = [{ label: 'root', path: '' }]
    let acc = ''
    for (const p of parts) {
      acc = acc ? `${acc}/${p}` : p
      crumbs.push({ label: p, path: ensureTrailingSlash(acc) })
    }

    return crumbs
  }, [prefix])

  const resetSelectionToVisible = () => {
    setSelected((prev) => new Set(Array.from(prev).filter((p) => files.some((f) => f.path === p))))
  }

  // ---- core delete implementation (used by modal) ----
  const performBulkDelete = useCallback(
    async (rows: FileRow[]) => {
      if (!rows.length) return
      const results = await Promise.allSettled(rows.map((r) => fetch(toApiPath(r.path), { method: 'DELETE' })))

      const ok = results.filter(
        (r) => r.status === 'fulfilled' && (r as PromiseFulfilledResult<Response>).value.ok,
      ).length
      const fail = results.length - ok

      toast({
        title: 'Delete complete',
        description: `${ok} deleted, ${fail} failed`,
        variant: fail ? 'destructive' : 'default',
      })

      await mutate()
      resetSelectionToVisible()
    },
    [mutate, toast],
  )

  const openDeleteModalForPaths = (paths: string[]) => {
    if (!paths.length) return
    const rows = files.filter((f) => paths.includes(f.path))
    if (!rows.length) return
    setDeleteRows(rows)
    setDeleteOpen(true)
  }

  const openDeleteModalForRows = (rows: FileRow[]) => {
    if (!rows.length) return
    setDeleteRows(rows)
    setDeleteOpen(true)
  }

  // ---- handlers wired into FileTable ----

  // Single delete (FileTable currently passes path: string)
  const handleRequestDeleteOne = (path: string) => {
    openDeleteModalForPaths([path])
  }

  // Bulk delete (FileTable passes selected rows)
  const handleRequestBulkDelete = (rows: FileRow[]) => {
    openDeleteModalForRows(rows)
  }

  // Bulk download stays immediate
  const handleBulkDownload = async (rows: FileRow[]) => {
    for (const r of rows) {
      try {
        const res = await fetch(`${toApiPath(r.path)}?t=${Date.now()}`)
        if (!res.ok) throw new Error(`${r.path} (${res.status})`)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = r.name
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        toast({ title: 'Download failed', description: message, variant: 'destructive' })
      }
    }
  }

  // Rename is still direct
  async function onRenameOne(row: FileRow, newNameOrPath: string) {
    const isPathLike = /\/.+/.test(newNameOrPath) || newNameOrPath.endsWith('/')
    const newPath = isPathLike ? newNameOrPath : `${prefix}${newNameOrPath.trim()}`
    const res = await fetch(toApiPath(row.path), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'rename', newPath }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      toast({ title: 'Rename failed', description: `${res.status} ${detail}`, variant: 'destructive' })
      return
    }
    toast({ title: 'Renamed', description: `${row.name} → ${newPath}` })
    await mutate()
    resetSelectionToVisible()
  }

  // Row click → open details modal
  const handleRowClick = (row: FileRow) => {
    setDetailsFile(row)
    setDetailsOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 bg-white">
      <div className="h-2 w-full bg-red-600 rounded-md" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">File Explorer</h1>
          <p className="text-muted-foreground">Browse, upload, rename, replace, delete & download blobs.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setUploadOpen(true)}>
            Upload…
          </Button>
          <Button type="button" variant="outline" onClick={onRefresh} disabled={isValidating}>
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Refreshing…
              </>
            ) : (
              'Refresh'
            )}
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {breadcrumbs.map((c, i) => (
          <span key={c.path} className="flex items-center gap-2">
            <Button
              type="button"
              variant="link"
              className="h-auto p-0"
              onClick={() => setPrefix(c.path)}
              disabled={i === breadcrumbs.length - 1}
            >
              {c.label}
            </Button>
            {i < breadcrumbs.length - 1 && <span>/</span>}
          </span>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contents</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground">
              {isLoading ? 'Loading…' : `${folders.length} folder(s), ${files.length} file(s)`}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Jump to path (e.g. example/2025/Oct/)"
                value={jumpPath}
                onChange={(e) => setJumpPath(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = jumpPath.trim().replace(/^\/+/, '')
                    setPrefix(val && !val.endsWith('/') ? `${val}/` : val)
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const val = jumpPath.trim().replace(/^\/+/, '')
                  setPrefix(val && !val.endsWith('/') ? `${val}/` : val)
                }}
              >
                Go
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
            </div>
          ) : (
            <FileTable
              folders={folders}
              files={files}
              setPrefix={setPrefix}
              selected={selected}
              setSelected={setSelected}
              onDeleteOne={handleRequestDeleteOne}
              onRenameOne={onRenameOne}
              onBulkDownload={handleBulkDownload}
              onBulkDelete={handleRequestBulkDelete}
              // You’ll need to support this in FileTable:
              onRowClick={handleRowClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Upload */}
      <UploadModal
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        defaultBase={prefix}
        onUploaded={async () => {
          await mutate()
          resetSelectionToVisible()
        }}
      />

      {/* Confirm delete */}
      <ConfirmDeleteModal
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteRows([])
          setDeleteOpen(open)
        }}
        count={deleteRows.length}
        onConfirm={async () => {
          const rows = [...deleteRows]
          setDeleteRows([])
          setDeleteOpen(false)
          await performBulkDelete(rows)
        }}
      />

      {/* File details / versions */}
      <FileDetailsModal
        open={detailsOpen}
        onOpenChange={(open) => {
          if (!open) setDetailsFile(null)
          setDetailsOpen(open)
        }}
        file={detailsFile}
      />
    </div>
  )
}
