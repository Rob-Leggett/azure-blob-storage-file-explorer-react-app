import { Badge } from '@/components/common/ui/badge'

export function AccessList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (!items.length) {
    return <div className="text-sm text-muted-foreground">{emptyLabel}</div>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((v) => (
        <Badge key={v} variant="not_started" className="rounded-full">
          {v}
        </Badge>
      ))}
    </div>
  )
}
