import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Trash2, Clock, ExternalLink, Film } from 'lucide-react'
import type { WatchlistItem } from '@/types'
import { PlatformBadge } from '@/components/common/PlatformBadge'
import { RatingBadge } from '@/components/common/RatingBadge'
import { useRemoveFromWatchlist } from '@/hooks/useWatchlist'

interface Props {
  item: WatchlistItem
}

export function WatchlistCard({ item }: Props) {
  const { mutate: remove, isPending } = useRemoveFromWatchlist()
  const [imgError, setImgError] = useState(false)
  const isExpiring = item.expiringPlatforms.length > 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className={`relative rounded-xl overflow-hidden bg-cinema-navy border transition-colors ${
        isExpiring ? 'border-accent/40' : 'border-cinema-navy-border'
      }`}
    >
      {isExpiring && (
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-accent to-orange-400" />
      )}

      <div className="flex gap-4 p-4">
        {/* Poster */}
        <Link
          to={`/movie/${item.movie.tmdbId}?type=${item.movie.mediaType}`}
          className="flex-shrink-0"
        >
          <div className="w-20 h-28 rounded-lg overflow-hidden bg-cinema-card">
            {item.movie.posterUrl && !imgError ? (
              <img
                src={item.movie.posterUrl}
                alt={item.movie.title}
                onError={() => setImgError(true)}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-cinema-navy-border/40">
                <Film size={20} className="text-cinema-muted/50" />
                <span className="text-cinema-muted/40 text-2xs font-body text-center px-1 leading-tight line-clamp-2">
                  {item.movie.title}
                </span>
              </div>
            )}
          </div>
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/movie/${item.movie.tmdbId}?type=${item.movie.mediaType}`}>
              <h3 className="font-heading font-semibold text-cinema-text hover:text-white transition-colors line-clamp-2 leading-snug">
                {item.movie.title}
              </h3>
            </Link>
            <button
              onClick={() => remove(item.id)}
              disabled={isPending}
              className="flex-shrink-0 p-1.5 rounded-lg text-cinema-muted hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
              aria-label="Remove from watchlist"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <RatingBadge value={item.movie.voteAverage} />
            <span className="text-cinema-muted/60 text-xs font-body uppercase tracking-wide">
              {item.movie.mediaType}
            </span>
            {item.addedAt && (
              <span className="text-cinema-muted/40 text-xs font-body">
                · Added {new Date(item.addedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>

          {/* Platform badges */}
          {item.movie.platforms && item.movie.platforms.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {item.movie.platforms.slice(0, 4).map((p) => (
                <PlatformBadge key={p.platformName} platform={p} size="sm" />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-cinema-muted/50 text-xs font-body italic">
              Not on any tracked platform
            </p>
          )}

          {/* Expiry warning */}
          {isExpiring && (
            <div className="flex items-center gap-1.5 mt-2.5 px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
              <Clock size={12} className="text-accent flex-shrink-0" />
              <p className="text-accent text-xs font-body font-medium">
                Leaving soon from {item.expiringPlatforms.map((p) => p.displayName).join(', ')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Watch link */}
      {item.movie.platforms?.[0]?.deepLink && (
        <div className="border-t border-cinema-navy-border px-4 py-2.5">
          <a
            href={item.movie.platforms[0].deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-accent hover:text-accent/80 text-xs font-body font-medium transition-colors"
          >
            <ExternalLink size={11} />
            Watch on {item.movie.platforms[0].displayName}
          </a>
        </div>
      )}
    </motion.div>
  )
}
