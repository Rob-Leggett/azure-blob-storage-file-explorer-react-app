'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FolderOpen, Download, Pencil, Trash, Usb } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/common/ui/popover'
import type { FileRow, Folder } from '@/lib/types/common/azure/storage/blobs'

const ensureTrailingSlash = (p: string) => (p && !p.endsWith('/') ? `${p}/` : p)
const toApiPath = (p: string) => `/api/azure/storage/blobs/${p}`

type FileTableProps = {
  folders: Folder[]
  files: FileRow[]
  setPrefix: (_p: string) => void
  selected: Set<string>
  setSelected: (_s: Set<string>) => void
  onRowClick?: (_row: FileRow) => void
  onDeleteOne: (_path: string) => void
  onRenameOne: (_row: FileRow, _newNameOrPath: string) => Promise<void>
  // NEW (optional) bulk callbacks
  onBulkDownload?: (_rows: FileRow[]) => Promise<void> | void
  onBulkDelete?: (_rows: FileRow[]) => Promise<void> | void
}

export function FileTable({
  folders,
  files,
  setPrefix,
  selected,
  setSelected,
  onRowClick,
  onDeleteOne,
  onRenameOne,
  onBulkDownload,
  onBulkDelete,
}: FileTableProps) {
  const allChecked = files.length > 0 && selected.size === files.length
  const someChecked = selected.size > 0 && selected.size < files.length
  const selectedRows = useMemo(() => files.filter((f) => selected.has(f.path)), [files, selected])

  const toggleAll = () => {
    if (allChecked) setSelected(new Set())
    else setSelected(new Set(files.map((f) => f.path)))
  }

  const toggleRow = (path: string) => {
    const next = new Set(selected)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    setSelected(next)
  }

  // -------- internal fallbacks (used only if parent didn't pass handlers) --------
  const internalDownload = async (rows: FileRow[]) => {
    for (const r of rows) {
      const res = await fetch(`${toApiPath(r.path)}?t=${Date.now()}`)
      if (!res.ok) continue
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = r.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 500)
    }
  }

  const internalDelete = async (rows: FileRow[]) => {
    await Promise.allSettled(rows.map((r) => onDeleteOne(r.path)))
  }

  return (
    <div className="rounded-lg border bg-white shadow-sm p-4 md:p-6">
      {/* Folders */}
      {folders.length > 0 && (
        <div className="pb-2">
          <div className="text-xs font-semibold text-muted-foreground mb-3">Folders</div>
          <ul className="space-y-1.5">
            {folders.map((f) => (
              <li key={f.path} className="flex items-center justify-between text-sm">
                <button
                  className="text-blue-600 hover:underline inline-flex items-center gap-2"
                  onClick={() => setPrefix(ensureTrailingSlash(f.path))}
                >
                  <FolderOpen className="h-4 w-4" />
                  {f.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Inline toolbar (replaces sticky yellow bar) */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-md border px-3 py-2">
          <span className="text-sm">{selected.size} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (onBulkDownload ? onBulkDownload(selectedRows) : internalDownload(selectedRows))}
            >
              Download
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => (onBulkDelete ? onBulkDelete(selectedRows) : internalDelete(selectedRows))}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Files */}
      <div className={folders.length > 0 ? 'mt-4' : ''}>
        <div className="rounded-md overflow-x-auto border border-gray-200/70 shadow-[0_0_0_1px_rgba(0,0,0,0.02)]">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-gray-200 bg-gray-50/50">
                <th className="py-3.5 pl-4 md:pl-5 pr-3 w-[44px]">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked
                    }}
                    onChange={toggleAll}
                  />
                </th>
                <th className="py-3.5 pr-3">Name</th>
                <th className="py-3.5 pr-3">Size</th>
                <th className="py-3.5 pr-3">Last Modified</th>
                <th className="py-3.5 pr-3">Type</th>
                <th className="py-3.5 pl-3 md:pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No files here yet.
                  </td>
                </tr>
              ) : (
                files.map((row) => (
                  <tr
                    key={row.path}
                    className="border-b border-gray-100 hover:bg-gray-50/40 last:border-0 transition-colors"
                  >
                    <td className="py-3.5 pl-4 md:pl-5 pr-3 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.has(row.path)}
                        onChange={() => toggleRow(row.path)}
                        aria-label={`Select ${row.name}`}
                      />
                    </td>
                    <td className="py-3.5 pr-3 align-middle">{row.name}</td>
                    <td className="py-3.5 pr-3 align-middle">{(row.size / 1024).toFixed(1)} KB</td>
                    <td className="py-3.5 pr-3 align-middle">
                      {row.lastModified ? new Date(row.lastModified).toLocaleString() : ''}
                    </td>
                    <td className="py-3.5 pr-3 align-middle">{row.contentType ?? '—'}</td>
                    <td className="py-3.5 pl-3 md:pr-5 align-middle">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => onRowClick?.(row)}>
                          <Usb className="h-3.5 w-3.5 mr-1" />
                          Versions
                        </Button>

                        <Button asChild variant="outline" size="sm" className="text-xs inline-flex items-center gap-1">
                          <a
                            href={`/api/azure/storage/blobs/${row.path}?t=${Date.now()}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        </Button>

                        <InlineRenameButton row={row} onRenameOne={onRenameOne} />

                        <Button
                          variant="destructive"
                          size="sm"
                          className="text-xs"
                          onClick={() => onDeleteOne(row.path)}
                        >
                          <Trash className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ---------- Single inline rename ---------- */
export function InlineRenameButton({
  row,
  onRenameOne,
}: {
  row: FileRow
  onRenameOne: (_r: FileRow, _n: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(row.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus())

      return () => cancelAnimationFrame(id)
    }
  }, [open])

  const save = async () => {
    const v = value.trim()
    if (!v || v === row.name) {
      setOpen(false)

      return
    }
    try {
      setBusy(true)
      await onRenameOne(row, v)
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={(v) => !busy && setOpen(v)}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs inline-flex items-center gap-1">
          <Pencil className="h-3.5 w-3.5" />
          Rename
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        className="w-72"
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'Enter') {
            e.preventDefault()
            void save()
          }
        }}
      >
        <label className="block text-xs font-medium text-muted-foreground mb-1">New name</label>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm"
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={busy || !value.trim()}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
