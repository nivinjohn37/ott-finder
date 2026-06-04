import { useState } from 'react'
import { Sparkles, Loader2, Eye, EyeOff, RefreshCw } from 'lucide-react'
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

  const { data, isLoading, isError, refetch } = useReviewSummary(
    tmdbId, mediaType, spoilers, title, requested
  )

  function handleSpoilerToggle(next: boolean) {
    setSpoilers(next)
    setRevealed(false)
    if (!requested) setRequested(true)
  }

  return (
    <div className="mt-8">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 rounded-full bg-purple-500" />
        <Sparkles size={14} className="text-purple-400" />
        <h2 className="font-heading font-semibold text-cinema-text text-base">AI Summary</h2>
        <span className="px-2 py-0.5 rounded-md text-[9px] font-body font-semibold bg-purple-500/15 border border-purple-500/25 text-purple-300 tracking-widest uppercase">
          Claude
        </span>
      </div>

      {/* Card */}
      <div className="rounded-2xl overflow-hidden border border-purple-500/20 bg-gradient-to-br from-[#1a0d2e]/60 via-cinema-card to-cinema-card shadow-lg shadow-purple-900/10">
        {/* Shimmer top bar */}
        <div className="h-px bg-gradient-to-r from-transparent via-purple-500/70 to-transparent" />

        <div className="p-5">

          {/* ── Pre-request state ── */}
          {!requested && (
            <button
              onClick={() => setRequested(true)}
              className="group w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-400/40 text-purple-400 font-body text-sm transition-all duration-200"
            >
              <Sparkles size={14} className="group-hover:rotate-12 transition-transform duration-200" />
              Generate AI Summary
            </button>
          )}

          {/* ── Loading ── */}
          {requested && isLoading && (
            <div className="flex items-center gap-3 py-3">
              <div className="relative flex-shrink-0">
                <Loader2 size={16} className="animate-spin text-purple-400" />
                <div className="absolute inset-0 animate-ping rounded-full bg-purple-400/20" />
              </div>
              <span className="text-cinema-muted font-body text-sm">Analysing with Claude…</span>
            </div>
          )}

          {/* ── Error / no data ── */}
          {requested && !isLoading && (isError || !data) && (
            <div className="flex items-center justify-between">
              <p className="text-cinema-muted font-body text-sm">
                Could not generate a summary right now.
              </p>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-body transition-colors"
              >
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}

          {/* ── Summary ── */}
          {requested && !isLoading && data && (
            <div className="space-y-4">

              {/* Mode tabs */}
              <div className="flex gap-1.5 p-1 rounded-lg bg-black/20 w-fit">
                <button
                  onClick={() => handleSpoilerToggle(false)}
                  className={`px-3 py-1.5 rounded-md text-xs font-body font-medium transition-all duration-200 ${
                    !spoilers
                      ? 'bg-purple-500/30 text-purple-200 shadow-sm border border-purple-400/30'
                      : 'text-cinema-muted hover:text-cinema-text'
                  }`}
                >
                  Spoiler-free
                </button>
                <button
                  onClick={() => handleSpoilerToggle(true)}
                  className={`px-3 py-1.5 rounded-md text-xs font-body font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    spoilers
                      ? 'bg-amber-500/25 text-amber-200 shadow-sm border border-amber-400/30'
                      : 'text-cinema-muted hover:text-cinema-text'
                  }`}
                >
                  {spoilers ? <EyeOff size={11} /> : <Eye size={11} />}
                  Full (Spoilers)
                </button>
              </div>

              {/* Summary text */}
              <div className="relative">
                <p className={`font-body text-sm text-cinema-text/85 leading-relaxed transition-all duration-300 ${
                  spoilers && !revealed ? 'blur-sm select-none' : ''
                }`}>
                  {data.summary}
                </p>

                {spoilers && !revealed && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      onClick={() => setRevealed(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-white text-sm font-body font-semibold transition-colors shadow-lg shadow-amber-900/30"
                    >
                      <Eye size={14} /> Reveal Spoilers
                    </button>
                  </div>
                )}
              </div>

              {/* Keyword chips */}
              {data.keywords && data.keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-purple-500/10">
                  {data.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-body bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-colors cursor-default"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <p className="text-[10px] text-cinema-muted/40 font-body text-right">
                Generated by Claude · Sources: TMDB + Reddit
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
