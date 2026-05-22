import { motion, AnimatePresence } from 'framer-motion'
import { Navigate } from 'react-router-dom'
import { Users, Film, Bookmark, Tv2, Search, Check, AlertCircle, Loader2, ShieldCheck, Database, X, Star, Ban, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useCurrentUser, useAdminStats, useAdminPlatforms, useAdminUsers, useSeedAvailability, useToggleBlacklist } from '@/hooks/useUser'
import { searchMovies } from '@/api/movies'
import type { AdminUserDto, MovieSearchResult } from '@/types'

export function AdminPage() {
  const { user } = useAuth()
  const { data: me, isLoading: meLoading } = useCurrentUser()

  if (!user || (!meLoading && me?.role !== 'admin')) {
    return <Navigate to="/" replace />
  }

  if (meLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="text-accent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14 space-y-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck size={22} className="text-accent" />
          <h1 className="font-heading font-bold text-2xl text-cinema-text">Admin Dashboard</h1>
        </div>
        <p className="text-cinema-muted font-body text-sm ml-9">Logged in as {me?.email}</p>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
        <SectionHeading icon={<Database size={16} />} title="Platform Stats" />
        <StatsGrid />
      </motion.div>

      {/* OTT Seeding */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
        <SectionHeading icon={<Tv2 size={16} />} title="Seed OTT Availability" />
        <p className="text-cinema-muted/60 text-xs font-body mb-4">
          Manually add platform availability for movies JustWatch misses (e.g. Indian regional films).
        </p>
        <SeedForm />
      </motion.div>
    </div>
  )
}

function SectionHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-5 rounded-full bg-accent" />
      <span className="text-cinema-muted">{icon}</span>
      <h2 className="font-heading font-semibold text-cinema-text text-base">{title}</h2>
    </div>
  )
}

function StatsGrid() {
  const { data: stats, isLoading } = useAdminStats()
  const [showUsers, setShowUsers] = useState(false)

  const cards = [
    { icon: <Users size={18} />, label: 'Total Users', value: stats?.totalUsers, clickable: true, onClick: () => setShowUsers(true) },
    { icon: <Bookmark size={18} />, label: 'Watchlist Entries', value: stats?.totalWatchlistEntries, clickable: false },
    { icon: <Film size={18} />, label: 'Movies in DB', value: stats?.totalMoviesInDb, clickable: false },
    { icon: <Tv2 size={18} />, label: 'OTT Platforms', value: stats?.totalPlatforms, clickable: false },
  ]

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map(({ icon, label, value, clickable, onClick }) => (
          <div
            key={label}
            onClick={onClick}
            className={`bg-cinema-navy rounded-xl border border-cinema-navy-border p-4 space-y-2 ${clickable ? 'cursor-pointer hover:border-accent/40 hover:bg-cinema-navy-hover transition-colors' : ''}`}
          >
            <div className="text-cinema-muted">{icon}</div>
            <div className="font-heading font-bold text-2xl text-cinema-text">
              {isLoading ? '—' : value?.toLocaleString() ?? '—'}
            </div>
            <div className="text-cinema-muted/60 text-xs font-body">
              {label}{clickable && <span className="ml-1 text-accent/50">↗</span>}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showUsers && <UserListModal onClose={() => setShowUsers(false)} />}
      </AnimatePresence>
    </>
  )
}

