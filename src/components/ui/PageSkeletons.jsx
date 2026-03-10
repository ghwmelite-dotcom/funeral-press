import { Skeleton } from './skeleton'

export function EditorSkeleton() {
  // Two-column layout: left sidebar (form fields) + right preview area
  return (
    <div className="h-screen bg-background flex">
      <div className="w-80 border-r border-border p-4 space-y-4 hidden md:block">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <Skeleton className="w-full max-w-md aspect-[3/4] rounded-lg" />
      </div>
    </div>
  )
}

export function GallerySkeleton() {
  // Grid of cards
  return (
    <div className="min-h-screen bg-background p-6">
      <Skeleton className="h-10 w-64 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  // Stats cards + table
  return (
    <div className="min-h-screen bg-background p-6">
      <Skeleton className="h-10 w-48 mb-6" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}

export function BlogSkeleton() {
  // Article layout
  return (
    <div className="min-h-screen bg-background max-w-3xl mx-auto p-6">
      <Skeleton className="h-8 w-3/4 mb-4" />
      <Skeleton className="h-4 w-1/3 mb-8" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-6" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  )
}

export function DesignsSkeleton() {
  // My designs grid
  return (
    <div className="min-h-screen bg-background p-6">
      <Skeleton className="h-10 w-40 mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
            <Skeleton className="aspect-[3/4] rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
