import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw, Star, ArrowRight, ArrowLeft, Globe } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMoodSuggestions } from '@/hooks/useMovies'
import type { MoodAnswers } from '@/types'

const PLACEHOLDER_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%230d1421'/%3E%3Crect x='115' y='190' width='70' height='70' rx='4' fill='none' stroke='%231d2c3e' stroke-width='2'/%3E%3Ccircle cx='135' cy='210' r='8' fill='%231d2c3e'/%3E%3Cpolygon points='115,260 142,234 163,248 185,228 185,260' fill='%231d2c3e'/%3E%3C/svg%3E"

const QUESTIONS = [
  {
    id: 'mood',
    question: "What's your vibe tonight?",
    cols: 3,
    options: [
      { value: 'feel-good and fun',     label: 'Feel-good',     emoji: '😊' },
      { value: 'emotional and moving',  label: 'Emotional',     emoji: '😢' },
      { value: 'thrilling and intense', label: 'Thrilling',     emoji: '😱' },
      { value: 'chill and easy',        label: 'Chill',         emoji: '😌' },
      { value: 'romantic',              label: 'Romantic',      emoji: '💕' },
      { value: 'thought-provoking',     label: 'Mind-bending',  emoji: '🤯' },
    ],
  },
  {
    id: 'audience',
    question: 'Who are you watching with?',
    cols: 2,
    options: [
      { value: 'just me',               label: 'Just me',    emoji: '🙋' },
      { value: 'partner or date night', label: 'Date night', emoji: '💑' },
      { value: 'family with kids',      label: 'Family',     emoji: '👨‍👩‍👧' },
      { value: 'friends',               label: 'Friends',    emoji: '👯' },
    ],
  },
  {
    id: 'language',
    question: 'What language?',
    cols: 3,
    options: [
      { value: 'English',            label: 'English',    emoji: '🇬🇧' },
      { value: 'Hindi or Bollywood', label: 'Hindi',      emoji: '🇮🇳' },
      { value: 'Malayalam',          label: 'Malayalam',  emoji: '🌴' },
      { value: 'Tamil',              label: 'Tamil',      emoji: '🏛️' },
      { value: 'Telugu',             label: 'Telugu',     emoji: '🌟' },
      { value: 'Kannada',            label: 'Kannada',    emoji: '🏔️' },
      { value: 'Bengali',            label: 'Bengali',    emoji: '🌸' },
      { value: 'Korean or Japanese', label: 'Korean/Japanese', emoji: '🎌' },
      { value: 'any language',       label: 'Anything',   emoji: '🌍' },
    ],
  },
  {
    id: 'era',
    question: 'Any era preference?',
    cols: 3,
    options: [
      { value: 'classic films before the year 2000', label: 'Classic (pre-2000)', emoji: '🎞️' },
      { value: 'films from 2000 to 2015',            label: '2000 – 2015',        emoji: '📼' },
      { value: 'recent films from 2016 to 2021',     label: '2016 – 2021',        emoji: '🎬' },
      { value: 'latest films from 2022 onwards',     label: '2022+',              emoji: '✨' },
      { value: 'any era',                            label: 'Any era',            emoji: '🌐' },
    ],
  },
  {
    id: 'length',
    question: 'How long do you want to watch?',
    cols: 3,
    options: [
      { value: 'under 90 minutes',  label: 'Under 90 min', emoji: '⚡' },
      { value: '90 to 120 minutes', label: '90 – 120 min', emoji: '🎬' },
      { value: 'no preference',     label: 'No limit',     emoji: '🍿' },
    ],
  },
]

