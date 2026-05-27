import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  Search, Tv2, Bookmark, Star, Users, Trophy, Lightbulb,
  User, Award, Palette, TrendingUp, Zap, ArrowRight, Play,
  CheckCircle2, Heart, Globe, Smartphone, Share2, MoreHorizontal,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

/* ─── Animation helpers ─────────────────────────────────────────────────────── */
function FadeUp({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function FadeIn({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ─── Feature data ───────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Search,
    title: 'Instant Discovery',
    description: 'Search any movie or show and get results in milliseconds — powered by TMDB\'s entire catalogue.',
    color: '#38BDF8',
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.2)',
  },
  {
    icon: Tv2,
    title: 'Where to Watch',
    description: 'See exactly which Indian OTT platform has each title right now — Netflix, Prime, JioHotstar, SonyLIV and more.',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.2)',
  },
  {
    icon: Bookmark,
    title: 'Personal Watchlist',
    description: 'Save titles to your watchlist, mark them as watched, and keep track of your movie journey.',
    color: '#F04E28',
    bg: 'rgba(240,78,40,0.08)',
    border: 'rgba(240,78,40,0.2)',
  },
  {
    icon: Star,
    title: 'Reviews & Ratings',
    description: 'Rate movies out of 5 and leave reviews. See community scores alongside your own take.',
    color: '#FBBF24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.2)',
  },
  {
    icon: Users,
    title: 'Watch Groups',
    description: 'Create a group with friends or family. Build a shared watchlist and see who\'s keeping up.',
    color: '#10B981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
  },
  {
    icon: Trophy,
    title: 'Leaderboards',
    description: 'Compete with your group on who watches the most. Rankings update in real time.',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
  },
  {
    icon: Lightbulb,
    title: 'Group Suggestions',
    description: 'Propose movies for the group, upvote your favourites, and let the best idea win.',
    color: '#EC4899',
    bg: 'rgba(236,72,153,0.08)',
    border: 'rgba(236,72,153,0.2)',
  },
  {
    icon: User,
    title: 'Actor Filmography',
    description: 'Tap any actor in the cast to instantly explore their full filmography without leaving the app.',
    color: '#14B8A6',
    bg: 'rgba(20,184,166,0.08)',
    border: 'rgba(20,184,166,0.2)',
  },
  {
    icon: Award,
    title: 'Badges',
    description: 'Earn badges as you build your movie habit — First Review, Movie Marathon, Watchlist Collector.',
    color: '#A78BFA',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.2)',
  },
  {
    icon: TrendingUp,
    title: 'Trending Daily',
    description: 'See what the world is watching today. Updated every 24 hours from global viewing data.',
    color: '#FB7185',
    bg: 'rgba(251,113,133,0.08)',
    border: 'rgba(251,113,133,0.2)',
  },
  {
    icon: Palette,
    title: 'Dark & Light Theme',
    description: 'Looks great in any light. Your preference is saved across sessions — no flash on load.',
    color: '#94A3B8',
    bg: 'rgba(148,163,184,0.08)',
    border: 'rgba(148,163,184,0.2)',
  },
  {
    icon: Globe,
    title: 'Share Anywhere',
    description: 'Share any movie page with friends via native share sheet or clipboard — one tap.',
    color: '#34D399',
    bg: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.2)',
  },
  {
    icon: Smartphone,
    title: 'Install as App',
    description: 'Add WatchMate to your home screen on iOS or Android. Works offline, launches instantly — no App Store needed.',
    color: '#F04E28',
    bg: 'rgba(240,78,40,0.08)',
    border: 'rgba(240,78,40,0.2)',
  },
]

const STEPS = [
  {
    number: '01',
    title: 'Search & Discover',
    description: 'Type any movie or show name. Get instant results with ratings, overview, and exactly where to stream it in India.',
    icon: Search,
    color: '#38BDF8',
  },
  {
    number: '02',
    title: 'Save & Track',
    description: 'Add titles to your watchlist. Mark them as watched as you go. Earn badges along the way.',
    icon: CheckCircle2,
    color: '#10B981',
  },
  {
    number: '03',
    title: 'Watch Together',
    description: 'Create a group with friends, build a shared list, vote on what to watch next, and see who watches the most on the leaderboard.',
    icon: Users,
    color: '#F04E28',
  },
]

