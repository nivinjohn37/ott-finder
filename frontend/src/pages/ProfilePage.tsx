import { motion } from 'framer-motion'
import { Navigate } from 'react-router-dom'
import { User, Film, Tv, Eye, Bookmark, Calendar, Camera, Loader2, Pencil, Check, X, Star, Heart } from 'lucide-react'
import type { ReactNode } from 'react'
import { useRef, useState } from 'react'
import { updateProfile } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import api from '@/api/axios'
import type { ApiResponse } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useUserStats, useUserPreferences, useSavePreferences } from '@/hooks/useUser'

const MAX_SIZE_MB = 2

const GENRE_OPTIONS = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Family', 'Fantasy', 'History',
  'Horror', 'Music', 'Mystery', 'Romance', 'Science Fiction',
  'Thriller', 'War', 'Western',
]

const PLATFORM_OPTIONS = [
  { name: 'netflix', label: 'Netflix' },
  { name: 'primevideo', label: 'Prime Video' },
  { name: 'hotstar', label: 'Disney+ Hotstar' },
  { name: 'jiocinema', label: 'JioCinema' },
  { name: 'sonyliv', label: 'SonyLIV' },
  { name: 'zee5', label: 'ZEE5' },
  { name: 'mxplayer', label: 'MX Player' },
]

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { data: watchlist, isLoading } = useWatchlist()
  const { data: stats } = useUserStats()
  const { data: preferences } = useUserPreferences()
  const { mutateAsync: savePreferences, isPending: savingPrefs } = useSavePreferences()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(() =>
    new Set(preferences?.genres ?? [])
  )
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(() =>
    new Set(preferences?.platforms ?? [])
  )
  const [prefsSaved, setPrefsSaved] = useState(false)

  // Sync local state when preferences load
  const prefsLoaded = preferences !== undefined
  const [synced, setSynced] = useState(false)
  if (prefsLoaded && !synced) {
    setSelectedGenres(new Set(preferences.genres))
    setSelectedPlatforms(new Set(preferences.platforms))
    setSynced(true)
  }

  function toggleGenre(g: string) {
    setSelectedGenres((prev) => {
      const next = new Set(prev)
      next.has(g) ? next.delete(g) : next.add(g)
      return next
    })
  }

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }

  async function handleSavePreferences() {
    await savePreferences({
      genres: Array.from(selectedGenres),
      platforms: Array.from(selectedPlatforms),
    })
    setPrefsSaved(true)
    setTimeout(() => setPrefsSaved(false), 2000)
  }

  function startEditName() {
    setNameValue(user?.displayName ?? '')
    setNameError(null)
    setEditingName(true)
  }

  function cancelEditName() {
    setEditingName(false)
    setNameError(null)
  }

  async function saveDisplayName() {
    if (!auth.currentUser) return
    const trimmed = nameValue.trim()
    if (!trimmed) { setNameError('Name cannot be empty.'); return }
    if (trimmed === user?.displayName) { setEditingName(false); return }

    setSavingName(true)
    setNameError(null)
    try {
      await updateProfile(auth.currentUser, { displayName: trimmed })
      refreshUser()
      setEditingName(false)
    } catch {
      setNameError('Failed to save. Please try again.')
    } finally {
      setSavingName(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !auth.currentUser) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file.')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setUploadError(`Image must be under ${MAX_SIZE_MB}MB.`)
      return
    }

    setUploadError(null)
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await api.post<ApiResponse<string>>('/user/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''
      const downloadURL = apiBase + res.data.data!
      await updateProfile(auth.currentUser, { photoURL: downloadURL })
      refreshUser()
    } catch {
      setUploadError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (!user) return <Navigate to="/" replace />

  const joinedDate = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  const total = watchlist?.length ?? 0
  const watched = watchlist?.filter((i) => !!i.watchedAt).length ?? 0
  const unwatched = total - watched
  const movies = watchlist?.filter((i) => i.movie.mediaType === 'movie').length ?? 0
  const tvShows = total - movies
  const pct = total > 0 ? Math.round((watched / total) * 100) : 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
      {/* Avatar + name */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 text-center mb-10"
      >
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="relative group focus:outline-none"
          aria-label="Change profile photo"
        >
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName ?? 'User'}
              className="w-24 h-24 rounded-full ring-4 ring-accent/30 shadow-accent-glow object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full accent-gradient flex items-center justify-center shadow-accent-glow">
              <User size={40} className="text-white" />
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">
            {uploading
              ? <Loader2 size={22} className="text-white animate-spin" />
              : <Camera size={22} className="text-white" />
            }
          </div>
        </button>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

        {uploadError && <p className="text-red-400 text-xs font-body mt-1">{uploadError}</p>}

        <div>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveDisplayName(); if (e.key === 'Escape') cancelEditName() }}
                maxLength={50}
                className="bg-cinema-navy border border-accent/50 rounded-lg px-3 py-1.5 text-cinema-text font-heading font-bold text-xl text-center focus:outline-none focus:ring-2 focus:ring-accent/30 w-48"
              />
              <button onClick={saveDisplayName} disabled={savingName} className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors">
                {savingName ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              </button>
              <button onClick={cancelEditName} className="p-1.5 rounded-lg text-cinema-muted hover:text-red-400 hover:bg-red-400/10 transition-colors">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h1 className="font-heading font-bold text-2xl text-cinema-text">
                {user.displayName ?? 'Movie Fan'}
              </h1>
              <button
                onClick={startEditName}
                className="p-1 rounded-md text-cinema-muted/40 hover:text-cinema-muted transition-colors"
                aria-label="Edit display name"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
          {nameError && <p className="text-red-400 text-xs font-body mt-1">{nameError}</p>}
          <p className="text-cinema-muted font-body text-sm mt-0.5">{user.email}</p>
          {joinedDate && (
            <div className="flex items-center justify-center gap-1.5 mt-2 text-cinema-muted/50 text-xs font-body">
              <Calendar size={11} />
              <span>Member since {joinedDate}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4"
      >
        <StatCard icon={<Bookmark size={18} />} label="In Watchlist" value={total} loading={isLoading} />
        <StatCard icon={<Eye size={18} />} label="Watched" value={watched} loading={isLoading} green />
        <StatCard icon={<Film size={18} />} label="Movies" value={movies} loading={isLoading} />
        <StatCard icon={<Tv size={18} />} label="TV Shows" value={tvShows} loading={isLoading} />
        {stats?.favouriteGenre ? (
          <div className="col-span-2 bg-cinema-navy rounded-xl border border-cinema-navy-border p-4 flex items-center gap-3">
            <Heart size={18} className="text-accent shrink-0" />
            <div>
              <div className="text-cinema-muted/60 text-xs font-body mb-0.5">Favourite Genre</div>
              <div className="font-heading font-bold text-cinema-text text-lg leading-tight">{stats.favouriteGenre}</div>
            </div>
          </div>
        ) : (
          <div className="col-span-2 bg-cinema-navy rounded-xl border border-cinema-navy-border p-4 flex items-center gap-3">
            <Star size={18} className="text-cinema-muted/40 shrink-0" />
            <div className="text-cinema-muted/50 text-xs font-body">Watch more movies to see your favourite genre</div>
          </div>
        )}
      </motion.div>

      {/* Progress bar */}
      {(total > 0 || isLoading) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-cinema-navy rounded-xl border border-cinema-navy-border p-5 mb-8"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-heading font-semibold text-cinema-text text-sm">Watchlist Progress</span>
            <span className="text-cinema-muted text-xs font-body">{watched}/{total} watched</span>
          </div>
          <div className="h-2 rounded-full bg-cinema-navy-border overflow-hidden">
            <motion.div
              className="h-full rounded-full accent-gradient"
              initial={{ width: 0 }}
              animate={{ width: isLoading ? '0%' : `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.35 }}
            />
          </div>
          <p className="text-cinema-muted/50 text-xs font-body mt-2">
            {isLoading ? 'Loading…' : unwatched === 0 && total > 0 ? 'All caught up!' : `${unwatched} still to watch`}
          </p>
        </motion.div>
      )}

      {/* Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="space-y-6"
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-accent" />
            <h2 className="font-heading font-semibold text-cinema-text text-base">My Preferences</h2>
          </div>
          <p className="text-cinema-muted/60 text-xs font-body ml-3 mb-5">
            Used to personalise recommendations and the "For You" shelf.
          </p>

          {/* Genre picker */}
          <div className="mb-5">
            <p className="text-cinema-muted text-xs font-body font-semibold uppercase tracking-wider mb-3">Favourite Genres</p>
            <div className="flex flex-wrap gap-2">
              {GENRE_OPTIONS.map((g) => {
                const active = selectedGenres.has(g)
                return (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-all ${
                      active
                        ? 'accent-gradient text-white shadow-accent-glow'
                        : 'bg-cinema-navy border border-cinema-navy-border text-cinema-muted hover:border-accent/40 hover:text-cinema-text'
                    }`}
                  >
                    {g}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Platform picker */}
          <div className="mb-6">
            <p className="text-cinema-muted text-xs font-body font-semibold uppercase tracking-wider mb-3">Preferred Platforms</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => {
                const active = selectedPlatforms.has(p.name)
                return (
                  <button
                    key={p.name}
                    onClick={() => togglePlatform(p.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-all ${
                      active
                        ? 'accent-gradient text-white shadow-accent-glow'
                        : 'bg-cinema-navy border border-cinema-navy-border text-cinema-muted hover:border-accent/40 hover:text-cinema-text'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={handleSavePreferences}
            disabled={savingPrefs}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg accent-gradient text-white font-body font-semibold text-sm hover:shadow-accent-glow disabled:opacity-60 transition-all"
          >
            {savingPrefs ? (
              <><Loader2 size={15} className="animate-spin" /> Saving…</>
            ) : prefsSaved ? (
              <><Check size={15} /> Saved!</>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function StatCard({
  icon, label, value, loading, green,
}: {
  icon: ReactNode; label: string; value: number; loading: boolean; green?: boolean
}) {
  return (
    <div className="bg-cinema-navy rounded-xl border border-cinema-navy-border p-4 flex flex-col gap-2">
      <div className={green ? 'text-green-400' : 'text-cinema-muted'}>{icon}</div>
      <div className={`font-heading font-bold text-2xl ${green ? 'text-green-400' : 'text-cinema-text'}`}>
        {loading ? '—' : value}
      </div>
      <div className="text-cinema-muted/60 text-xs font-body">{label}</div>
    </div>
  )
}