export function DiscoverPage() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Partial<MoodAnswers>>({})
  const [direction, setDirection] = useState(1)

  const { mutate, data: suggestions, isPending, isError, reset } = useMoodSuggestions()
  const submitted = suggestions !== undefined || isPending || isError

  function pick(value: string) {
    const q = QUESTIONS[step]
    const updated = { ...answers, [q.id]: value }
    setAnswers(updated)

    if (step < QUESTIONS.length - 1) {
      setDirection(1)
      setStep((s) => s + 1)
    } else {
      mutate(updated as MoodAnswers)
    }
  }

  function back() {
    setDirection(-1)
    setStep((s) => s - 1)
  }

  function restart() {
    setStep(0)
    setAnswers({})
    setDirection(1)
    reset()
  }

  const q = QUESTIONS[step]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d0820] via-cinema-bg to-cinema-bg">
      <div className="max-w-3xl mx-auto px-4 pt-28 pb-20">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-body mb-4">
            <Sparkles size={12} /> AI-powered discovery
          </div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-white mb-2">
            Find Your Perfect Watch
          </h1>
          <p className="text-cinema-muted font-body text-sm">
            Answer {QUESTIONS.length} quick questions and Claude picks 5 movies just for you.
          </p>
        </div>

        {/* ── Questionnaire ── */}
        {!submitted && (
          <>
            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-8">
              {QUESTIONS.map((_, i) => (
                <div key={i} className={`rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 h-2 bg-purple-500'
                  : i < step  ? 'w-2 h-2 bg-purple-500/50'
                              : 'w-2 h-2 bg-cinema-navy-border'
                }`} />
              ))}
            </div>

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
              >
                <h2 className="font-heading font-semibold text-xl text-white text-center mb-6">
                  {q.question}
                </h2>

                <div className={`grid gap-3 grid-cols-${q.cols} sm:grid-cols-${q.cols}`}>
                  {q.options.map((opt) => {
                    const selected = answers[q.id as keyof MoodAnswers] === opt.value
                    return (
                      <button
                        key={opt.value}
                        onClick={() => pick(opt.value)}
                        className={`group flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 ${
                          selected
                            ? 'border-purple-500/60 bg-purple-500/15 shadow-lg shadow-purple-900/20'
                            : 'border-cinema-navy-border bg-cinema-card hover:border-purple-500/30 hover:bg-purple-500/5'
                        }`}
                      >
                        <span className="text-2xl group-hover:scale-110 transition-transform duration-200">
                          {opt.emoji}
                        </span>
                        <span className={`font-body text-xs font-medium text-center leading-tight ${
                          selected ? 'text-purple-300' : 'text-cinema-text'
                        }`}>
                          {opt.label}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {step > 0 && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={back}
                      className="flex items-center gap-1.5 text-sm text-cinema-muted hover:text-cinema-text font-body transition-colors"
                    >
                      <ArrowLeft size={14} /> Back
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}

        {/* ── Loading ── */}
        {isPending && (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-purple-500/20 animate-pulse" />
              <Sparkles size={24} className="absolute inset-0 m-auto text-purple-400 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <p className="text-cinema-muted font-body text-sm">Claude is thinking…</p>
            <p className="text-cinema-muted/40 font-body text-xs">Picking 5 movies just for you</p>
          </div>
        )}

        {/* ── Error ── */}
        {isError && (
          <div className="text-center py-16">
            <p className="text-cinema-muted font-body mb-4">Something went wrong. Try again?</p>
            <button onClick={restart} className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 font-body text-sm hover:bg-purple-500/30 transition-colors">
              <RefreshCw size={14} /> Start over
            </button>
          </div>
        )}

        {/* ── Results ── */}
        {suggestions && suggestions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

            {/* Answer chips */}
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {Object.values(answers).map((v) => (
                <span key={v} className="px-3 py-1 rounded-full text-xs font-body bg-purple-500/10 border border-purple-500/20 text-purple-300">
                  {v}
                </span>
              ))}
            </div>

            <h2 className="font-heading font-semibold text-white text-lg mb-5 text-center">
              Claude picked these for you ✨
            </h2>

            <div className="space-y-3">
              {suggestions.map((s, i) => {
                const inner = (
                  <div className={`group flex gap-4 p-4 rounded-2xl border transition-all duration-200 ${
                    s.tmdbFound
                      ? 'border-cinema-navy-border bg-cinema-card hover:border-purple-500/30 hover:bg-purple-500/5 cursor-pointer'
                      : 'border-cinema-navy-border/60 bg-cinema-card/60 cursor-default'
                  }`}>
                    {/* Rank */}
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 font-heading font-bold text-xs mt-0.5">
                      {i + 1}
                    </div>

                    {/* Poster */}
                    <div className="flex-shrink-0 w-14 rounded-lg overflow-hidden">
                      <img
                        src={s.movie.posterUrl ?? PLACEHOLDER_POSTER}
                        alt={s.movie.title}
                        className={`w-full aspect-poster object-cover ${s.tmdbFound ? 'group-hover:scale-105 transition-transform duration-300' : 'opacity-40'}`}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`font-heading font-semibold text-sm leading-snug ${
                          s.tmdbFound ? 'text-white group-hover:text-purple-200 transition-colors' : 'text-cinema-text/70'
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
                          <span className="text-cinema-muted/60 font-body text-xs">
                            {s.movie.releaseDate.slice(0, 4)}
                          </span>
                        )}
                        {s.movie.voteAverage && s.movie.voteAverage > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-body text-cinema-muted/60">
                            <Star size={10} fill="currentColor" className="text-yellow-500/70" />
                            {s.movie.voteAverage.toFixed(1)}
                          </span>
                        )}
                        {s.movieLanguage && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-body text-purple-400/70">
                            <Globe size={9} />
                            {s.movieLanguage}
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
                    key={`${s.movie.title}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                  >
                    {s.tmdbFound && s.movie.tmdbId
                      ? <Link to={`/movie/${s.movie.tmdbId}?type=${s.movie.mediaType}`}>{inner}</Link>
                      : inner
                    }
                  </motion.div>
                )
              })}
            </div>

            <div className="flex justify-center mt-8">
              <button
                onClick={restart}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-body text-sm transition-all"
              >
                <RefreshCw size={14} /> Try different answers
              </button>
            </div>
          </motion.div>
        )}

        {suggestions && suggestions.length === 0 && !isPending && (
          <div className="text-center py-16">
            <p className="text-cinema-muted font-body mb-4">No results — try different preferences.</p>
            <button onClick={restart} className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 font-body text-sm">
              <RefreshCw size={14} /> Start over
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
