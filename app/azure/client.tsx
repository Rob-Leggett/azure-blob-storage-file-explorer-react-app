'use client'

export default function AzurePage() {
  return (
    <div className="flex flex-col gap-6 bg-white">
      {/* Thick red bar at top */}
      <div className="h-2 w-full bg-red-600 rounded-md" />

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Azure</h1>
        <p className="text-muted-foreground">Welcome back! Here&apos;s an overview of your Azure space.</p>
      </div>

      <div className="space-y-4">TBA</div>
    </div>
  )
}