function UserListModal({ onClose }: { onClose: () => void }) {
  const { data: users = [], isLoading } = useAdminUsers()

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-cinema-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-3xl bg-cinema-navy border border-cinema-navy-border rounded-2xl overflow-hidden shadow-2xl"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-cinema-navy-border">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-accent" />
            <h2 className="font-heading font-semibold text-cinema-text">All Users</h2>
            <span className="text-cinema-muted/50 text-sm font-body">({users.length})</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-cinema-muted hover:text-cinema-text transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="text-accent animate-spin" /></div>
          ) : users.length === 0 ? (
            <p className="text-cinema-muted text-sm font-body text-center py-12">No users yet.</p>
          ) : (
            <table className="w-full text-sm font-body">
              <thead className="sticky top-0 bg-cinema-navy border-b border-cinema-navy-border">
                <tr>
                  {['User', 'Role', 'Joined', 'Watchlist', 'Reviews', 'Actions'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-cinema-muted/60 text-xs font-semibold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cinema-navy-border">
                {users.map((u) => <UserRow key={u.id} user={u} />)}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function UserRow({ user }: { user: AdminUserDto }) {
  const { mutate: toggleBlacklist, isPending } = useToggleBlacklist()

  return (
    <tr className={`hover:bg-cinema-surface/40 transition-colors ${user.blacklisted ? 'opacity-60' : ''}`}>
      <td className="px-6 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-heading font-bold shrink-0 ${user.blacklisted ? 'bg-red-500/50' : 'accent-gradient'}`}>
            {(user.displayName ?? user.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-cinema-text font-medium truncate">{user.displayName ?? '—'}</p>
            <p className="text-cinema-muted/60 text-xs truncate">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
          user.role === 'admin' ? 'bg-accent/15 text-accent' : 'bg-cinema-surface text-cinema-muted'
        }`}>
          {user.role === 'admin' && <Star size={10} className="fill-accent" />}
          {user.role}
        </span>
      </td>
      <td className="px-6 py-3 text-cinema-muted text-xs">
        {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
      </td>
      <td className="px-6 py-3 text-cinema-text font-medium">{user.watchlistCount}</td>
      <td className="px-6 py-3 text-cinema-text font-medium">{user.reviewCount}</td>
      <td className="px-6 py-3">
        {user.role !== 'admin' && (
          <button
            onClick={() => toggleBlacklist(user.id)}
            disabled={isPending}
            title={user.blacklisted ? 'Reinstate user' : 'Blacklist user'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-body font-medium transition-colors disabled:opacity-40 ${
              user.blacklisted
                ? 'bg-green-400/15 text-green-400 hover:bg-green-400/25'
                : 'bg-red-400/15 text-red-400 hover:bg-red-400/25'
            }`}
          >
            {isPending ? (
              <Loader2 size={12} className="animate-spin" />
            ) : user.blacklisted ? (
              <><RotateCcw size={12} /> Reinstate</>
            ) : (
              <><Ban size={12} /> Blacklist</>
            )}
          </button>
        )}
      </td>
    </tr>
  )
}

function SeedForm() {
  const { data: platforms = [] } = useAdminPlatforms()
  const { mutateAsync: seed, isPending } = useSeedAvailability()

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<MovieSearchResult[]>([])
  const [selected, setSelected] = useState<MovieSearchResult | null>(null)
  const [platform, setPlatform] = useState('')
  const [deepLink, setDeepLink] = useState('')
  const [availableUntil, setAvailableUntil] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSearch() {
    if (query.trim().length < 2) return
    setSearching(true)
    setResults([])
    setSelected(null)
    try {
      const res = await searchMovies(query.trim())
      setResults(res.slice(0, 8))
    } finally {
      setSearching(false)
    }
  }

  async function handleSeed() {
    if (!selected || !platform) return
    setSuccessMsg(null)
    setErrorMsg(null)
    try {
      const msg = await seed({
        tmdbId: selected.tmdbId,
        mediaType: selected.mediaType,
        platformName: platform,
        deepLink: deepLink || undefined,
        availableUntil: availableUntil || undefined,
      })
      setSuccessMsg(msg)
      setSelected(null)
      setQuery('')
      setResults([])
      setDeepLink('')
      setAvailableUntil('')
      setPlatform('')
    } catch {
      setErrorMsg('Seeding failed. Check the console for details.')
    }
  }

  return (
    <div className="bg-cinema-navy border border-cinema-navy-border rounded-xl p-5 space-y-5">
      {/* Step 1 — Search movie */}
      <div>
        <label className="block text-cinema-muted text-xs font-body font-semibold uppercase tracking-wider mb-2">
          1. Search for a movie or show
        </label>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. Kantara, Ponniyin Selvan…"
            className="flex-1 px-3 py-2.5 bg-cinema-surface border border-cinema-navy-border rounded-lg text-cinema-text font-body text-sm placeholder:text-cinema-muted/50 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20"
          />
          <button
            onClick={handleSearch}
            disabled={searching || query.trim().length < 2}
            className="px-4 py-2.5 rounded-lg accent-gradient text-white font-body text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Search
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && !selected && (
          <div className="mt-2 rounded-lg border border-cinema-navy-border overflow-hidden divide-y divide-cinema-navy-border">
            {results.map((r) => (
              <button
                key={`${r.tmdbId}-${r.mediaType}`}
                onClick={() => { setSelected(r); setResults([]) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-cinema-navy-hover transition-colors text-left"
              >
                <div className="w-8 h-12 rounded overflow-hidden bg-cinema-surface shrink-0">
                  {r.posterUrl
                    ? <img src={r.posterUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-cinema-muted/30"><Film size={14} /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-cinema-text font-body text-sm font-medium truncate">{r.title}</p>
                  <p className="text-cinema-muted/60 text-xs font-body">
                    {r.releaseDate?.slice(0, 4) ?? '—'} · {r.mediaType === 'tv' ? 'TV Show' : 'Movie'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected movie chip */}
        {selected && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
            <Check size={14} className="text-accent shrink-0" />
            <span className="text-accent font-body text-sm font-medium flex-1 truncate">{selected.title}</span>
            <span className="text-accent/60 text-xs font-body">{selected.mediaType === 'tv' ? 'TV' : 'Movie'} · {selected.releaseDate?.slice(0, 4)}</span>
            <button onClick={() => setSelected(null)} className="text-cinema-muted hover:text-cinema-text ml-1 text-xs font-body">change</button>
          </div>
        )}
      </div>

      {/* Step 2 — Platform + details */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-cinema-muted text-xs font-body font-semibold uppercase tracking-wider mb-2">
            2. Platform
          </label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full px-3 py-2.5 bg-cinema-surface border border-cinema-navy-border rounded-lg text-cinema-text font-body text-sm focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20"
          >
            <option value="">Select platform…</option>
            {platforms.map((p) => (
              <option key={p.name} value={p.name}>{p.displayName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-cinema-muted text-xs font-body font-semibold uppercase tracking-wider mb-2">
            3. Deep link <span className="text-cinema-muted/40 normal-case">(optional)</span>
          </label>
          <input
            value={deepLink}
            onChange={(e) => setDeepLink(e.target.value)}
            placeholder="https://www.netflix.com/…"
            className="w-full px-3 py-2.5 bg-cinema-surface border border-cinema-navy-border rounded-lg text-cinema-text font-body text-sm placeholder:text-cinema-muted/50 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20"
          />
        </div>

        <div>
          <label className="block text-cinema-muted text-xs font-body font-semibold uppercase tracking-wider mb-2">
            4. Available until <span className="text-cinema-muted/40 normal-case">(optional)</span>
          </label>
          <input
            type="date"
            value={availableUntil}
            onChange={(e) => setAvailableUntil(e.target.value)}
            className="w-full px-3 py-2.5 bg-cinema-surface border border-cinema-navy-border rounded-lg text-cinema-text font-body text-sm focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={handleSeed}
          disabled={!selected || !platform || isPending}
          className="px-5 py-2.5 rounded-lg accent-gradient text-white font-body font-semibold text-sm disabled:opacity-50 flex items-center gap-2 transition-all hover:shadow-accent-glow"
        >
          {isPending ? <><Loader2 size={15} className="animate-spin" /> Seeding…</> : 'Seed Availability'}
        </button>

        {successMsg && (
          <div className="flex items-center gap-2 text-green-400 text-sm font-body">
            <Check size={14} /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2 text-red-400 text-sm font-body">
            <AlertCircle size={14} /> {errorMsg}
          </div>
        )}
      </div>
    </div>
  )
}