const STATS = [
  { value: '7+', label: 'OTT Platforms' },
  { value: '1M+', label: 'Movies & Shows' },
  { value: 'Real-time', label: 'Availability Data' },
  { value: 'Free', label: 'Forever' },
]

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export function FeaturesPage() {
  const { user, signInWithGoogle } = useAuth()

  return (
    <div className="overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center justify-center text-center px-4 pt-24 pb-20 overflow-hidden">
        {/* Background glows */}
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full bg-[#38BDF8]/5 blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] rounded-full bg-[#8B5CF6]/5 blur-[100px] pointer-events-none" />

        {/* Floating orbs */}
        <motion.div
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-32 left-[10%] w-3 h-3 rounded-full bg-accent/40 blur-[1px]"
        />
        <motion.div
          animate={{ y: [8, -8, 8] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute top-48 right-[12%] w-2 h-2 rounded-full bg-[#38BDF8]/50"
        />
        <motion.div
          animate={{ y: [-6, 12, -6] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-40 left-[15%] w-4 h-4 rounded-full bg-[#8B5CF6]/30 blur-[2px]"
        />

        <div className="relative max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-body font-semibold mb-8"
          >
            <Zap size={11} fill="currentColor" />
            Your complete movie companion
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-heading font-bold text-5xl sm:text-6xl lg:text-7xl text-cinema-text leading-[1.08] mb-6"
          >
            Discover. Track.{' '}
            <span className="text-gradient">Watch Together.</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-cinema-muted text-lg sm:text-xl font-body leading-relaxed max-w-2xl mx-auto mb-10"
          >
            WatchMate tells you where to stream any movie in India, helps you track
            what you've watched, and lets you compete with friends on who watches the most.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              to="/"
              className="flex items-center gap-2 px-6 py-3 rounded-xl accent-gradient text-white font-body font-semibold text-sm hover:shadow-accent-glow transition-all"
            >
              <Play size={15} fill="currentColor" /> Start Exploring
            </Link>
            {!user && (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-6 py-3 rounded-xl glass border border-cinema-navy-border text-cinema-text font-body font-semibold text-sm hover:border-accent/40 transition-all"
              >
                Sign in Free <ArrowRight size={15} />
              </button>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────────── */}
      <FadeIn>
        <section className="border-y border-cinema-navy-border bg-cinema-navy/40">
          <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-heading font-bold text-2xl sm:text-3xl text-cinema-text mb-1">
                  {s.value}
                </p>
                <p className="text-cinema-muted/60 text-xs font-body uppercase tracking-wider">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-24">
        <FadeUp className="text-center mb-16">
          <p className="text-accent text-xs font-body font-semibold uppercase tracking-widest mb-3">
            How it works
          </p>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-cinema-text">
            Three steps to movie bliss
          </h2>
        </FadeUp>

        <div className="grid sm:grid-cols-3 gap-6 relative">
          {/* Connecting line on desktop */}
          <div className="hidden sm:block absolute top-10 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-cinema-navy-border to-transparent" />

          {STEPS.map((step, i) => (
            <FadeUp key={step.number} delay={i * 0.12}>
              <div className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-cinema-navy border border-cinema-navy-border hover:border-opacity-60 transition-all group"
                style={{ '--hover-color': step.color } as React.CSSProperties}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 duration-300"
                  style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}
                >
                  <step.icon size={26} style={{ color: step.color }} />
                </div>
                <span
                  className="absolute top-4 right-4 font-heading font-bold text-3xl opacity-10"
                  style={{ color: step.color }}
                >
                  {step.number}
                </span>
                <h3 className="font-heading font-bold text-cinema-text text-base mb-2">
                  {step.title}
                </h3>
                <p className="text-cinema-muted/70 text-sm font-body leading-relaxed">
                  {step.description}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── Features grid ───────────────────────────────────────────────────── */}
      <section className="bg-cinema-navy/30 border-y border-cinema-navy-border">
        <div className="max-w-6xl mx-auto px-4 py-24">
          <FadeUp className="text-center mb-16">
            <p className="text-accent text-xs font-body font-semibold uppercase tracking-widest mb-3">
              Everything included
            </p>
            <h2 className="font-heading font-bold text-3xl sm:text-4xl text-cinema-text mb-4">
              Packed with features
            </h2>
            <p className="text-cinema-muted/60 font-body text-base max-w-xl mx-auto">
              From solo movie discovery to group watch parties — everything you need in one app.
            </p>
          </FadeUp>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <FadeUp key={f.title} delay={Math.min(i * 0.06, 0.4)}>
                <div
                  className="rounded-2xl p-5 border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group cursor-default"
                  style={{ background: f.bg, borderColor: f.border }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300"
                    style={{ background: `${f.color}20`, border: `1px solid ${f.color}30` }}
                  >
                    <f.icon size={18} style={{ color: f.color }} />
                  </div>
                  <h3 className="font-heading font-bold text-cinema-text text-sm mb-1.5">
                    {f.title}
                  </h3>
                  <p className="text-cinema-muted/60 text-xs font-body leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── Groups spotlight ────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-24">
        <div className="rounded-3xl overflow-hidden border border-[#10B981]/20 bg-gradient-to-br from-[#10B981]/5 via-cinema-navy to-[#8B5CF6]/5 p-8 sm:p-12">
          <div className="grid sm:grid-cols-2 gap-10 items-center">
            <FadeUp>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs font-body font-semibold mb-5">
                  <Users size={11} /> Social Feature
                </div>
                <h2 className="font-heading font-bold text-3xl sm:text-4xl text-cinema-text leading-tight mb-4">
                  Watch together,<br />
                  <span style={{ color: '#10B981' }}>compete together</span>
                </h2>
                <p className="text-cinema-muted/70 font-body text-sm leading-relaxed mb-6">
                  Create a group with your friends or family. Add movies to a shared watchlist,
                  see who's keeping up, and let the leaderboard settle the debate of who's
                  the biggest movie buff.
                </p>
                <ul className="space-y-3 mb-8">
                  {[
                    'Shared watchlist everyone can add to',
                    'Per-member watched progress tracking',
                    'Live leaderboard with rankings',
                    'Suggest & vote on what to watch next',
                    'Join via a simple 6-character invite code',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm font-body text-cinema-muted">
                      <CheckCircle2 size={14} className="text-[#10B981] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/groups"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-body font-semibold text-sm text-white transition-all hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
                >
                  <Users size={15} /> Start a Group <ArrowRight size={14} />
                </Link>
              </div>
            </FadeUp>

            {/* Visual mockup */}
            <FadeUp delay={0.15}>
              <div className="space-y-3">
                {/* Leaderboard card mockup */}
                <div className="rounded-2xl bg-cinema-navy border border-cinema-navy-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy size={14} className="text-yellow-400" />
                    <span className="font-heading font-semibold text-cinema-text text-xs">Leaderboard</span>
                  </div>
                  {[
                    { name: 'You', pct: 87, rank: '🥇', color: '#FBBF24' },
                    { name: 'Rahul', pct: 62, rank: '🥈', color: '#94A3B8' },
                    { name: 'Priya', pct: 50, rank: '🥉', color: '#CD7C2F' },
                  ].map((m) => (
                    <div key={m.name} className="flex items-center gap-3 py-1.5">
                      <span className="text-base w-6">{m.rank}</span>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-cinema-text text-xs font-body font-medium">{m.name}</span>
                          <span className="text-xs font-body font-bold" style={{ color: m.color }}>{m.pct}%</span>
                        </div>
                        <div className="h-1 bg-cinema-surface rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${m.pct}%`, background: m.color }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Suggestion card mockup */}
                <div className="rounded-2xl bg-cinema-navy border border-cinema-navy-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb size={14} className="text-[#EC4899]" />
                    <span className="font-heading font-semibold text-cinema-text text-xs">Group Suggestions</span>
                  </div>
                  {[
                    { title: 'Interstellar', votes: '+8', color: '#10B981' },
                    { title: 'Oppenheimer', votes: '+5', color: '#10B981' },
                    { title: 'The Dark Knight', votes: '+3', color: '#10B981' },
                  ].map((s) => (
                    <div key={s.title} className="flex items-center justify-between py-1.5">
                      <span className="text-cinema-text text-xs font-body">{s.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-body font-bold" style={{ color: s.color }}>{s.votes}</span>
                        <div className="flex gap-1">
                          <div className="w-5 h-5 rounded-md bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center">
                            <Heart size={8} className="text-[#10B981]" fill="currentColor" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── OTT platforms strip ──────────────────────────────────────────────── */}
      <FadeIn>
        <section className="border-y border-cinema-navy-border bg-cinema-navy/20 py-10 px-4 overflow-hidden">
          <p className="text-center text-cinema-muted/40 text-xs font-body uppercase tracking-widest mb-6">
            Tracks availability across all major Indian OTT platforms
          </p>
          <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
            {[
              { name: 'Netflix', color: '#E50914' },
              { name: 'Prime Video', color: '#00A8E0' },
              { name: 'JioHotstar', color: '#1F80E0' },
              { name: 'JioCinema', color: '#8B4CF7' },
              { name: 'SonyLIV', color: '#C40A0A' },
              { name: 'ZEE5', color: '#7B2FBE' },
              { name: 'MX Player', color: '#00D4FF' },
            ].map((p) => (
              <div
                key={p.name}
                className="px-4 py-2 rounded-full border font-body font-semibold text-xs"
                style={{
                  borderColor: `${p.color}40`,
                  background: `${p.color}10`,
                  color: p.color,
                }}
              >
                {p.name}
              </div>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* ── Install as App ──────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-24">
        <FadeUp className="text-center mb-14">
          <p className="text-accent text-xs font-body font-semibold uppercase tracking-widest mb-3">
            Progressive Web App
          </p>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-cinema-text mb-4">
            Add to your home screen
          </h2>
          <p className="text-cinema-muted/60 font-body text-base max-w-xl mx-auto">
            Install WatchMate like a native app — no App Store, no downloads.
            Works on any phone, launches instantly, looks great fullscreen.
          </p>
        </FadeUp>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* iOS */}
          <FadeUp delay={0.05}>
            <div className="rounded-2xl border border-cinema-navy-border bg-cinema-navy p-6 h-full">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#007AFF]/15 border border-[#007AFF]/30 flex items-center justify-center shrink-0">
                  <Smartphone size={18} className="text-[#007AFF]" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-cinema-text text-sm">iPhone / iPad</h3>
                  <p className="text-cinema-muted/50 text-xs font-body">Safari browser</p>
                </div>
              </div>
              <ol className="space-y-4">
                {[
                  {
                    icon: Share2,
                    step: 'Open in Safari',
                    detail: 'Visit watchmateapp.vercel.app in Safari (not Chrome — iOS only supports PWA install from Safari).',
                  },
                  {
                    icon: Share2,
                    step: 'Tap the Share button',
                    detail: 'Tap the Share icon (box with arrow pointing up) at the bottom of your screen.',
                  },
                  {
                    icon: () => (
                      <div className="w-3.5 h-3.5 rounded border border-current flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-current" />
                      </div>
                    ),
                    step: 'Add to Home Screen',
                    detail: 'Scroll down in the share sheet and tap "Add to Home Screen". Give it a name and tap Add.',
                  },
                  {
                    icon: Smartphone,
                    step: 'Done!',
                    detail: 'WatchMate appears on your home screen and opens fullscreen, just like a native app.',
                  },
                ].map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-6 h-6 rounded-full bg-[#007AFF]/15 border border-[#007AFF]/30 flex items-center justify-center text-[#007AFF] font-heading font-bold text-xs shrink-0">
                        {i + 1}
                      </div>
                      {i < 3 && <div className="w-px flex-1 bg-cinema-navy-border mt-1" />}
                    </div>
                    <div className="pb-1">
                      <p className="font-body font-semibold text-cinema-text text-sm">{item.step}</p>
                      <p className="text-cinema-muted/60 text-xs font-body mt-0.5 leading-relaxed">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </FadeUp>

          {/* Android */}
          <FadeUp delay={0.1}>
            <div className="rounded-2xl border border-cinema-navy-border bg-cinema-navy p-6 h-full">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-[#34A853]/15 border border-[#34A853]/30 flex items-center justify-center shrink-0">
                  <Smartphone size={18} className="text-[#34A853]" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-cinema-text text-sm">Android</h3>
                  <p className="text-cinema-muted/50 text-xs font-body">Chrome browser</p>
                </div>
              </div>
              <ol className="space-y-4">
                {[
                  {
                    step: 'Open in Chrome',
                    detail: 'Visit watchmateapp.vercel.app in Chrome on your Android device.',
                  },
                  {
                    step: 'Look for the install banner',
                    detail: 'Chrome may automatically show an "Add to Home Screen" or "Install app" banner at the bottom. Tap it.',
                  },
                  {
                    step: 'Or use the menu',
                    detail: 'If no banner appears, tap the ⋮ menu (top right) → "Add to Home Screen" or "Install app".',
                  },
                  {
                    step: 'Done!',
                    detail: 'WatchMate installs like a native app with its own icon, splash screen, and fullscreen experience.',
                  },
                ].map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-6 h-6 rounded-full bg-[#34A853]/15 border border-[#34A853]/30 flex items-center justify-center text-[#34A853] font-heading font-bold text-xs shrink-0">
                        {i + 1}
                      </div>
                      {i < 3 && <div className="w-px flex-1 bg-cinema-navy-border mt-1" />}
                    </div>
                    <div className="pb-1">
                      <p className="font-body font-semibold text-cinema-text text-sm">{item.step}</p>
                      <p className="text-cinema-muted/60 text-xs font-body mt-0.5 leading-relaxed">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {/* Android tip */}
              <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-[#34A853]/08 border border-[#34A853]/20">
                <MoreHorizontal size={13} className="text-[#34A853] mt-0.5 shrink-0" />
                <p className="text-[#34A853]/80 text-xs font-body leading-relaxed">
                  <strong>Tip:</strong> On some Android versions, the menu option says "Install app" instead of "Add to Home Screen" — both do the same thing.
                </p>
              </div>
            </div>
          </FadeUp>
        </div>

        {/* PWA benefits strip */}
        <FadeUp delay={0.15} className="mt-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: '⚡', label: 'Instant launch', sub: 'No loading screen' },
              { icon: '📱', label: 'Fullscreen', sub: 'No browser UI' },
              { icon: '🔔', label: 'Offline support', sub: 'App shell cached' },
              { icon: '🏠', label: 'Home screen icon', sub: 'Feels native' },
            ].map((b) => (
              <div key={b.label} className="rounded-xl bg-cinema-navy border border-cinema-navy-border p-3 text-center">
                <div className="text-xl mb-1">{b.icon}</div>
                <p className="font-body font-semibold text-cinema-text text-xs">{b.label}</p>
                <p className="text-cinema-muted/50 text-2xs font-body mt-0.5">{b.sub}</p>
              </div>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 py-24 text-center">
        <FadeUp>
          <div className="relative rounded-3xl border border-cinema-navy-border bg-gradient-to-br from-cinema-navy via-cinema-navy to-accent/5 p-10 sm:p-16 overflow-hidden">
            {/* Glow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-accent/10 blur-[80px] pointer-events-none" />

            <div className="relative">
              <div className="text-4xl mb-5">🎬</div>
              <h2 className="font-heading font-bold text-3xl sm:text-4xl text-cinema-text mb-4">
                Ready to start watching smarter?
              </h2>
              <p className="text-cinema-muted/70 font-body text-base mb-8 max-w-xl mx-auto">
                Join WatchMate — it's free, no credit card required, and takes 10 seconds to sign up.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  to="/"
                  className="flex items-center gap-2 px-7 py-3.5 rounded-xl accent-gradient text-white font-body font-semibold hover:shadow-accent-glow transition-all"
                >
                  <Play size={15} fill="currentColor" /> Explore Movies
                </Link>
                {!user && (
                  <button
                    onClick={signInWithGoogle}
                    className="flex items-center gap-2 px-7 py-3.5 rounded-xl glass border border-cinema-navy-border text-cinema-text font-body font-semibold hover:border-accent/40 transition-all"
                  >
                    Sign in with Google <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

    </div>
  )
}
