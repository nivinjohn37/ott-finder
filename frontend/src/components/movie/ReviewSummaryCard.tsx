import { useState } from 'react'
import { Sparkles, Loader2, Eye } from 'lucide-react'
import { useReviewSummary } from '@/hooks/useMovies'

interface Props {
  tmdbId: number
  mediaType: string
  title: string
}

export function ReviewSummaryCard({ tmdbId, mediaType, title }: Props) {
  const [spoilers, setSpoilers] = useState(false)
  const [requested, setRequested] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const { data, isLoading } = useReviewSummary(tmdbId, mediaType, spoilers, title, requested)

  function handleSpoilerToggle(next: boolean) {
    setSpoilers(next)
    setRevealed(false)
    if (!requested) setRequested(true)
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-5 rounded-full bg-purple-500" />
        <Sparkles size={15} className="text-purple-400" />
        <h2 className="font-heading font-semibold text-cinema-text text-base">AI Summary</h2>
        <span className="px-2 py-0.5 rounded text-[10px] font-body bg-purple-500/10 border border-purple-500/20 text-purple-400 tracking-wide">
          Claude
        </span>
      </div>

      <div className="rounded-xl border border-cinema-navy-border bg-cinema-card p-4 sm:p-5">
        {/* Generate button — shown before first request */}
        {!requested && (
          <button
            onClick={() => setRequested(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-purple-400 font-body text-sm transition-colors"
          >
            <Sparkles size={14} />
            Generate AI Summary
          </button>
        )}

        {/* Loading */}
        {requested && isLoading && (
          <div className="flex items-center gap-3 py-3">
            <Loader2 size={16} className="animate-spin text-purple-400 flex-shrink-0" />
            <span className="text-cinema-muted font-body text-sm">Analysing reviews with Claude…</span>
          </div>
        )}

        {/* Not enough reviews */}
        {requested && !isLoading && data === null && (
          <p className="text-cinema-muted font-body text-sm py-2">
            Not enough reviews to generate a summary yet.
          </p>
        )}

        {/* Summary shown */}
        {requested && !isLoading && data && (
          <div>
            {/* Mode toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => handleSpoilerToggle(false)}
                className={`px-3 py-1 rounded-full text-xs font-body transition-colors ${
                  !spoilers
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-cinema-muted hover:text-cinema-text'
                }`}
              >
                Spoiler-free
              </button>
              <button
                onClick={() => handleSpoilerToggle(true)}
                className={`px-3 py-1 rounded-full text-xs font-body transition-colors flex items-center gap-1 ${
                  spoilers
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-cinema-muted hover:text-cinema-text'
                }`}
              >
                <Eye size={11} />
                Full (Spoilers)
              </button>
            </div>

            {/* Summary text */}
            <div className="relative">
              <p className={`font-body text-sm text-cinema-text/90 leading-relaxed transition-all duration-200 ${
                spoilers && !revealed ? 'blur-sm select-none' : ''
              }`}>
                {data.summary}
              </p>

              {spoilers && !revealed && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={() => setRevealed(true)}
                    className="px-4 py-2 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-white text-sm font-body font-medium transition-colors shadow-lg"
                  >
                    Reveal Spoilers
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
