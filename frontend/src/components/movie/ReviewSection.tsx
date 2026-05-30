import { useState, useEffect } from 'react'
import { Star, Trash2, Loader2, ThumbsUp, Flag } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useReviews, useUpsertReview, useDeleteReview, useLikeReview, useReportReview } from '@/hooks/useReviews'
import { getReviews } from '@/api/reviews'
import type { ReviewDto } from '@/types'

interface Props {
  tmdbId: number
}

export function ReviewSection({ tmdbId }: Props) {
  const { user } = useAuth()
  const { data, isLoading } = useReviews(tmdbId)
  const { mutateAsync: upsert, isPending: saving } = useUpsertReview(tmdbId)
  const { mutateAsync: remove, isPending: deleting } = useDeleteReview(tmdbId)
  const { mutate: toggleLike } = useLikeReview(tmdbId)
  const { mutate: report, isPending: reporting, variables: reportingId } = useReportReview(tmdbId)

  const [hovered, setHovered] = useState(0)
  const [selected, setSelected] = useState(0)
  const [note, setNote] = useState('')
  const [extraReviews, setExtraReviews] = useState<ReviewDto[]>([])
  const [nextPage, setNextPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [reported, setReported] = useState<Set<number>>(new Set())

  const serverRating = data?.myReview?.rating ?? 0
  const serverNote = data?.myReview?.note ?? ''
  useEffect(() => {
    setSelected(serverRating)
    setNote(serverNote)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverRating, serverNote])

  useEffect(() => {
    setHasMore(data?.hasMore ?? false)
    setExtraReviews([])
    setNextPage(1)
  }, [data?.hasMore, tmdbId])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const result = await getReviews(tmdbId, nextPage)
      setExtraReviews((prev) => [...prev, ...result.reviews])
      setHasMore(result.hasMore)
      setNextPage((p) => p + 1)
    } finally {
      setLoadingMore(false)
    }
  }

  async function handleSubmit() {
    if (!selected) return
    await upsert({ rating: selected, note })
  }

  function handleLike(reviewId: number) {
    if (!user) return
    toggleLike(reviewId, {
      onSuccess: (result) => {
        setExtraReviews(prev =>
          prev.map(r => r.id === reviewId
            ? { ...r, isLikedByMe: result.liked, likeCount: result.likeCount }
            : r
          )
        )
      },
    })
  }

  function handleReport(reviewId: number) {
    if (!user || reported.has(reviewId)) return
    report(reviewId, {
      onSuccess: () => {
        setReported(prev => new Set(prev).add(reviewId))
        setExtraReviews(prev =>
          prev.map(r => r.id === reviewId
            ? { ...r, reportCount: r.reportCount + 1 }
            : r
          )
        )
      },
    })
  }

  const allReviews = [...(data?.reviews ?? []), ...extraReviews]

  return (
    <div className="space-y-6">
      {/* Community aggregate */}
      {!isLoading && (data?.totalReviews ?? 0) > 0 && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-cinema-navy border border-cinema-navy-border w-fit">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[10px] font-heading font-bold text-cinema-muted/60 uppercase tracking-wider">Community</span>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={15}
                  className={s <= Math.round(data!.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-cinema-muted/20'}
                />
              ))}
            </div>
          </div>
          <div className="w-px h-8 bg-cinema-navy-border" />
          <div>
            <span className="font-heading font-bold text-cinema-text text-xl leading-none">
              {data!.averageRating.toFixed(1)}
            </span>
            <span className="text-cinema-muted/50 text-xs font-body ml-0.5">/5</span>
            <p className="text-cinema-muted/60 text-xs font-body mt-0.5">
              {data!.totalReviews} {data!.totalReviews === 1 ? 'rating' : 'ratings'}
            </p>
          </div>
        </div>
      )}

      {/* Write / edit review */}
      {user ? (
        <div className="bg-cinema-navy border border-cinema-navy-border rounded-xl p-4 space-y-3">
          <p className="text-cinema-muted text-xs font-body font-semibold uppercase tracking-wider">
            {data?.myReview ? 'Your review' : 'Write a review'}
          </p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setSelected(s)}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <Star
                  size={24}
                  className={s <= (hovered || selected) ? 'text-yellow-400 fill-yellow-400' : 'text-cinema-muted/30'}
                />
              </button>
            ))}
            {selected > 0 && (
              <span className="ml-2 text-cinema-muted text-sm font-body">
                {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][selected]}
              </span>
            )}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note (optional)…"
            rows={2}
            className="w-full px-3 py-2 bg-cinema-surface border border-cinema-navy-border rounded-lg text-cinema-text font-body text-sm placeholder:text-cinema-muted/40 focus:outline-none focus:border-accent/60 resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={!selected || saving}
              className="px-4 py-2 rounded-lg accent-gradient text-white font-body text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {data?.myReview ? 'Update' : 'Submit'}
            </button>
            {data?.myReview && (
              <button
                onClick={() => remove()}
                disabled={deleting}
                className="p-2 rounded-lg text-cinema-muted hover:text-red-400 transition-colors"
                title="Delete review"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-cinema-muted text-sm font-body italic">Sign in to leave a review.</p>
      )}

      {/* Review list */}
      {allReviews.length > 0 && (
        <div className="space-y-3">
          {allReviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              isLoggedIn={!!user}
              isReported={reported.has(r.id)}
              isReporting={reporting && reportingId === r.id}
              onLike={() => handleLike(r.id)}
              onReport={() => handleReport(r.id)}
            />
          ))}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-2.5 rounded-lg border border-cinema-navy-border text-cinema-muted hover:text-cinema-text font-body text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loadingMore ? <><Loader2 size={14} className="animate-spin" /> Loading…</> : 'Load more reviews'}
            </button>
          )}
        </div>
      )}

      {!isLoading && (data?.totalReviews ?? 0) === 0 && (
        <p className="text-cinema-muted/50 text-sm font-body">No reviews yet. Be the first!</p>
      )}
    </div>
  )
}

