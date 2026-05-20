import { useState, useCallback } from 'react'
import type { MovieSearchResult } from '@/types'

const KEY = 'ott_recently_viewed'
const MAX = 10

function readStorage(): MovieSearchResult[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<MovieSearchResult[]>(readStorage)

  const addItem = useCallback((movie: MovieSearchResult) => {
    setItems((prev) => {
      const deduped = prev.filter((m) => m.tmdbId !== movie.tmdbId)
      const next = [movie, ...deduped].slice(0, MAX)
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    localStorage.removeItem(KEY)
    setItems([])
  }, [])

  return { items, addItem, clearAll }
}
