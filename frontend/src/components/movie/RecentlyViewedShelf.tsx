import { Clock, X } from 'lucide-react'
import { motion } from 'framer-motion'
import type { MovieSearchResult } from '@/types'
import { MovieCard } from '@/components/movie/MovieCard'

interface Props {
  items: MovieSearchResult[]
  onClear: () => void
}

export function RecentlyViewedShelf({ items, onClear }: Props) {
  if (items.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-accent" />
          <h2 className="font-heading font-bold text-xl text-cinema-text flex items-center gap-2">
            <Clock size={18} className="text-cinema-muted" />
            Recently Viewed
          </h2>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs font-body text-cinema-muted/60 hover:text-cinema-muted transition-colors"
        >
          <X size={13} /> Clear
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((movie) => (
          <div key={movie.tmdbId} className="flex-shrink-0 w-36 sm:w-40">
            <MovieCard movie={movie} />
          </div>
        ))}
      </div>
    </motion.section>
  )
}
