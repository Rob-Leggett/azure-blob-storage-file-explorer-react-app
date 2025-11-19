export type Folder = { name: string; path: string }

export type FileRow = { name: string; path: string; size: number; lastModified: string; contentType?: string }

export type BlobVersion = {
  id: string
  lastModified: string
  size: number
  isCurrent: boolean
}
