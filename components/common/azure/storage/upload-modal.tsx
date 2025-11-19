'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/common/ui/dialog'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { useToast } from '@/hooks/common/use-toast'

const normalizeBase = (p: string) => {
  const clean = p.trim().replace(/^\/+/, '')

  return clean ? (clean.endsWith('/') ? clean : `${clean}/`) : ''
}

const toApiPath = (p: string) => `/api/azure/storage/blobs/${p}`

type Props = {
  open: boolean
  onOpenChange: (_v: boolean) => void
  defaultBase: string
  onUploaded: () => Promise<void> | void
}

export function UploadModal({ open, onOpenChange, defaultBase, onUploaded }: Props) {
  const { toast } = useToast()
  const [base, setBase] = useState<string>(defaultBase)
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)

  // 🪄 Automatically reset to the current prefix whenever modal opens
  useEffect(() => {
    if (open) {
      setBase(defaultBase || '')
    }
  }, [open, defaultBase])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload files</DialogTitle>
          <DialogDescription>
            Choose files and a destination path. Folders are virtual and will be created if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Destination path</label>
            <Input value={base} onChange={(e) => setBase(e.target.value)} placeholder="e.g. example/2025/Oct/" />
            <p className="text-[11px] text-muted-foreground mt-1">
              Defaults to the current folder. Leave empty for root.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Files</label>
            <Input type="file" multiple onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])} />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Close
          </Button>
          <Button
            onClick={async () => {
              if (!files.length) return
              const dest = normalizeBase(base || defaultBase)
              setBusy(true)
              try {
                await Promise.all(
                  files.map(async (f) => {
                    const body = await f.arrayBuffer()
                    const path = `${dest}${f.name}`
                    const res = await fetch(toApiPath(path), {
                      method: 'PUT',
                      headers: {
                        'x-replace': '1',
                        'content-type': f.type || 'application/octet-stream',
                      },
                      body,
                    })
                    if (!res.ok) throw new Error(`Upload failed: ${f.name} (${res.status})`)
                  }),
                )
                toast({
                  title: 'Upload complete',
                  description: `${files.length} file(s) uploaded to ${dest || 'root'}`,
                })
                setFiles([])
                onOpenChange(false)
                await onUploaded()
              } catch (e: any) {
                toast({
                  title: 'Upload failed',
                  description: e?.message ?? 'Unknown error',
                  variant: 'destructive',
                })
              } finally {
                setBusy(false)
              }
            }}
            disabled={busy || files.length === 0}
          >
            {busy ? 'Uploading…' : `Upload ${files.length || ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
