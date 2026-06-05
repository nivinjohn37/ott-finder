import { useRef, useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Film, Tv2, Sparkles } from 'lucide-react'
import { searchMovies } from '@/api/movies'
import type { MovieSearchResult } from '@/types'

interface Props {
  defaultValue?: string
  autoFocus?: boolean
  showAiLink?: boolean
}

export function SearchBar({ defaultValue = '', autoFocus = false, showAiLink = false }: Props) {
  const [value, setValue] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<MovieSearchResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [currentParams] = useSearchParams()

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Debounced suggestions fetch
  useEffect(() => {
    const q = value.trim()
    if (q.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchMovies(q)
        setSuggestions(results.slice(0, 6))
        setShowSuggestions(true)
      } catch {
        setSuggestions([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [value])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (q.length >= 2) {
      setShowSuggestions(false)
      const next = new URLSearchParams(currentParams)
      next.set('q', q)
      navigate(`/search?${next.toString()}`)
    }
  }

  function handleSuggestionClick(movie: MovieSearchResult) {
    setShowSuggestions(false)
    setValue(movie.title)
    navigate(`/movie/${movie.tmdbId}?type=${movie.mediaType}`)
  }

  function handleClear() {
    setValue('')
    setSuggestions([])
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative w-full space-y-2">
      <motion.form
        onSubmit={handleSubmit}
        className="relative w-full"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-cinema-muted pointer-events-none" />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowSuggestions(false) }}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="Search movies and shows on Indian OTT…"
          className="w-full pl-12 pr-12 py-4 bg-cinema-navy border border-cinema-navy-border rounded-xl text-cinema-text font-body placeholder:text-cinema-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-cinema-muted hover:text-cinema-text"
          >
            <X size={18} />
          </button>
        )}
      </motion.form>

      {/* AI search hint */}
      {showAiLink && (
        <div className="flex justify-end">
          <Link
            to="/search?mode=ai"
            className="inline-flex items-center gap-1.5 text-xs font-body text-purple-400/70 hover:text-purple-300 transition-colors"
          >
            <Sparkles size={11} /> Try AI search — describe what you want to watch
          </Link>
        </div>
      )}

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-cinema-navy border border-cinema-navy-border rounded-xl shadow-card-hover overflow-hidden"
          >
            {suggestions.map((movie) => (
              <button
                key={`${movie.tmdbId}-${movie.mediaType}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSuggestionClick(movie)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cinema-navy-hover transition-colors text-left group"
              >
                {/* Poster thumbnail */}
                <div className="w-8 h-12 rounded overflow-hidden bg-cinema-surface shrink-0">
                  {movie.posterUrl ? (
                    <img src={movie.posterUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-cinema-muted/40">
                      {movie.mediaType === 'tv' ? <Tv2 size={14} /> : <Film size={14} />}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-body font-medium text-sm text-cinema-text truncate group-hover:text-accent transition-colors">
                    {movie.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-cinema-muted/70 text-xs font-body">
                      {movie.releaseDate?.slice(0, 4) ?? '—'}
                    </span>
                    <span className={`text-2xs font-body px-1.5 py-0.5 rounded ${
                      movie.mediaType === 'tv'
                        ? 'bg-sky-badge/15 text-sky-badge'
                        : 'bg-cinema-navy-border text-cinema-muted'
                    }`}>
                      {movie.mediaType === 'tv' ? 'TV' : 'Movie'}
                    </span>
                    {movie.platforms.length > 0 && (
                      <span className="text-accent text-xs font-body">
                        · {movie.platforms.length} platform{movie.platforms.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {movie.voteAverage > 0 && (
                  <span className="text-rating text-xs font-body font-semibold shrink-0">
                    ★ {movie.voteAverage.toFixed(1)}
                  </span>
                )}
              </button>
            ))}

            <div className="px-4 py-2 border-t border-cinema-navy-border">
              <p className="text-cinema-muted/50 text-xs font-body">
                Press <kbd className="px-1 py-0.5 rounded bg-cinema-surface text-cinema-muted text-2xs">↵</kbd> to see all results
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
