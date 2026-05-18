import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'

interface Props {
  defaultValue?: string
  autoFocus?: boolean
}

export function SearchBar({ defaultValue = '', autoFocus = false }: Props) {
  const [value, setValue] = useState(defaultValue)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    if (q.length >= 2) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="relative w-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Search
        size={20}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-cinema-muted pointer-events-none"
      />
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search movies and shows on Indian OTT…"
        className="w-full pl-12 pr-12 py-4 bg-cinema-navy border border-cinema-navy-border rounded-xl text-cinema-text font-body placeholder:text-cinema-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
      />
      {value && (
        <button
          type="button"
          onClick={() => { setValue(''); inputRef.current?.focus() }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-cinema-muted hover:text-cinema-text"
        >
          <X size={18} />
        </button>
      )}
    </motion.form>
  )
}
