import { Star } from 'lucide-react'

export function RatingBadge({ value }: { value: number }) {
  if (!value) return null
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rating/15 text-rating text-xs font-body font-medium">
      <Star size={10} fill="currentColor" />
      {value.toFixed(1)}
    </span>
  )
}
