export function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3">
      <div className="aspect-poster w-full rounded-xl skeleton" />
      <div className="space-y-2 px-1">
        <div className="h-4 rounded skeleton w-4/5" />
        <div className="h-3 rounded skeleton w-2/5" />
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
