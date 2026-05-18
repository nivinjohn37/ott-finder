import { motion } from 'framer-motion'
import type { MovieSearchResult } from '@/types'
import { MovieCard } from './MovieCard'

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

interface Props {
  movies: MovieSearchResult[]
  label?: string
}

export function MovieGrid({ movies, label }: Props) {
  return (
    <section>
      {label && (
        <h2 className="font-heading font-bold text-xl text-cinema-text mb-5">{label}</h2>
      )}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
      >
        {movies.map((movie, i) => (
          <motion.div key={movie.tmdbId} variants={itemVariants}>
            <MovieCard movie={movie} priority={i < 6} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
