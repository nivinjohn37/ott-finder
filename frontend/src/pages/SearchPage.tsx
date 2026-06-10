import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, SlidersHorizontal, ChevronDown, X, Sparkles, Star, ArrowRight, Globe, CornerDownLeft, Camera, Upload } from 'lucide-react'
import { useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSearch, useNlSearch, useSnapSearch } from '@/hooks/useMovies'
import { SearchBar } from '@/components/movie/SearchBar'
import { MovieGrid } from '@/components/movie/MovieGrid'
import { SkeletonGrid } from '@/components/common/SkeletonCard'
import { EmptyState } from '@/components/common/EmptyState'
import type { MediaType, MovieSuggestion } from '@/types'

type SortBy = 'relevance' | 'rating_desc' | 'year_desc' | 'year_asc'
type SearchMode = 'keyword' | 'ai' | 'snap'

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating_desc', label: 'Rating: High → Low' },
  { value: 'year_desc', label: 'Year: Newest First' },
  { value: 'year_asc', label: 'Year: Oldest First' },
]

const PLATFORMS = [
  { name: 'netflix', label: 'Netflix' },
  { name: 'primevideo', label: 'Prime' },
  { name: 'hotstar', label: 'Hotstar' },
  { name: 'jiocinema', label: 'JioCinema' },
  { name: 'sonyliv', label: 'SonyLIV' },
  { name: 'zee5', label: 'ZEE5' },
  { name: 'mxplayer', label: 'MX Player' },
]

const NL_EXAMPLES = [
  'something like Interstellar but shorter',
  'a feel-good Hindi movie for a rainy Sunday',
  'Korean thriller with a twist ending',
  'movies with strong female leads',
  'Malayalam crime thriller after 2018',
]

const PLACEHOLDER_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%230d1421'/%3E%3Crect x='115' y='190' width='70' height='70' rx='4' fill='none' stroke='%231d2c3e' stroke-width='2'/%3E%3Ccircle cx='135' cy='210' r='8' fill='%231d2c3e'/%3E%3Cpolygon points='115,260 142,234 163,248 185,228 185,260' fill='%231d2c3e'/%3E%3C/svg%3E"

