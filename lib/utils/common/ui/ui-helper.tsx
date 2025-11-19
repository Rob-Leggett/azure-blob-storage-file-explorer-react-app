import { File, FileArchive, FileSymlink, FileCheck2, FileX2 } from 'lucide-react'
import { Status } from '@/lib/types/server'
import { ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Return a Lucide icon component for the test result status
 */
export const getStateIcon = (type: Status | undefined) => {
  switch (type) {
    case 'successful':
      return (
        <div className="rounded-full bg-green-100 p-2 text-green-600 dark:bg-green-800/20">
          <FileCheck2 className="h-4 w-4" />
        </div>
      )
    case 'failed':
      return (
        <div className="rounded-full bg-red-100 p-2 text-red-600 dark:bg-red-900/20">
          <FileX2 className="h-4 w-4" />
        </div>
      )
    case 'queued':
      return (
        <div className="rounded-full bg-purple-100 p-2 text-purple-600 dark:bg-purple-900/20">
          <FileArchive className="h-4 w-4" />
        </div>
      )
    case 'skipped':
      return (
        <div className="rounded-full bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/20">
          <FileSymlink className="h-4 w-4" />
        </div>
      )
    default:
      return (
        <div className="rounded-full bg-gray-100 p-2 text-gray-600 dark:bg-gray-800/20">
          <File className="h-4 w-4" />
        </div>
      )
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