function ReviewCard({
  review,
  isLoggedIn,
  isReported,
  isReporting,
  onLike,
  onReport,
}: {
  review: ReviewDto
  isLoggedIn: boolean
  isReported: boolean
  isReporting: boolean
  onLike: () => void
  onReport: () => void
}) {
  return (
    <div className={`rounded-xl border p-4 space-y-2.5 ${review.isOwn ? 'border-accent/30 bg-accent/5' : 'border-cinema-navy-border bg-cinema-navy'}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full accent-gradient flex items-center justify-center text-white text-xs font-heading font-bold">
            {review.userDisplayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-cinema-text font-body text-sm font-medium">
            {review.userDisplayName}
            {review.isOwn && <span className="ml-1.5 text-accent text-xs">(you)</span>}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} size={13} className={s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-cinema-muted/20'} />
          ))}
        </div>
      </div>

      {/* Review text */}
      {review.note && (
        <p className="text-cinema-muted text-sm font-body leading-relaxed">{review.note}</p>
      )}

      {/* Footer: date + actions */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-2">
          <p className="text-cinema-muted/40 text-xs font-body">
            {new Date(review.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          {review.updatedAt &&
            new Date(review.updatedAt).getTime() - new Date(review.createdAt).getTime() > 60_000 && (
            <span className="text-cinema-muted/40 text-xs font-body italic">(edited)</span>
          )}
        </div>

        {/* Like + Report — only for other people's reviews */}
        {!review.isOwn && (
          <div className="flex items-center gap-1">
            <button
              onClick={onLike}
              disabled={!isLoggedIn}
              title={isLoggedIn ? (review.isLikedByMe ? 'Unlike' : 'Like') : 'Sign in to like'}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-body transition-colors disabled:cursor-not-allowed ${
                review.isLikedByMe
                  ? 'text-accent bg-accent/10'
                  : 'text-cinema-muted/60 hover:text-cinema-text hover:bg-cinema-surface'
              }`}
            >
              <ThumbsUp size={12} className={review.isLikedByMe ? 'fill-accent' : ''} />
              {review.likeCount > 0 && <span>{review.likeCount}</span>}
            </button>

            {isLoggedIn && !isReported && (
              <button
                onClick={onReport}
                disabled={isReporting}
                title="Report as inappropriate"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-body text-cinema-muted/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                {isReporting ? <Loader2 size={12} className="animate-spin" /> : <Flag size={12} />}
              </button>
            )}

            {isReported && (
              <span className="px-2 py-1 text-xs font-body text-red-400/60 italic">Reported</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