function AiResultCard({ s, index }: { s: MovieSuggestion; index: number }) {
  const inner = (
    <div className={`group flex gap-4 p-4 rounded-2xl border transition-all duration-200 ${
      s.tmdbFound
        ? 'border-cinema-navy-border bg-cinema-card hover:border-purple-500/30 hover:bg-purple-500/5 cursor-pointer'
        : 'border-cinema-navy-border/50 bg-cinema-card/50 cursor-default'
    }`}>
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 font-heading font-bold text-xs mt-0.5">
        {index + 1}
      </div>

      <div className="flex-shrink-0 w-14 rounded-lg overflow-hidden">
        <img
          src={s.movie.posterUrl ?? PLACEHOLDER_POSTER}
          alt={s.movie.title}
          className={`w-full aspect-poster object-cover ${s.tmdbFound ? 'group-hover:scale-105 transition-transform duration-300' : 'opacity-40'}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className={`font-heading font-semibold text-sm leading-snug ${
            s.tmdbFound ? 'text-white group-hover:text-purple-200 transition-colors' : 'text-cinema-text/60'
          }`}>
            {s.movie.title}
          </h3>
          {s.tmdbFound
            ? <ArrowRight size={14} className="flex-shrink-0 text-cinema-muted/40 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all mt-0.5" />
            : <span className="flex-shrink-0 text-[10px] font-body text-cinema-muted/40 mt-0.5 whitespace-nowrap">Not on TMDB</span>
          }
        </div>

        <div className="flex items-center gap-2 mt-1 mb-2">
          {s.movie.releaseDate && (
            <span className="text-cinema-muted/60 font-body text-xs">{s.movie.releaseDate.slice(0, 4)}</span>
          )}
          {s.movie.voteAverage != null && s.movie.voteAverage > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-body text-cinema-muted/60">
              <Star size={10} fill="currentColor" className="text-yellow-500/70" />
              {s.movie.voteAverage.toFixed(1)}
            </span>
          )}
          {s.movieLanguage && (
            <span className="inline-flex items-center gap-1 text-[10px] font-body text-purple-400/70">
              <Globe size={9} /> {s.movieLanguage}
            </span>
          )}
        </div>

        <p className="text-purple-300/80 font-body text-xs leading-relaxed line-clamp-2">
          <Sparkles size={10} className="inline mr-1 opacity-60" />
          {s.reason}
        </p>
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.3) }}
    >
      {s.tmdbFound && s.movie.tmdbId
        ? <Link to={`/movie/${s.movie.tmdbId}?type=${s.movie.mediaType}`}>{inner}</Link>
        : inner
      }
    </motion.div>
  )
}

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const rawMode = params.get('mode')
  const modeParam: SearchMode = rawMode === 'ai' ? 'ai' : rawMode === 'snap' ? 'snap' : 'keyword'

  const typeParam = params.get('type')
  const mediaFilter: MediaType | 'all' = typeParam === 'movie' || typeParam === 'tv' ? typeParam : 'all'
  const sortParam = params.get('sort')
  const SORT_VALUES: SortBy[] = ['relevance', 'rating_desc', 'year_desc', 'year_asc']
  const sortBy: SortBy = SORT_VALUES.includes(sortParam as SortBy) ? (sortParam as SortBy) : 'relevance'
  const activePlatforms = new Set(params.get('platforms')?.split(',').filter(Boolean) ?? [])
  const [sortOpen, setSortOpen] = useState(false)

  // AI mode state
  const [aiInput, setAiInput] = useState(modeParam === 'ai' ? query : '')
  const [submittedAiQuery, setSubmittedAiQuery] = useState(modeParam === 'ai' ? query : '')
  const [exampleIdx, setExampleIdx] = useState(0)
  const aiInputRef = useRef<HTMLInputElement>(null)

  // Snap mode state
  const [snapFile, setSnapFile] = useState<File | null>(null)
  const [snapPreview, setSnapPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [snapResult, setSnapResult] = useState<MovieSuggestion | null | undefined>(undefined)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const snapMutation = useSnapSearch()

  const { data, isLoading, isFetching } = useSearch(modeParam === 'keyword' ? query : '')
  const { data: aiResults, isLoading: aiLoading } = useNlSearch(modeParam === 'ai' ? submittedAiQuery : '')

  function switchMode(mode: SearchMode) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('q')
      next.delete('type')
      next.delete('sort')
      next.delete('platforms')
      if (mode === 'keyword') {
        next.delete('mode')
      } else {
        next.set('mode', mode)
      }
      setAiInput('')
      setSubmittedAiQuery('')
      clearSnap()
      if (mode === 'ai') setTimeout(() => aiInputRef.current?.focus(), 50)
      return next
    }, { replace: true })
  }

  function submitAiSearch() {
    const q = aiInput.trim()
    if (!q) return
    setSubmittedAiQuery(q)
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('mode', 'ai')
      next.set('q', q)
      return next
    }, { replace: true })
  }

  function setMediaFilter(value: MediaType | 'all') {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      value === 'all' ? next.delete('type') : next.set('type', value)
      return next
    }, { replace: true })
  }

  function setSortBy(value: SortBy) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      value === 'relevance' ? next.delete('sort') : next.set('sort', value)
      return next
    }, { replace: true })
  }

  function togglePlatform(name: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      const current = new Set(prev.get('platforms')?.split(',').filter(Boolean) ?? [])
      current.has(name) ? current.delete(name) : current.add(name)
      current.size > 0 ? next.set('platforms', [...current].join(',')) : next.delete('platforms')
      return next
    }, { replace: true })
  }

  function clearFilters() {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('type')
      next.delete('sort')
      next.delete('platforms')
      return next
    }, { replace: true })
  }

  function handleFile(file: File | undefined | null) {
    if (!file || !file.type.startsWith('image/')) return
    if (snapPreview) URL.revokeObjectURL(snapPreview)
    setSnapFile(file)
    setSnapPreview(URL.createObjectURL(file))
    setSnapResult(undefined)
    snapMutation.reset()
  }

  function clearSnap() {
    setSnapPreview(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    setSnapFile(null)
    setSnapResult(undefined)
    snapMutation.reset()
  }

  async function submitSnap() {
    if (!snapFile) return
    const result = await snapMutation.mutateAsync(snapFile).catch(() => null)
    setSnapResult(result)
  }

  const hasActiveFilters = mediaFilter !== 'all' || sortBy !== 'relevance' || activePlatforms.size > 0

  const displayed = useMemo(() => {
    let result = data ?? []
    if (mediaFilter !== 'all') result = result.filter((m) => m.mediaType === mediaFilter)
    if (activePlatforms.size > 0) {
      result = result.filter((m) => m.platforms.some((p) => activePlatforms.has(p.platformName)))
    }
    const sorted = [...result]
    if (sortBy === 'rating_desc') sorted.sort((a, b) => b.voteAverage - a.voteAverage)
    else if (sortBy === 'year_desc') sorted.sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
    else if (sortBy === 'year_asc') sorted.sort((a, b) => (a.releaseDate ?? '').localeCompare(b.releaseDate ?? ''))
    return sorted
  }, [data, mediaFilter, activePlatforms, sortBy])

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? 'Sort'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Mode toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => switchMode('keyword')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-body font-medium transition-all ${
            modeParam === 'keyword'
              ? 'bg-accent text-white'
              : 'bg-cinema-navy border border-cinema-navy-border text-cinema-muted hover:text-cinema-text'
          }`}
        >
          <Search size={13} /> Keyword
        </button>
        <button
          onClick={() => switchMode('ai')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-body font-medium transition-all ${
            modeParam === 'ai'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
              : 'bg-cinema-navy border border-cinema-navy-border text-cinema-muted hover:text-cinema-text'
          }`}
        >
          <Sparkles size={13} /> Describe it
        </button>
        <button
          onClick={() => switchMode('snap')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-body font-medium transition-all ${
            modeParam === 'snap'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/30'
              : 'bg-cinema-navy border border-cinema-navy-border text-cinema-muted hover:text-cinema-text'
          }`}
        >
          <Camera size={13} /> Snap
        </button>
      </div>

      <AnimatePresence mode="wait">
        {modeParam === 'keyword' ? (
          <motion.div key="keyword" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SearchBar defaultValue={query} autoFocus={!query} />

            {query && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 mt-6">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-cinema-muted font-body text-sm shrink-0">
                    {isLoading || isFetching ? ' ' : displayed.length > 0
                      ? `${displayed.length} result${displayed.length > 1 ? 's' : ''} for "${query}"`
                      : `No results for "${query}"`}
                  </p>

                  <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 text-xs font-body text-cinema-muted/60 hover:text-accent transition-colors"
                      >
                        <X size={12} /> Clear filters
                      </button>
                    )}

                    <div className="relative">
                      <button
                        onClick={() => setSortOpen((o) => !o)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cinema-navy border border-cinema-navy-border text-cinema-muted hover:text-cinema-text text-xs font-body transition-colors"
                      >
                        <SlidersHorizontal size={13} />
                        <span className="hidden sm:inline">{currentSortLabel}</span>
                        <ChevronDown size={13} className={`transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {sortOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                          <div className="absolute right-0 top-full mt-1.5 z-20 bg-cinema-navy border border-cinema-navy-border rounded-xl shadow-card-hover overflow-hidden min-w-[190px]">
                            {SORT_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => { setSortBy(opt.value); setSortOpen(false) }}
                                className={`w-full text-left px-4 py-2.5 text-sm font-body transition-colors ${
                                  sortBy === opt.value
                                    ? 'text-accent bg-accent/10'
                                    : 'text-cinema-muted hover:text-cinema-text hover:bg-cinema-navy-hover'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
                  {(['all', 'movie', 'tv'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setMediaFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-body font-medium transition-colors whitespace-nowrap shrink-0 ${
                        mediaFilter === f
                          ? 'bg-accent text-white'
                          : 'bg-cinema-navy text-cinema-muted hover:text-cinema-text border border-cinema-navy-border'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'tv' ? 'TV Shows' : 'Movies'}
                    </button>
                  ))}

                  <div className="w-px h-4 bg-cinema-navy-border shrink-0 mx-1" />

                  {PLATFORMS.map((p) => (
                    <button
                      key={p.name}
                      onClick={() => togglePlatform(p.name)}
                      className={`px-3 py-1 rounded-full text-xs font-body font-medium transition-colors whitespace-nowrap shrink-0 ${
                        activePlatforms.has(p.name)
                          ? 'bg-accent text-white'
                          : 'bg-cinema-navy text-cinema-muted hover:text-cinema-text border border-cinema-navy-border'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="mt-6">
              {!query ? (
                <EmptyState
                  icon={<Search size={28} />}
                  title="Search for movies & shows"
                  description="Find what's streaming on Netflix, Prime, Hotstar, JioCinema and more."
                />
              ) : isLoading || isFetching ? (
                <SkeletonGrid count={12} />
              ) : displayed.length === 0 ? (
                <EmptyState
                  icon={<Search size={28} />}
                  title="No results found"
                  description={
                    hasActiveFilters
                      ? 'Try adjusting your filters or clearing them.'
                      : `We couldn't find anything for "${query}". Try a different search.`
                  }
                />
              ) : (
                <MovieGrid movies={displayed} />
              )}
            </div>
          </motion.div>

        ) : modeParam === 'ai' ? (
          <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="relative">
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-cinema-card border border-purple-500/20 focus-within:border-purple-500/50 transition-colors shadow-lg shadow-purple-900/10">
                <Sparkles size={16} className="text-purple-400 flex-shrink-0" />
                <input
                  ref={aiInputRef}
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitAiSearch()}
                  placeholder={`e.g. "${NL_EXAMPLES[exampleIdx]}"`}
                  className="flex-1 bg-transparent text-cinema-text placeholder:text-cinema-muted/40 font-body text-sm outline-none"
                  autoFocus
                />
                {aiInput && (
                  <button
                    onClick={() => { setAiInput(''); setSubmittedAiQuery('') }}
                    className="text-cinema-muted/40 hover:text-cinema-muted transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  onClick={submitAiSearch}
                  disabled={!aiInput.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-body text-xs transition-colors"
                >
                  <CornerDownLeft size={12} /> Search
                </button>
              </div>

              {!submittedAiQuery && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {NL_EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setAiInput(ex)
                        setExampleIdx(i)
                        setTimeout(() => aiInputRef.current?.focus(), 50)
                      }}
                      className="px-3 py-1 rounded-full text-xs font-body bg-purple-500/8 border border-purple-500/15 text-purple-300/70 hover:text-purple-200 hover:border-purple-500/30 transition-colors"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!submittedAiQuery ? (
              <EmptyState
                icon={<Sparkles size={28} />}
                title="Describe what you're in the mood for"
                description='Claude will find movies that match your vibe. Try "Korean thriller with a twist" or "feel-good Hindi movie".'
              />
            ) : aiLoading ? (
              <div className="flex flex-col items-center gap-4 py-20">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-pulse" />
                  <Sparkles size={24} className="absolute inset-0 m-auto text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <p className="text-cinema-muted font-body text-sm">Claude is thinking…</p>
                <p className="text-cinema-muted/40 font-body text-xs">Finding movies that match your description</p>
              </div>
            ) : !aiResults || aiResults.length === 0 ? (
              <EmptyState
                icon={<Sparkles size={28} />}
                title="No results found"
                description="Try rephrasing your description or being more specific about genre, language, or era."
              />
            ) : (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-body">
                      <Sparkles size={10} /> AI results
                    </span>
                    <p className="text-cinema-muted font-body text-sm">
                      for "{submittedAiQuery}"
                    </p>
                  </div>
                </div>
                <div className="max-w-2xl space-y-3">
                  {aiResults.map((s, i) => (
                    <AiResultCard key={`${s.movie.title}-${i}`} s={s} index={i} />
                  ))}
                </div>
                <p className="mt-6 text-cinema-muted/40 font-body text-xs">
                  Generated by Claude · Results may vary
                </p>
              </motion.div>
            )}
          </motion.div>

        ) : (
          /* ── Snap mode ── */
          <motion.div key="snap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">

            {/* Upload area */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Upload image"
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-5 border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all select-none ${
                isDragging
                  ? 'border-sky-400 bg-sky-500/5'
                  : 'border-cinema-navy-border hover:border-cinema-muted/50 hover:bg-cinema-navy/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]) }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />

              <AnimatePresence mode="wait">
                {snapPreview ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={snapPreview}
                      alt="Preview"
                      className="max-h-52 max-w-full rounded-xl object-contain shadow-lg"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); clearSnap() }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-cinema-navy border border-cinema-navy-border flex items-center justify-center text-cinema-muted hover:text-cinema-text transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-cinema-navy border border-cinema-navy-border flex items-center justify-center">
                      <Upload size={24} className="text-cinema-muted" />
                    </div>
                    <div className="text-center">
                      <p className="font-body font-medium text-cinema-text">Drop an image or click to upload</p>
                      <p className="text-cinema-muted text-sm mt-1">Movie poster · Scene screenshot · Streaming thumbnail</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Identify button */}
            {snapFile && (
              <div className="flex justify-center">
                <motion.button
                  onClick={submitSnap}
                  disabled={snapMutation.isPending}
                  whileHover={snapMutation.isPending ? {} : { scale: 1.03 }}
                  whileTap={snapMutation.isPending ? {} : { scale: 0.97 }}
                  className="flex items-center gap-2.5 px-8 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-body font-medium shadow-lg shadow-sky-900/30 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {snapMutation.isPending ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                      />
                      Fable 5 is analysing…
                    </>
                  ) : (
                    <>
                      <Camera size={16} />
                      Identify this movie
                    </>
                  )}
                </motion.button>
              </div>
            )}

            {/* Result */}
            <AnimatePresence mode="wait">
              {snapMutation.isPending ? null : snapResult !== undefined ? (
                <motion.div
                  key="snap-result"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                >
                  {snapResult === null ? (
                    <EmptyState
                      icon={<Camera size={28} />}
                      title="Couldn't identify the movie"
                      description="Try a clearer image — a movie poster, title card, or streaming thumbnail works best."
                    />
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-body">
                          <Camera size={10} /> Fable 5 identified
                        </span>
                      </div>
                      <div className="max-w-2xl">
                        <AiResultCard s={snapResult} index={0} />
                      </div>
                      <p className="mt-4 text-cinema-muted/40 font-body text-xs">
                        Powered by Claude Fable 5 · Vision · Results cached 6 hours
                      </p>
                    </>
                  )}
                </motion.div>
              ) : !snapFile ? (
                <motion.div key="snap-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <EmptyState
                    icon={<Camera size={28} />}
                    title="Identify any movie from an image"
                    description="Upload a poster, scene still, or streaming screenshot — Fable 5 will tell you what it is and where to watch it."
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
