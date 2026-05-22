import { useState, useEffect } from 'react'
import { Star, Trash2, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useReviews, useUpsertReview, useDeleteReview } from '@/hooks/useReviews'
import type { ReviewDto } from '@/types'

interface Props {
  tmdbId: number
}

export function ReviewSection({ tmdbId }: Props) {
  const { user } = useAuth()
  const { data, isLoading } = useReviews(tmdbId)
  const { mutateAsync: upsert, isPending: saving } = useUpsertReview(tmdbId)
  const { mutateAsync: remove, isPending: deleting } = useDeleteReview(tmdbId)

  const [hovered, setHovered] = useState(0)
  const [selected, setSelected] = useState(0)
  const [note, setNote] = useState('')

  // Sync form from server whenever myReview changes (initial load, after submit, after delete)
  // Using rating + note as deps means a background refetch with identical data causes no re-render
  const serverRating = data?.myReview?.rating ?? 0
  const serverNote = data?.myReview?.note ?? ''
  useEffect(() => {
    setSelected(serverRating)
    setNote(serverNote)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverRating, serverNote])

  async function handleSubmit() {
    if (!selected) return
    await upsert({ rating: selected, note })
  }

  async function handleDelete() {
    await remove()
  }

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

          {/* Star picker */}
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
                  className={
                    s <= (hovered || selected)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-cinema-muted/30'
                  }
                />
              </button>
            ))}
            {selected > 0 && (
              <span className="ml-2 text-cinema-muted text-sm font-body">
                {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][selected]}
              </span>
            )}
          </div>

          {/* Note */}
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
                onClick={handleDelete}
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
        <p className="text-cinema-muted text-sm font-body italic">
          Sign in to leave a review.
        </p>
      )}

      {/* Review list */}
      {(data?.reviews ?? []).length > 0 && (
        <div className="space-y-3">
          {data!.reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}

      {!isLoading && (data?.totalReviews ?? 0) === 0 && (
        <p className="text-cinema-muted/50 text-sm font-body">No reviews yet. Be the first!</p>
      )}
    </div>
  )
}

function ReviewCard({ review }: { review: ReviewDto }) {
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${review.isOwn ? 'border-accent/30 bg-accent/5' : 'border-cinema-navy-border bg-cinema-navy'}`}>
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
            <Star
              key={s}
              size={13}
              className={s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-cinema-muted/20'}
            />
          ))}
        </div>
      </div>
      {review.note && (
        <p className="text-cinema-muted text-sm font-body leading-relaxed">{review.note}</p>
      )}
      <p className="text-cinema-muted/40 text-xs font-body">
        {new Date(review.createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </div>
  )
}
